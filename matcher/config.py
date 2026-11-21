"""Runtime configuration from environment variables (optionally a local .env file).

Secrets never live in code: the API key comes from LLM_API_KEY or from a file named by
LLM_API_KEY_FILE, and is only ever used server-side.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(ROOT / ".env")


def _key() -> str | None:
    if os.environ.get("LLM_API_KEY"):
        return os.environ["LLM_API_KEY"].strip()
    key_file = os.environ.get("LLM_API_KEY_FILE")
    if key_file:
        p = Path(key_file).expanduser()
        if p.is_file():
            return p.read_text().strip() or None
    return None


@dataclass(frozen=True)
class Settings:
    data_path: Path
    web_dist: Path
    llm_base_url: str
    llm_api_key: str | None
    model_interpret: str
    model_explain: str
    model_team: str
    llm_concurrency: int


def load_settings() -> Settings:
    default_model = os.environ.get("LLM_MODEL", "deepseek/deepseek-v4.1-flash")
    return Settings(
        data_path=Path(os.environ.get("DATA_PATH", ROOT / "data" / "profiles.parquet")),
        web_dist=Path(os.environ.get("WEB_DIST", ROOT / "web" / "dist")),
        llm_base_url=os.environ.get("LLM_BASE_URL", "https://api.ironlane.ai/v1").rstrip("/"),
        llm_api_key=_key(),
        model_interpret=os.environ.get("MODEL_INTERPRET", default_model),
        model_explain=os.environ.get("MODEL_EXPLAIN", default_model),
        model_team=os.environ.get("MODEL_TEAM", default_model),
        llm_concurrency=int(os.environ.get("LLM_CONCURRENCY", "8")),
    )
