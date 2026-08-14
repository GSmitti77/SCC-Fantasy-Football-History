# SCC Fantasy Football — League History

Static site documenting the history of the SCC fantasy football league, 2019–present.
No build step, no dependencies — plain HTML/CSS/JS reading JSON.

```
index.html            the whole app shell
assets/style.css      styles
assets/app.js         renders every view from data/
data/league.json      seasons, teams, managers, records, champions
data/draft<YEAR>.json every draft pick for that season
data/players.json     ESPN player id -> name/pos/nfl (reused across seasons)
data/photos.json      which images appear in each year's gallery
photos/<YEAR>/        the image and video files themselves
add-photos.html       drag-and-drop tool for adding media (Chrome/Edge)
```

## Adding draft photos and videos

**Use the built-in tool:** open `add-photos.html`, connect the `site` folder, pick a
season, drag files in, hit save. It writes into `photos/<year>/` and updates
`data/photos.json` itself — no manual JSON editing. Chrome/Edge only (File System
Access API); serve over `localhost` if opening it as a `file://` page is blocked.

Doing it by hand instead:

1. Drop files into `photos/<year>/` (e.g. `photos/2025/draft-night.jpg`).
2. Add the file names to `data/photos.json`:

```json
"2025": [
  { "file": "draft-night.jpg", "caption": "Round 1 chaos" },
  { "file": "trophy-toast.mp4", "caption": "The acceptance speech" },
  { "file": "crew.jpg" }
]
```

3. Commit and push. The gallery picks them up automatically.

Images (`.jpg .png .gif`) and videos (`.mp4 .webm .m4v .ogv`) share one gallery —
the type is detected from the file extension. Videos render with a ▶ badge and open
in the lightbox with playback controls; add `"poster": "thumb.jpg"` to control the
thumbnail. Prefer `.mp4` (H.264): `.mov` is unreliable outside Safari, and GitHub
blocks files over 100 MB.

## Adding next season

Two files from ESPN, then two commands.

**1. League JSON.** Open this in a browser where you're logged into ESPN, and save the page:

```
https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/<YEAR>/segments/0/leagues/1544021868?view=mTeam&view=mSettings&view=mDraftDetail
```

**2. Draft recap.** Go to the league's Draft Recap page for that season and print/save it as PDF:

```
https://fantasy.espn.com/football/league/draftrecap?seasonId=<YEAR>&leagueId=1544021868
```

Then:

```bash
python3 import_espn.py espn_<YEAR>.json        # teams, records, PF/PA, standings, picks-by-id
pdftotext -layout "Draft Recap ... .pdf" recap<YEAR>.txt
python3 parse_recap.py recap<YEAR>.txt <YEAR>  # fills in player names
```

`parse_recap.py` asserts every round has a full complement of picks and reports
anything it couldn't name, so a silent partial import isn't possible.

## Standings rule

Teams that **made the playoffs** are ordered by their playoff finish.
Teams that **missed** are ordered by regular-season standing.
The consolation bracket is ignored — a consolation run never improves a final placing.
This is applied in `import_espn.py`; ESPN's own `rankCalculatedFinal` is kept
alongside as `espnFinalRank` for reference.

## Data provenance

| Seasons | Source |
|---|---|
| 2019, 2020 | ESPN "Draft Results" emails (PDF) |
| 2021 | Photo of the physical draft board — rounds accurate, pick order within a round not recorded |
| 2022–2025 | ESPN league API + Draft Recap pages |

Win-loss records and points are only available for 2022 onward; the Pre-SCC years
have champions and last place only.

## Running locally

Browsers block `fetch` on `file://`, so use a local server:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploying to GitHub Pages

Push this folder to a repo, then **Settings → Pages → Source: `main` / root**.
