# Getting the site working

Two options. Start with #1 — it takes 10 seconds and needs nothing installed.

---

## Option 1 — Just look at it (no setup)

1. Unzip `scc-fantasy-history.zip`.
2. Open the `site` folder.
3. **Double-click `SCC-Fantasy-History.html`.**

That's it. It opens in your browser and everything works — all seven seasons,
draft boards, photos.

This is a single self-contained file with all the data baked in. You can email it
to the league or drop it in a shared folder. The only rule: **keep the `photos`
folder next to it**, or the gallery images won't show.

> Don't double-click `index.html` — it will look broken and say it can't load
> league data. That file is for web hosting, where the data loads separately.
> `SCC-Fantasy-History.html` is the one for opening directly.

---

## Option 2 — Put it on the web (GitHub Pages, free)

Gives you a real link like `https://yourname.github.io/scc-fantasy/` that anyone
in the league can bookmark. No terminal needed — all of this is drag-and-drop.

### Step 1 — Make a GitHub account
Go to <https://github.com> and sign up if you don't have one. Free tier is fine.

### Step 2 — Create a repository
1. Click the **+** in the top-right → **New repository**.
2. Repository name: `scc-fantasy` (or anything you like — it becomes part of the URL).
3. Set it to **Public**. *(GitHub Pages requires public on the free plan.)*
4. Leave every checkbox unticked. Click **Create repository**.

### Step 3 — Upload the files
1. On the new empty repo page, click **uploading an existing file**.
2. Open your unzipped `site` folder in Finder.
3. Select **everything inside** `site` — `index.html`, `assets`, `data`, `photos`,
   and the rest — and drag it all into the browser window.

   ⚠️ Drag the **contents** of `site`, not the `site` folder itself. `index.html`
   must land at the top level of the repo, not inside a subfolder.
4. Wait for the uploads to finish (the photos take a moment), then click
   **Commit changes**.

### Step 4 — Turn on Pages
1. In the repo, click **Settings** (top row).
2. Click **Pages** in the left sidebar.
3. Under **Source**, choose **Deploy from a branch**.
4. Branch: **main**, folder: **/ (root)**. Click **Save**.

### Step 5 — Wait, then visit
Give it 1–2 minutes. Refresh the Settings → Pages screen and your link appears at
the top. That's the URL to share.

---

## Updating it later

**Adding photos or videos — the easy way.** Open **`add-photos.html`** from your
site folder (there's also a link in the site's footer). Then:

1. Click **Choose site folder…** and pick the `site` folder. Chrome asks permission
   to edit it — that's expected, and nothing leaves your computer.
2. Pick the season.
3. Drag your photos and videos onto the drop zone. Add captions if you want.
4. Click **Save to the site**.

It copies the files into `photos/<year>/` and updates `data/photos.json` for you, so
you never touch JSON. It also tidies filenames (`Draft Night 2019.JPG` becomes
`draft-night-2019.jpg`), warns about files GitHub will reject, and won't overwrite an
existing photo — a name clash gets saved under a new name instead. You can also remove
an item from a gallery there.

Then commit and push the `photos` folder and `data/photos.json` to GitHub.

> **Chrome or Edge only.** Safari and Firefox don't support the folder-access feature
> this needs; the page will tell you if your browser can't do it. If Chrome refuses when
> you open the file directly, run `python3 -m http.server 8000` in the site folder and
> visit `http://localhost:8000/add-photos.html` instead.

**Adding them by hand instead** — drag files into `photos/<year>/` on github.com, then
edit `data/photos.json` and add the filenames:

```json
"2019": [
  { "file": "draft-night.jpg", "caption": "Round 1 chaos" },
  { "file": "trophy-toast.mp4", "caption": "The acceptance speech" }
]
```

Videos sit in the same gallery as photos, with a ▶ badge; clicking one opens it
full-screen with normal playback controls. A few rules:

- **Use `.mp4`.** It plays everywhere. `.webm` and `.m4v` also work.
- **Convert iPhone `.mov` files to `.mp4`** — Chrome and Android often can't play `.mov`.
  On a Mac, open it in QuickTime → File → Export As → 1080p, which writes an `.mp4`.
- **Keep clips under ~50 MB.** GitHub warns above that and refuses files over 100 MB.
- Optional: give a video a custom thumbnail with
  `{ "file": "clip.mp4", "poster": "clip-thumb.jpg" }`.

**Adding next season** — see `README.md` for the two-command recipe. Send me the
ESPN league JSON and the Draft Recap PDF and I'll do it.

---

## If something goes wrong

| What you see | Why | Fix |
|---|---|---|
| Page says "Could not load league data" | You opened `index.html` directly | Open `SCC-Fantasy-History.html` instead, or host it |
| GitHub Pages shows a 404 | `index.html` is in a subfolder | Re-upload the *contents* of `site`, not the folder |
| Page loads but no photos | `photos` folder missing or not uploaded | Upload the `photos` folder too |
| A video shows a black box | Usually a `.mov` file | Convert it to `.mp4` and re-upload |
| GitHub refuses a video upload | File is over 100 MB | Trim or compress it first |
| Pages link doesn't work yet | First build takes a minute or two | Wait and refresh |
| "This browser can't write files" | You're in Safari or Firefox | Use Chrome or Edge |
| Add-photos page won't open the folder picker | Chrome blocked it on a `file://` page | Run `python3 -m http.server 8000` and use `localhost` |
