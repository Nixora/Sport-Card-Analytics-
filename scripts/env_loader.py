"""
Shared .env loading for repo scripts under `scripts/`.

Loads **two** files when present (does not stop after the first):
  1. `<repo>/.env` (repo root — primary for local config)
  2. `<repo>/server/.env` (defaults / deploy-specific)

Rules:
  - Keys already in `os.environ` (e.g. exported in the shell) are never changed.
  - Otherwise, root `.env` is applied first, then `server/.env`, so for the same key
    **root wins** over server.
"""

from __future__ import annotations

import os
import sys


def repo_root_from_script(script_file: str) -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(script_file)))


def load_repo_dotenv(*, script_file: str) -> str | None:
    """Apply root `.env` then `server/.env`. Returns comma-separated paths loaded, or None."""
    base = repo_root_from_script(script_file)
    paths = (
        os.path.join(base, ".env"),
        os.path.join(base, "server", ".env"),
    )
    loaded: list[str] = []
    for path in paths:
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, value = line.split("=", 1)
                    key = key.strip().lstrip("\ufeff")
                    value = value.strip().strip("\r\n")
                    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                        value = value[1:-1]
                    if key and key not in os.environ:
                        os.environ[key] = value
        except OSError as e:
            print(f"Warning: could not load env file {path}: {e}", file=sys.stderr)
        loaded.append(path)
    return ", ".join(loaded) if loaded else None
