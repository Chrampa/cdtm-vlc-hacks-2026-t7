"""Minimal async client for any OpenAI-compatible chat-completions endpoint.

Used with Ironlane by default, but the base URL and the model for each task are
configurable, so the team can swap providers/models without touching code.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

import httpx

log = logging.getLogger(__name__)


class LLMError(RuntimeError):
    pass


class LLMClient:
    def __init__(self, base_url: str, api_key: str | None, concurrency: int = 8):
        self.base_url = base_url
        self.api_key = api_key
        self._sem = asyncio.Semaphore(concurrency)
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            headers={"User-Agent": "talent-matcher/1.0", "Content-Type": "application/json"},
        )
        self._schema_unsupported: set[str] = set()

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    async def close(self) -> None:
        await self._client.aclose()

    async def json(
        self,
        model: str,
        system: str,
        user: str,
        schema: dict[str, Any],
        schema_name: str,
        max_tokens: int = 4000,
        timeout: float = 45.0,
        temperature: float | None = 0.0,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Returns (parsed JSON object, meta). Raises LLMError on failure."""
        if not self.api_key:
            raise LLMError("No LLM API key configured")
        use_schema = model not in self._schema_unsupported
        body: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_tokens": max_tokens,
        }
        if temperature is not None:
            body["temperature"] = temperature
        if use_schema:
            body["response_format"] = {
                "type": "json_schema",
                "json_schema": {"name": schema_name, "strict": True, "schema": schema},
            }
        else:
            body["response_format"] = {"type": "json_object"}

        last_err: Exception | None = None
        for attempt in range(3):
            t0 = time.perf_counter()
            try:
                async with self._sem:
                    r = await self._client.post(
                        f"{self.base_url}/chat/completions",
                        content=json.dumps(body),
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        timeout=timeout,
                    )
                if r.status_code == 400 and use_schema and "response_format" in r.text:
                    self._schema_unsupported.add(model)
                    body["response_format"] = {"type": "json_object"}
                    use_schema = False
                    continue
                if r.status_code in (408, 409, 429) or r.status_code >= 500:
                    raise LLMError(f"HTTP {r.status_code}")
                if r.status_code != 200:
                    raise LLMError(f"HTTP {r.status_code}: {r.text[:200]}")
                data = r.json()
                choice = data["choices"][0]
                content = choice["message"].get("content") or ""
                parsed = _parse_json(content)
                meta = {
                    "model": data.get("model", model),
                    "seconds": round(time.perf_counter() - t0, 2),
                    "usage": data.get("usage", {}),
                    "finish_reason": choice.get("finish_reason"),
                }
                return parsed, meta
            except (httpx.HTTPError, LLMError, ValueError, KeyError) as e:
                last_err = e
                log.warning("LLM call failed (attempt %d, %s): %s", attempt + 1, model, e)
                if isinstance(e, LLMError) and str(e).startswith("HTTP 4") and not str(e).startswith(("HTTP 408", "HTTP 409", "HTTP 429")):
                    break
                await asyncio.sleep(0.6 * (attempt + 1))
        raise LLMError(str(last_err))


def _parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("Model did not return JSON")
        obj = json.loads(text[start : end + 1])
    if not isinstance(obj, dict):
        raise ValueError("Model returned JSON that is not an object")
    return obj
