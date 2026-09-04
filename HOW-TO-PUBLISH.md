# Getting the site online, and keeping it updated

Three sections: look at it locally, publish it once, then update it forever after.

---

## 1 · Just look at it (no setup at all)

1. Unzip `scc-fantasy-history.zip`.
2. Open the `site` folder.
3. **Double-click `SCC-Fantasy-History.html`.**

It opens in your browser and everything works. Keep the `photos` folder next to it.

> Don't double-click `index.html` — it'll say it can't load league data. That file is
> for web hosting. `SCC-Fantasy-History.html` is the one for opening directly.

---

## 2 · Publish it (one-time setup, ~10 minutes)

### What "commit" and "push" actually mean

GitHub stores your site. Getting changes from your Mac up to GitHub is two steps:

- **Commit** = save a snapshot of what you changed, with a short label like
  *"added 2025 draft photos"*. It's still only on your computer.
- **Push** = upload those snapshots to GitHub. This is what makes the live site update.

You don't need the terminal. **GitHub Desktop** does both with buttons.

### Step 1 — Make a GitHub account
Sign up at <https://github.com>. Free.

### Step 2 — Install GitHub Desktop
Download from <https://desktop.github.com>, install, and sign in with that account.

### Step 3 — Create the repository
1. In GitHub Desktop: **File → New Repository…**
2. **Name:** `scc-fantasy` (this becomes part of your web address)
3. **Local Path:** pick where it goes, e.g. your Documents folder
4. Leave everything else alone. Click **Create Repository**.

GitHub Desktop just made a folder — for example `Documents/scc-fantasy`.

### Step 4 — Put the site files in it
Open that new `scc-fantasy` folder in Finder. Copy in **everything inside** your
`site` folder — `index.html`, `add-photos.html`, `assets`, `data`, `photos`, and the rest.

⚠️ The **contents** of `site`, not the `site` folder itself. `index.html` has to sit at
the top level of `scc-fantasy`, or the site won't load.

### Step 5 — Your first commit and push
Switch back to GitHub Desktop. It now lists every file you copied in.

1. Bottom-left, in the **Summary** box, type: `initial site`
2. Click **Commit to main**
3. Top of the window, click **Publish repository**
4. **Untick "Keep this code private"** — GitHub Pages needs it public on the free plan
5. Click **Publish repository**

### Step 6 — Turn on GitHub Pages
1. In GitHub Desktop: **Repository → View on GitHub** (opens your browser)
2. Click **Settings** → **Pages** in the left sidebar
3. **Source:** Deploy from a branch · **Branch:** `main` · **Folder:** `/ (root)` → **Save**
4. Wait 1–2 minutes, refresh. Your link appears at the top of that page.

That's the URL to send the league.

---

## 3 · Updating it later (this is the part you'll actually repeat)

Say you just added photos with `add-photos.html`. To publish them:

1. Open **GitHub Desktop**. It automatically shows what changed — your new photos and
   the updated `data/photos.json`.
2. Type a short summary, e.g. `2025 draft photos`.
3. Click **Commit to main**.
4. Click **Push origin** at the top.

Live in about a minute. That's the whole loop: **Commit → Push**.

> **One catch:** `add-photos.html` writes into whatever folder you connected it to.
> Point it at your `scc-fantasy` repo folder, *not* a separate copy of `site`, or your
> changes won't show up in GitHub Desktop. Easiest fix: after Step 4 above, delete the
> old `site` folder so there's only one copy to get confused about.

### Adding photos and videos

Open **`add-photos.html`** (also linked in the site's footer):

1. **Choose site folder…** → pick your `scc-fantasy` folder. Chrome will ask permission
   to edit it — expected, and nothing leaves your computer.
2. Pick the season.
3. Drag photos and videos in. Add captions if you like. Each file shows the date it
   was taken when that information survives in the file, and if they all point at one
   season the tool offers a one-click switch — it never changes the season on its own.
4. **Save to the site**, then Commit → Push in GitHub Desktop.

It copies files into `photos/<year>/` and updates `data/photos.json` for you, tidies
filenames, warns about anything GitHub will reject, and won't overwrite an existing
photo. You can also remove items from a gallery there.

It also keeps **`SCC-Fantasy-History.html`** (the offline double-click copy) in sync —
that file has the data baked inside it, so editing `photos.json` alone would leave it
showing the old list. Just connecting the folder is enough to re-sync it, which is the
fix if you ever edit the JSON by hand.

> **Chrome or Edge only.** Safari and Firefox don't support the folder-access feature.
> If Chrome refuses when you open the file directly, run `python3 -m http.server 8000`
> in the folder and visit `http://localhost:8000/add-photos.html`.

Video rules: use **`.mp4`**. Convert iPhone `.mov` files (QuickTime → File → Export As →
1080p). Keep clips under ~50 MB — GitHub warns above that and refuses over 100 MB.

### Adding photos without any of the above

You can skip GitHub Desktop entirely: on github.com, open `photos/<year>`, click
**Add file → Upload files**, drag them in, **Commit changes**. Then open
`data/photos.json`, click the pencil ✏️, add the filenames, and commit again.

```json
"2019": [
  { "file": "draft-night.jpg", "caption": "Round 1 chaos" },
  { "file": "trophy-toast.mp4", "caption": "The acceptance speech" }
]
```

### Adding next season

See `README.md`. Or just send me the ESPN league JSON and the Draft Recap PDF.

---

## If something goes wrong

| What you see | Why | Fix |
|---|---|---|
| "Could not load league data" | You opened `index.html` directly | Open `SCC-Fantasy-History.html`, or view the published site |
| GitHub Pages shows a 404 | `index.html` is in a subfolder | Move the *contents* of `site` to the top level of the repo |
| Pages link doesn't work yet | First build takes a minute or two | Wait and refresh |
| Site loads but no photos | The `photos` folder wasn't copied in | Copy it into the repo folder, then Commit → Push |
| GitHub Desktop shows no changes | `add-photos.html` wrote to a different folder | Reconnect it to your repo folder |
| "Publish repository" is greyed out | Nothing committed yet | Write a summary and click **Commit to main** first |
| A video shows a black box | Usually a `.mov` file | Convert to `.mp4` and re-add |
| GitHub refuses a file | Over 100 MB | Trim or compress it |
| "This browser can't write files" | Safari or Firefox | Use Chrome or Edge |
| Edited `photos.json` by hand and `SCC-Fantasy-History.html` didn't change | That file has the data baked in | Open `add-photos.html` and connect the folder — it syncs automatically |
| No 📅 date on a file | Screenshots, edited copies and PNGs usually lose it | Pick the season yourself; the date is only ever a hint |
| The 📅 date is the wrong year | It's a screenshot of an older photo — the date is when you screenshotted | Ignore the suggestion and pick the real season |
| Push button says you're behind | Edited on github.com and locally | Click **Pull origin** first, then push |
