#!/usr/bin/env python3
"""Parse an ESPN 'Draft Recap' page (saved to PDF) into structured picks.

The recap renders two rounds side by side, so each text line can hold two picks.
We locate the column split from the 'Round N ... Round N+1' header lines.

Usage: python3 parse_recap.py recap2025.txt 2025
"""
import re, sys, json, os

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site")

# "  1       Ja'Marr Chase Cin, WR      We're Just Girls"
PICK = re.compile(
    r"^\s*(\d{1,2})\s+"                 # pick number in round
    r"(.+?)\s+"                         # player name
    r"([A-Za-z]{2,4}),\s*"              # NFL team abbrev
    r"(QB|RB|WR|TE|K|PK|D/ST|DST)\s{2,}"# position
    r"(\S.*?)\s*$"                      # fantasy team
)
# D/ST rows look like "  16   Broncos D/ST  Den   Team Name" on some pages
PICK_DST = re.compile(r"^\s*(\d{1,2})\s+(.+?D/ST)\s+([A-Za-z]{2,4})\s{2,}(\S.*?)\s*$")


# A pick anywhere on a line. Player names use single spaces, so 2+ spaces bound the field.
CELL = re.compile(
    r"(?:^|\s{2,})(\d{1,2})\s{2,}"
    r"([A-Za-z0-9][A-Za-z0-9.'’\-/]*(?: [A-Za-z0-9][A-Za-z0-9.'’\-/]*){0,3}?)\s+"
    r"([A-Za-z]{2,4}),\s*"
    r"(QB|RB|WR|TE|K|PK|D/ST|DST)(?=\s|$)"
)


def parse(path):
    """Rounds render two-up and repeat across page breaks at differing widths, so we
    match every pick cell on a line positionally: 1st cell -> left round, 2nd -> right."""
    lines = open(path, errors="ignore").read().split("\n")
    picks, seen = [], set()
    cur = []

    for ln in lines:
        rounds = [int(m.group(1)) for m in re.finditer(r"\bRound (\d{1,2})\b", ln)]
        if rounds:
            cur = rounds
            continue
        if not cur or re.search(r"\bNO\.", ln):
            continue
        for i, m in enumerate(CELL.finditer(ln)):
            if i >= len(cur):
                break
            no, player, nfl, pos = m.groups()
            rnd, no = cur[i], int(no)
            if not (1 <= no <= 20) or (rnd, no) in seen:
                continue
            seen.add((rnd, no))
            picks.append({"round": rnd, "pickInRound": no, "player": player.strip(),
                          "pos": "K" if pos == "PK" else ("D/ST" if pos == "DST" else pos),
                          "nfl": nfl})
    return picks


def merge(year, picks):
    """ESPN's JSON is authoritative for team/overall/playerId; the recap only supplies
    the player identity. Join on (round, pickInRound)."""
    dpath = os.path.join(SITE, "data", "draft%d.json" % year)
    existing = json.load(open(dpath)) if os.path.exists(dpath) else []
    recap = {(p["round"], p["pickInRound"]): p for p in picks}
    out, missing = [], []
    for e in existing:
        k = (e["round"], e.get("pickInRound"))
        r = recap.get(k)
        rec = dict(e)
        if r:
            rec["player"], rec["pos"], rec["nfl"] = r["player"], r["pos"], r["nfl"]
        elif str(rec.get("player", "")).startswith("ESPN player #"):
            missing.append(k)
        out.append(rec)
    out.sort(key=lambda x: x.get("overall") or 0)
    return out, missing


if __name__ == "__main__":
    txt, year = sys.argv[1], int(sys.argv[2])
    picks = parse(txt)
    rounds = sorted({p["round"] for p in picks})
    teams = []
    print("parsed %d picks | rounds %s " % (len(picks), (rounds[0], rounds[-1]) if rounds else "-"))
    # every round must be complete and contiguous, or the column assignment slipped
    bad = []
    for r in rounds:
        nos = sorted(p["pickInRound"] for p in picks if p["round"] == r)
        if nos != list(range(1, len(nos) + 1)) or len(nos) != 10:
            bad.append((r, nos))
    if bad:
        print("  !! INCOMPLETE ROUNDS -> %s" % bad)
    else:
        print("  all rounds complete (10 picks each)")
    merged, missing = merge(year, picks)

    print("picks still without a name: %d %s" % (len(missing), missing[:8]))
    json.dump(merged, open(os.path.join(SITE, "data", "draft%d.json" % year), "w"), indent=1)

    # grow the id -> name map for reuse
    pj = os.path.join(SITE, "data", "players.json")
    pm = json.load(open(pj)) if os.path.exists(pj) else {}
    added = 0
    for p in merged:
        if p.get("playerId") and str(p["playerId"]) not in pm:
            pm[str(p["playerId"])] = {"name": p["player"], "pos": p["pos"], "nfl": p["nfl"]}
            added += 1
    json.dump(dict(sorted(pm.items(), key=lambda kv: int(kv[0]))), open(pj, "w"), indent=1)
    print("players.json: +%d (total %d)" % (added, len(pm)))
