#!/usr/bin/env python3
"""Merge an ESPN league JSON export into site/data/league.json.

Usage:  python3 import_espn.py espn_2025.json [espn_2024.json ...]
Each input must be the response of:
  .../seasons/<YEAR>/segments/0/leagues/<ID>?view=mTeam&view=mSettings&view=mDraftDetail
"""
import json, sys, os, re

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site")
LEAGUE = os.path.join(SITE, "data", "league.json")


def member_names(d):
    out = {}
    for m in d.get("members", []):
        nm = (m.get("firstName", "") + " " + m.get("lastName", "")).strip()
        out[m["id"]] = nm or m.get("displayName") or m["id"]
    return out


def title_name(n):
    """'james connor' -> 'James Connor'; leave already-cased names alone."""
    if n.isupper() or n.islower():
        return " ".join(w.capitalize() for w in n.split())
    return n


def dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def season_from_espn(d, player_names=None):
    """League rule (set by the commissioner):
       - Teams that MADE the playoffs are ordered by their playoff result.
       - Teams that MISSED the playoffs are ordered by regular-season standing.
         The consolation bracket is ignored entirely.
    """
    year = d["seasonId"]
    mem = member_names(d)
    sched = (d.get("settings") or {}).get("scheduleSettings") or {}
    playoff_count = sched.get("playoffTeamCount") or 0

    teams = []
    for t in d["teams"]:
        r = (t.get("record") or {}).get("overall", {}) or {}
        owners = dedupe(title_name(mem.get(o, o)) for o in (t.get("owners") or []))
        teams.append({
            "espnTeamId": t["id"],
            "name": re.sub(r"\s+", " ", (t.get("name") or ((t.get("location") or "") + " " + (t.get("nickname") or ""))).strip()),
            "owners": owners,
            "abbrev": t.get("abbrev"),
            "espnFinalRank": t.get("rankCalculatedFinal"),
            "playoffSeed": t.get("playoffSeed"),
            "madePlayoffs": bool(playoff_count and (t.get("playoffSeed") or 99) <= playoff_count),
            "record": {
                "wins": r.get("wins", 0), "losses": r.get("losses", 0), "ties": r.get("ties", 0),
                "pointsFor": round(r.get("pointsFor", 0), 2),
                "pointsAgainst": round(r.get("pointsAgainst", 0), 2),
            },
        })

    # Order: playoff teams first (by playoff finish), then the rest by regular-season seed.
    teams.sort(key=lambda t: (
        0 if t["madePlayoffs"] else 1,
        (t["espnFinalRank"] or 99) if t["madePlayoffs"] else (t["playoffSeed"] or 99),
    ))
    for i, t in enumerate(teams):
        t["finalRank"] = i + 1

    first = teams[0] if teams else None
    last = teams[-1] if teams else None

    s = {
        "year": year,
        "era": "scc",
        "leagueName": (d.get("settings") or {}).get("name"),
        "teamCount": (d.get("settings") or {}).get("size") or len(teams),
        "draftSource": "ESPN",
        "playoffTeamCount": playoff_count,
        "standingsNote": ("Playoff teams (top %d seeds) are ordered by their playoff finish. "
                          "Everyone else is ordered by regular-season standing — the consolation "
                          "bracket is not counted." % playoff_count) if playoff_count else None,
        "champion": {"team": first["name"], "owners": first["owners"]} if first else None,
        "lastPlace": {"team": last["name"], "owners": last["owners"]} if last else None,
        "teams": teams,
    }

    # draft picks
    picks = []
    id2team = {t["id"]: re.sub(r"\s+", " ", (t.get("name") or "").strip()) for t in d["teams"]}
    for p in ((d.get("draftDetail") or {}).get("picks") or []):
        pid = p.get("playerId")
        nm = (player_names or {}).get(str(pid)) or (player_names or {}).get(pid)
        picks.append({
            "round": p.get("roundId"),
            "overall": p.get("overallPickNumber"),
            "team": id2team.get(p.get("teamId"), "?"),
            "player": nm or ("ESPN player #" + str(pid)),
            "playerId": pid,
            "pos": ((player_names or {}).get("_pos", {}) or {}).get(str(pid), ""),
            "nfl": ((player_names or {}).get("_nfl", {}) or {}).get(str(pid), ""),
        })
    picks.sort(key=lambda x: x["overall"] or 0)
    return s, picks


def main(paths):
    league = json.load(open(LEAGUE))
    # optional player-name map: data/players.json  {"4362628": {"name":..,"pos":..,"nfl":..}}
    pmap_path = os.path.join(SITE, "data", "players.json")
    raw = json.load(open(pmap_path)) if os.path.exists(pmap_path) else {}
    names = {k: v.get("name") for k, v in raw.items()}
    names["_pos"] = {k: v.get("pos", "") for k, v in raw.items()}
    names["_nfl"] = {k: v.get("nfl", "") for k, v in raw.items()}

    for path in paths:
        d = json.load(open(path))
        if isinstance(d, list):
            d = d[0]
        s, picks = season_from_espn(d, names)
        league["seasons"] = [x for x in league["seasons"] if x["year"] != s["year"]]
        league["seasons"].append(s)
        if picks:
            json.dump(picks, open(os.path.join(SITE, "data", "draft%d.json" % s["year"]), "w"), indent=1)
        print("imported %d: %s | %d teams | %d picks | champ=%s | last=%s"
              % (s["year"], s["leagueName"], len(s["teams"]), len(picks),
                 s["champion"]["team"] if s["champion"] else "?",
                 s["lastPlace"]["team"] if s["lastPlace"] else "?"))

    league["seasons"].sort(key=lambda x: x["year"])
    league["eras"]["scc"]["years"] = [x["year"] for x in league["seasons"] if x["era"] == "scc"]
    league["eras"]["pre"]["years"] = [x["year"] for x in league["seasons"] if x["era"] == "pre"]
    json.dump(league, open(LEAGUE, "w"), indent=2)

    # make sure photo buckets + folders exist for every season
    pj = os.path.join(SITE, "data", "photos.json")
    photos = json.load(open(pj))
    for x in league["seasons"]:
        photos.setdefault(str(x["year"]), [])
        os.makedirs(os.path.join(SITE, "photos", str(x["year"])), exist_ok=True)
    json.dump(photos, open(pj, "w"), indent=2)
    print("seasons now:", [x["year"] for x in league["seasons"]])


if __name__ == "__main__":
    main(sys.argv[1:])
