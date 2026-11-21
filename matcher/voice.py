"""ElevenLabs voice: speech-to-text for spoken briefs, text-to-speech for team briefings.

The API key stays server-side (same rule as the LLM key). The browser sends recorded
audio or short text to our API, and this module forwards it to ElevenLabs.

Guards, because the app can be reachable from the internet and every call spends credits:
- a size cap on audio and a length cap on text,
- a sliding-window rate limit per endpoint,
- an in-memory cache for repeated speech (same text and voice = no new charge).
"""

from __future__ import annotations

import hashlib
import logging
import time
from collections import OrderedDict, deque
from typing import Any

import httpx

log = logging.getLogger(__name__)

MAX_AUDIO_BYTES = 8 * 1024 * 1024  # ~4-8 minutes of browser opus; a brief takes under a minute
MAX_SPEECH_CHARS = 1500  # ~90 seconds of speech


class VoiceError(RuntimeError):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


class RateLimit:
    """At most `limit` calls per `window` seconds, shared by all visitors."""

    def __init__(self, limit: int, window: float = 60.0):
        self.limit = limit
        self.window = window
        self.calls: deque[float] = deque()

    def hit(self) -> bool:
        now = time.monotonic()
        while self.calls and now - self.calls[0] > self.window:
            self.calls.popleft()
        if len(self.calls) >= self.limit:
            return False
        self.calls.append(now)
        return True


class VoiceClient:
    def __init__(
        self,
        api_key: str | None,
        base_url: str = "https://api.elevenlabs.io",
        stt_model: str = "scribe_v3",
        tts_model: str = "eleven_flash_v2_5",
        voice_id: str = "JBFqnCBsd6RMkjVDRZzb",
        speed: float = 1.15,
        per_minute: int = 20,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.stt_model = stt_model
        self.tts_model = tts_model
        self.voice_id = voice_id
        self.speed = min(1.2, max(0.7, speed))  # ElevenLabs accepts 0.7-1.2
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(45.0, connect=10.0),
            limits=httpx.Limits(keepalive_expiry=120),  # reuse the TLS connection between clicks
            headers={"User-Agent": "talent-matcher/1.0"},
            transport=transport,
        )
        self._stt_limit = RateLimit(per_minute)
        self._tts_limit = RateLimit(per_minute)
        self._speech_cache: OrderedDict[str, bytes] = OrderedDict()

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    async def close(self) -> None:
        await self._client.aclose()

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise VoiceError("Voice is not configured", 503)
        return {"xi-api-key": self.api_key}

    async def transcribe(self, audio: bytes, content_type: str) -> dict[str, Any]:
        """Recorded audio -> {"text", "language"}. Language is detected automatically."""
        headers = self._headers()
        if len(audio) < 1000:
            raise VoiceError("The recording is too short. Hold the mic a bit longer.", 400)
        if len(audio) > MAX_AUDIO_BYTES:
            raise VoiceError("The recording is too long. Keep it under a few minutes.", 413)
        if not self._stt_limit.hit():
            raise VoiceError("Too many recordings right now. Try again in a minute.", 429)
        ctype = (content_type or "application/octet-stream").split(";")[0].strip()
        ext = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "mp4", "audio/mpeg": "mp3",
               "audio/wav": "wav", "audio/x-wav": "wav", "audio/aac": "aac"}.get(ctype, "webm")
        t0 = time.perf_counter()
        try:
            r = await self._client.post(
                f"{self.base_url}/v1/speech-to-text",
                headers=headers,
                data={"model_id": self.stt_model, "tag_audio_events": "false"},
                files={"file": (f"brief.{ext}", audio, ctype)},
            )
        except httpx.HTTPError as e:
            log.warning("ElevenLabs STT unreachable: %s", e)
            raise VoiceError("The voice service did not answer.") from e
        if r.status_code != 200:
            log.warning("ElevenLabs STT HTTP %s: %s", r.status_code, r.text[:300])
            raise VoiceError(_friendly(r.status_code, r.text))
        data = r.json()
        text = " ".join((data.get("text") or "").split())
        log.info("STT %s: %d chars, lang=%s, %.2fs", self.stt_model, len(text),
                 data.get("language_code"), time.perf_counter() - t0)
        return {"text": text, "language": data.get("language_code")}

    async def speak(self, text: str) -> bytes:
        """Short text -> MP3 bytes in the configured voice."""
        headers = self._headers()
        text = " ".join((text or "").split())
        if not text:
            raise VoiceError("Nothing to read out.", 400)
        if len(text) > MAX_SPEECH_CHARS:
            raise VoiceError(f"Text is too long to read out (max {MAX_SPEECH_CHARS} characters).", 400)
        key = hashlib.sha256(f"{self.voice_id}|{self.tts_model}|{self.speed}|{text}".encode()).hexdigest()
        hit = self._speech_cache.get(key)
        if hit is not None:
            self._speech_cache.move_to_end(key)
            return hit
        if not self._tts_limit.hit():
            raise VoiceError("Too many read-outs right now. Try again in a minute.", 429)
        t0 = time.perf_counter()
        try:
            r = await self._client.post(
                f"{self.base_url}/v1/text-to-speech/{self.voice_id}",
                params={"output_format": "mp3_44100_128"},
                headers={**headers, "Content-Type": "application/json", "Accept": "audio/mpeg"},
                json={"text": text, "model_id": self.tts_model, "voice_settings": {"speed": self.speed}},
            )
        except httpx.HTTPError as e:
            log.warning("ElevenLabs TTS unreachable: %s", e)
            raise VoiceError("The voice service did not answer.") from e
        if r.status_code != 200 or not r.content:
            log.warning("ElevenLabs TTS HTTP %s: %s", r.status_code, r.text[:300])
            raise VoiceError(_friendly(r.status_code, r.text))
        log.info("TTS %s: %d chars -> %d bytes, %.2fs", self.tts_model, len(text), len(r.content),
                 time.perf_counter() - t0)
        self._speech_cache[key] = r.content
        while len(self._speech_cache) > 64:
            self._speech_cache.popitem(last=False)
        return r.content


def _friendly(status: int, body: str = "") -> str:
    if "quota" in body.lower():
        return "The ElevenLabs account is out of credits."
    if status in (401, 403):
        return "The voice service rejected our key. Check the ElevenLabs API key."
    if status == 429:
        return "The voice service is busy or out of credits. Try again shortly."
    if status == 422:
        return "The voice service could not use this audio."
    return "The voice service did not answer."
