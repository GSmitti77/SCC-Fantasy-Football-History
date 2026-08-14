#!/usr/bin/env python3
"""Build a single-file version of the site that works from a file:// double-click.

Inlines style.css, app.js and every data/*.json into one HTML file. Photos stay as
relative paths (<img src> works fine on file://, unlike fetch), so keep the
photos/ folder next to the generated file.

  python3 build_standalone.py  ->  SCC-Fantasy-History.html
"""
import json, os, re, glob

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "site")
OUT = os.path.join(SITE, "SCC-Fantasy-History.html")

html = open(os.path.join(SITE, "index.html")).read()
css = open(os.path.join(SITE, "assets", "style.css")).read()
js = open(os.path.join(SITE, "assets", "app.js")).read()

data = {}
for path in sorted(glob.glob(os.path.join(SITE, "data", "*.json"))):
    key = "data/" + os.path.basename(path)
    data[key] = json.load(open(path))

# </script> inside JSON would close the tag early
blob = json.dumps(data, separators=(",", ":")).replace("</", "<\\/")

html = html.replace('<link rel="stylesheet" href="assets/style.css">',
                    "<style>\n" + css + "\n</style>")
html = html.replace('<script src="assets/app.js"></script>',
                    "<script>window.SCC_DATA=" + blob + ";</script>\n<script>\n" + js + "\n</script>")

# a standalone file has no server, so soften the loader hint
html = html.replace("Loading league history…", "Loading league history…")

assert "assets/style.css" not in html and "assets/app.js" not in html, "inline failed"
open(OUT, "w").write(html)
print("wrote %s (%.1f KB, %d data files inlined)" % (OUT, os.path.getsize(OUT) / 1024, len(data)))
