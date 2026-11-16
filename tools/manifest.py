#!/usr/bin/env python3
"""Writes src/manifest.json: for each place, the game files it needs, in the order they must load.

Worked out from the code itself (tools/deps.js: which file uses which other file's top-level names). The core (every
file outside js/games/, plus the clubhouse) is always loaded and isn't listed. A file the core uses, or a game file no
place needs, is an error. A use guarded by `typeof X !== 'undefined'` still counts as needing the file, except from
the core, where the names in OPTIONAL are allowed (they are test hooks).

Usage: python3 tools/manifest.py            write it
       python3 tools/manifest.py --check    fail if the one on disk is out of date
"""
import json
import re
import subprocess
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
OPTIONAL = {"APLUS"}


def is_core(f):
    return "/games/" not in f or "/games/clubhouse/" in f


def build():
    r = subprocess.run(["node", str(TOOLS / "deps.js")], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr or "tools/deps.js failed (cd tools && npm install?)")
    deps = json.loads(r.stdout)
    order = list(deps)
    problems = []
    for f, uses in deps.items():
        if is_core(f):
            for h, names in uses.items():
                bad = [n for n in names if n not in OPTIONAL]
                if not is_core(h) and bad:
                    problems.append(f"{f} (always loaded) uses {', '.join(bad)} from {h}, which is only loaded with its place")
    # which file makes which place
    meta = (ROOT / "src/js/core/shared.js").read_text()
    start = meta.index("const LEVEL_META")
    ids = re.findall(r"^    \{ id: '([a-z0-9]+)',", meta[start:meta.index("\n  ];", start)], re.M)
    maker = {}
    for f in order:
        if is_core(f):
            continue
        src = (ROOT / "src" / f).read_text()
        for m in re.finditer(r"newLevel\((\d+)\)|makeQuest\(\{[^}]*?\bidx: (\d+)", src, re.S):
            maker[int(m.group(1) or m.group(2))] = f

    def closure(f, seen):
        for h in deps[f]:
            if not is_core(h) and h not in seen:
                seen.add(h)
                closure(h, seen)
        return seen

    places, used = {}, set()
    for i, pid in enumerate(ids):
        f = maker.get(i)
        if f is None:
            if (ROOT / "src/js/games/clubhouse/hub.js").exists() and pid == "hub":
                continue
            problems.append(f"no file found that makes place {i} ({pid})")
            continue
        need = closure(f, {f})
        # files that add to this place from outside (the driving range adds to mini golf): anything whose only place is this one
        places[pid] = need
    # a game file that makes no place itself belongs with every place whose file it uses or that uses it
    for f in order:
        if is_core(f) or f in maker.values():
            continue
        targets = [h for h in deps[f] if h in maker.values()]
        users = [pid for pid, need in places.items() if f in need]
        if not users and targets:
            for pid, need in places.items():
                if any(t in need and maker[ids.index(pid)] == t for t in targets):
                    need.add(f)
                    need |= closure(f, set())
    for pid, need in places.items():
        used |= need
        places[pid] = [f for f in order if f in need]
    for f in order:
        if not is_core(f) and f not in used:
            problems.append(f"{f} isn't needed by any place")
    return {"core": [f for f in order if is_core(f)], "places": places}, problems


def main():
    man, problems = build()
    if problems:
        sys.exit("\n".join(problems))
    text = json.dumps(man, indent=1) + "\n"
    path = ROOT / "src" / "manifest.json"
    if "--check" in sys.argv:
        if not path.exists() or path.read_text() != text:
            sys.exit("src/manifest.json is out of date: run python3 tools/manifest.py")
        print(f"manifest is up to date ({len(man['places'])} places)")
        return
    path.write_text(text)
    multi = {k: [x.split('/')[-1] for x in v] for k, v in man["places"].items() if len(v) > 1}
    print(f"wrote src/manifest.json: {len(man['core'])} core files, {len(man['places'])} places; with more than one file:")
    for k, v in multi.items():
        print(f"  {k}: {' '.join(v)}")


if __name__ == "__main__":
    main()
