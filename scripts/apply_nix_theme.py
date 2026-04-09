#!/usr/bin/env python3
"""
Map client/src/index.css hex colors to nearest var(--nix-*) from theme.css,
and slightly lighten dark rgba() overlays for a brighter UI.
Run from repo root: python scripts/apply_nix_theme.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "client" / "src" / "theme.css"
INDEX = ROOT / "client" / "src" / "index.css"


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def rgb_dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return sum((x - y) ** 2 for x, y in zip(a, b))


def load_theme_tokens(theme_text: str) -> list[tuple[str, tuple[int, int, int]]]:
    tokens: list[tuple[str, tuple[int, int, int]]] = []
    for line in theme_text.splitlines():
        m = re.match(
            r"^\s*(--nix-[a-z0-9-]+)\s*:\s*#([0-9a-fA-F]{6})\s*;",
            line.strip(),
        )
        if m:
            tokens.append((m.group(1), hex_to_rgb("#" + m.group(2))))
    return tokens


def nearest_var(
    tokens: list[tuple[str, tuple[int, int, int]]], rgb: tuple[int, int, int]
) -> str:
    best_n, best_d = tokens[0][0], rgb_dist(tokens[0][1], rgb)
    for n, r in tokens[1:]:
        d = rgb_dist(r, rgb)
        if d < best_d:
            best_d, best_n = d, n
    return best_n


def lighten_channel(c: float, p: float) -> int:
    return max(0, min(255, int(c + (255 - c) * p)))


def lighten_rgba_match(m: re.Match) -> str:
    inner = m.group(1)
    parts = [x.strip() for x in inner.split(",")]
    if len(parts) != 4:
        return m.group(0)
    try:
        r, g, b = float(parts[0]), float(parts[1]), float(parts[2])
        a = float(parts[3])
    except ValueError:
        return m.group(0)
    avg = (r + g + b) / 3
    if avg > 210:
        return m.group(0)
    p = 0.1 if avg < 85 else 0.07
    r = lighten_channel(r, p)
    g = lighten_channel(g, p)
    b = lighten_channel(b, p)
    return f"rgba({r}, {g}, {b}, {a})"


def main() -> None:
    theme_text = THEME.read_text(encoding="utf-8")
    tokens = load_theme_tokens(theme_text)
    if len(tokens) < 10:
        raise SystemExit(f"Too few tokens parsed from {THEME} ({len(tokens)})")

    css = INDEX.read_text(encoding="utf-8")

    def repl_hex(m: re.Match) -> str:
        raw = m.group(0)
        low = raw.lower()
        if low in ("#ffffff", "#fff"):
            return "var(--nix-white)"
        if low in ("#000000", "#000"):
            return "var(--nix-black)"
        rgb = hex_to_rgb(raw)
        return f"var({nearest_var(tokens, rgb)})"

    css = re.sub(r"#[0-9a-fA-F]{6}\b", repl_hex, css)
    css = re.sub(r"#[0-9a-fA-F]{3}\b", repl_hex, css)
    css = re.sub(r"rgba\(([^)]+)\)", lighten_rgba_match, css)

    INDEX.write_text(css, encoding="utf-8", newline="\n")
    print(f"Updated {INDEX} using {len(tokens)} hex tokens from theme.css")


if __name__ == "__main__":
    main()
