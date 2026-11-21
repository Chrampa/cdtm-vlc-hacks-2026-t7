"""ElevenLabs voice client: request shape and cost guards (mocked HTTP, no real calls)."""

from __future__ import annotations

import json

import httpx
import pytest

from matcher.voice import MAX_SPEECH_CHARS, VoiceClient, VoiceError


def _client(handler, key: str | None = "test-key", per_minute: int = 20) -> VoiceClient:
    return VoiceClient(key, transport=httpx.MockTransport(handler), per_minute=per_minute)


async def test_transcribe_sends_key_model_and_audio():
    seen: dict = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["url"] = str(req.url)
        seen["key"] = req.headers.get("xi-api-key")
        seen["body"] = req.read()
        return httpx.Response(200, json={"text": "  Necesito un  ingeniero de datos ", "language_code": "spa"})

    out = await _client(handler).transcribe(b"\x1a" * 4000, "audio/webm;codecs=opus")
    assert out == {"text": "Necesito un ingeniero de datos", "language": "spa"}
    assert seen["url"] == "https://api.elevenlabs.io/v1/speech-to-text"
    assert seen["key"] == "test-key"
    assert b'name="model_id"' in seen["body"] and b"scribe_v3" in seen["body"]
    assert b'filename="brief.webm"' in seen["body"]


async def test_speak_uses_voice_and_caches_repeats():
    calls: list[dict] = []

    def handler(req: httpx.Request) -> httpx.Response:
        calls.append({"url": str(req.url), "body": json.loads(req.read())})
        return httpx.Response(200, content=b"ID3fake-mp3", headers={"content-type": "audio/mpeg"})

    vc = _client(handler)
    assert await vc.speak("Strong team.  The team: Ana.") == b"ID3fake-mp3"
    assert await vc.speak("Strong team. The team: Ana.") == b"ID3fake-mp3"  # same text after whitespace cleanup
    assert len(calls) == 1, "a repeated read-out must not spend credits again"
    assert calls[0]["url"].startswith("https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb")
    assert calls[0]["body"] == {"text": "Strong team. The team: Ana.", "model_id": "eleven_flash_v2_5",
                                "voice_settings": {"speed": 1.15}}


async def test_guards_without_calling_elevenlabs():
    def handler(req: httpx.Request) -> httpx.Response:  # pragma: no cover - must never be reached
        raise AssertionError("ElevenLabs should not be called")

    with pytest.raises(VoiceError) as e:
        await _client(handler, key=None).speak("hello")
    assert e.value.status == 503
    with pytest.raises(VoiceError) as e:
        await _client(handler).speak("x" * (MAX_SPEECH_CHARS + 1))
    assert e.value.status == 400
    with pytest.raises(VoiceError) as e:
        await _client(handler).transcribe(b"tiny", "audio/webm")
    assert e.value.status == 400


async def test_rate_limit_and_friendly_errors():
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"detail": {"status": "quota_exceeded"}})

    vc = _client(handler, per_minute=1)
    with pytest.raises(VoiceError) as e:
        await vc.speak("first")
    assert "credits" in str(e.value)
    with pytest.raises(VoiceError) as e:
        await vc.speak("second")
    assert e.value.status == 429
