/* SCC Fantasy History — data-driven single-page site */
(function () {
  "use strict";

  var L = null, PHOTOS = {}, DRAFTS = {}, view = "overview";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (t, cls, html) {
    var n = document.createElement(t);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var owners = function (a) { return (a || []).join(" & "); };
  var posClass = function (p) { return p === "D/ST" ? "DST" : (p || "").replace(/[^A-Z]/g, ""); };

  // In the standalone build the JSON is embedded as window.SCC_DATA so the page
  // works from a plain file:// double-click. Otherwise fetch it normally.
  function getJSON(url) {
    if (window.SCC_DATA && Object.prototype.hasOwnProperty.call(window.SCC_DATA, url)) {
      return Promise.resolve(window.SCC_DATA[url]);
    }
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " -> " + r.status);
      return r.json();
    });
  }

  /* ---------------- boot ---------------- */
  getJSON("data/league.json")
    .then(function (league) {
      L = league;
      document.title = L.siteTitle + " — History";
      $("#siteTitle").innerHTML = esc(L.siteTitle).replace(/^SCC/, "<span>SCC</span>");
      $("#siteSub").textContent = L.subtitle || "";
      return getJSON("data/photos.json").catch(function () { return {}; });
    })
    .then(function (p) {
      PHOTOS = p || {};
      var years = L.seasons.map(function (s) { return s.year; });
      return Promise.all(
        years.map(function (y) {
          return getJSON("data/draft" + y + ".json")
            .then(function (d) { DRAFTS[y] = d; })
            .catch(function () { DRAFTS[y] = null; });
        })
      );
    })
    .then(function () {
      buildNav();
      renderAll();
      route();
      window.addEventListener("hashchange", route);
    })
    .catch(function (e) {
      $("#views").innerHTML =
        '<div class="empty">Could not load league data.<br><small>' +
        esc(e.message) +
        "</small><br><br>If you opened this file directly from your computer, run it through a local server " +
        "(<code>python3 -m http.server</code>) or view it on GitHub Pages — browsers block file:// data loading.</div>";
    });

  /* ---------------- nav ---------------- */
  function buildNav() {
    var nav = $("#tabs");
    nav.appendChild(tabBtn("overview", "Overview"));
    nav.appendChild(tabBtn("owners", "Managers"));

    ["pre", "scc"].forEach(function (key) {
      var seasons = L.seasons.filter(function (s) { return s.era === key; })
        .sort(function (a, b) { return a.year - b.year; });
      if (!seasons.length) return;
      nav.appendChild(el("span", "sep"));
      nav.appendChild(el("span", "eralabel", esc(L.eras[key].label)));
      seasons.forEach(function (s) { nav.appendChild(tabBtn("y" + s.year, String(s.year))); });
    });
  }
  function tabBtn(id, label) {
    var b = el("button", "", esc(label));
    b.dataset.view = id;
    b.onclick = function () { location.hash = id; };
    return b;
  }
  function route() {
    var want = (location.hash || "#overview").slice(1);
    if (!$('#views > [data-view="' + CSS.escape(want) + '"]')) want = "overview";
    view = want;
    Array.prototype.forEach.call(document.querySelectorAll("#tabs button"), function (b) {
      b.classList.toggle("on", b.dataset.view === want);
    });
    Array.prototype.forEach.call(document.querySelectorAll("#views > section"), function (s) {
      s.classList.toggle("on", s.dataset.view === want);
    });
    window.scrollTo(0, 0);
  }

  /* ---------------- derived data ---------------- */
  /* Everything is keyed on the PERSON, not on the ESPN team slot, so a slot that
     changed hands credits each title to whoever actually won it. Co-managed teams
     credit both people with that team's season. */
  function managerIndex() {
    var idx = {};
    L.seasons.slice().sort(function (a, b) { return a.year - b.year; }).forEach(function (s) {
      (s.teams || []).forEach(function (t) {
        (t.owners || []).forEach(function (o) {
          if (!idx[o]) idx[o] = {
            name: o, seasons: [], titles: 0, seconds: 0, lasts: 0,
            w: 0, l: 0, t: 0, pf: 0, pa: 0, tracked: 0
          };
          var m = idx[o];
          var champ = !!(s.champion && s.champion.team === t.name);
          var second = !!(s.runnerUp && s.runnerUp.team === t.name);
          var last = !!(s.lastPlace && s.lastPlace.team === t.name);
          if (champ) m.titles++;
          if (second) m.seconds++;
          if (last) m.lasts++;
          if (t.record) {
            m.w += t.record.wins || 0; m.l += t.record.losses || 0; m.t += t.record.ties || 0;
            m.pf += t.record.pointsFor || 0; m.pa += t.record.pointsAgainst || 0; m.tracked++;
          }
          m.seasons.push({
            year: s.year, era: s.era, team: t.name, champ: champ, second: second, last: last,
            co: (t.owners || []).filter(function (x) { return x !== o; }),
            record: t.record || null, finalRank: t.finalRank || null
          });
        });
      });
    });
    return idx;
  }

  function allTimeRows() {
    var idx = managerIndex();
    return Object.keys(idx).map(function (k) {
      var m = idx[k];
      var g = m.w + m.l + m.t;
      m.games = g;
      m.pct = g ? m.w / g : null;
      m.first = m.seasons[0].year;
      m.latest = m.seasons[m.seasons.length - 1].year;
      m.best = Math.min.apply(null, m.seasons.map(function (x) { return x.finalRank || 99; }));
      return m;
    }).sort(function (a, b) {
      return b.titles - a.titles || b.seconds - a.seconds || (b.pct || -1) - (a.pct || -1) ||
        b.seasons.length - a.seasons.length || a.name.localeCompare(b.name);
    });
  }

  /* ---------------- render ---------------- */
  function renderAll() {
    var root = $("#views");
    root.innerHTML = "";
    root.appendChild(viewOverview());
    root.appendChild(viewManagers());
    L.seasons.slice().sort(function (a, b) { return a.year - b.year; })
      .forEach(function (s) { root.appendChild(viewSeason(s)); });
  }
  function section(id) {
    var s = el("section", "view");
    s.dataset.view = id;
    return s;
  }

  /* ----- Overview ----- */
  function viewOverview() {
    var v = section("overview");
    var seasons = L.seasons.slice().sort(function (a, b) { return b.year - a.year; });
    var rows = allTimeRows();

    /* trophy case */
    var champs = rows.filter(function (r) { return r.titles; });
    v.appendChild(el("h2", "", "Trophy Case"));
    var tc = el("div", "podium");
    [["🏆", "Championships", "titles", "champ"],
     ["🥈", "Runner-up", "seconds", "silver"],
     ["💩", "Last place", "lasts", "toilet"]].forEach(function (spec) {
      var list = rows.filter(function (r) { return r[spec[2]]; })
        .sort(function (a, b) { return b[spec[2]] - a[spec[2]] || a.name.localeCompare(b.name); });
      var top = list.length ? list[0][spec[2]] : 0;
      var leaders = list.filter(function (r) { return r[spec[2]] === top; });
      var c = el("div", "card " + spec[3]);
      c.innerHTML = "<div class='ico'>" + spec[0] + "</div><div><div class='lbl'>Most " + spec[1] + "</div>" +
        "<div class='team'>" + (leaders.length ? esc(leaders.map(function (r) { return r.name; }).join(", ")) : "—") + "</div>" +
        "<div class='own'>" + (top ? top + "×" : "none yet") + "</div></div>";
      tc.appendChild(c);
    });
    v.appendChild(tc);

    v.appendChild(el("h2", "", "Season by Season"));
    var tw = el("div", "card table-scroll");
    var t = el("table");
    t.innerHTML =
      "<thead><tr><th>Season</th><th>League name</th><th class='num'>Teams</th>" +
      "<th>🏆 Champion</th><th>🥈 Runner-up</th><th>💩 Last place</th></tr></thead>";
    var tb = el("tbody");
    seasons.forEach(function (s) {
      var tr = el("tr");
      tr.innerHTML =
        "<td><a href='#y" + s.year + "'><b>" + s.year + "</b></a> " +
        "<span class='pill'>" + esc(L.eras[s.era].label) + "</span></td>" +
        "<td class='oname'>" + esc(s.leagueName || "—") + "</td>" +
        "<td class='num'>" + (s.teamCount || (s.teams || []).length) + "</td>" +
        "<td>" + champCell(s.champion, "trophy") + "</td>" +
        "<td>" + champCell(s.runnerUp, "medal") + "</td>" +
        "<td>" + champCell(s.lastPlace, "poop") + "</td>";
      tb.appendChild(tr);
    });
    t.appendChild(tb); tw.appendChild(t); v.appendChild(tw);
    v.appendChild(el("p", "note",
      "Full manager records, win totals and every team name are on the " +
      "<a href='#owners'>Managers</a> tab."));
    return v;
  }

  function champCell(c, cls) {
    if (!c) return "<span style='color:var(--dim)'>—</span>";
    return "<span class='tname " + cls + "'>" + esc(c.team) + "</span><br>" +
      "<span class='oname'>" + esc(owners(c.owners)) + "</span>";
  }
  function fmt(n) {
    return (Math.round(n * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  /* ----- Managers ----- */
  function viewManagers() {
    var v = section("owners");
    var rows = allTimeRows();
    var anyRecords = rows.some(function (r) { return r.tracked > 0; });

    v.appendChild(el("h2", "", "All-Time Manager Records"));
    var tw = el("div", "card table-scroll");
    var t = el("table");
    t.innerHTML =
      "<thead><tr><th class='rank'>#</th><th>Manager</th><th class='num'>Seasons</th>" +
      "<th class='num'>🏆</th><th class='num'>🥈</th><th class='num'>💩</th>" +
      (anyRecords ? "<th class='num'>W</th><th class='num'>L</th><th class='num'>Win%</th>" +
        "<th class='num'>PF</th><th class='num'>PA</th><th class='num'>Diff</th>" : "") +
      "<th class='num'>Best</th></tr></thead>";
    var tb = el("tbody");
    rows.forEach(function (r, i) {
      var tr = el("tr");
      var h = "<td class='rank'>" + (i + 1) + "</td>" +
        "<td class='tname'><a href='#mgr-" + slug(r.name) + "'>" + esc(r.name) + "</a>" +
        "<br><span class='oname'>" + r.first + "–" + r.latest + "</span></td>" +
        "<td class='num'>" + r.seasons.length + "</td>" +
        "<td class='num trophy'>" + (r.titles || "—") + "</td>" +
        "<td class='num medal'>" + (r.seconds || "—") + "</td>" +
        "<td class='num poop'>" + (r.lasts || "—") + "</td>";
      if (anyRecords) {
        h += r.tracked
          ? "<td class='num'>" + r.w + "</td><td class='num'>" + r.l + "</td>" +
            "<td class='num'>" + (r.pct == null ? "—" : r.pct.toFixed(3).replace(/^0/, "")) + "</td>" +
            "<td class='num'>" + fmt(r.pf) + "</td><td class='num'>" + fmt(r.pa) + "</td>" +
            "<td class='num'>" + (r.pf - r.pa >= 0 ? "+" : "") + fmt(r.pf - r.pa) + "</td>"
          : "<td class='num' colspan='6' style='color:var(--dim)'>not tracked</td>";
      }
      h += "<td class='num'>" + (r.best < 99 ? r.best : "—") + "</td>";
      tr.innerHTML = h;
      tb.appendChild(tr);
    });
    t.appendChild(tb); tw.appendChild(t); v.appendChild(tw);
    v.appendChild(el("p", "note",
      "Win-loss records and points cover 2022–present only — the Pre-SCC seasons recorded " +
      "finishes but not weekly results. Trophies and last-place finishes cover all seven seasons. " +
      "A co-managed team counts for both managers, so the W and L columns don't sum to the league total."));

    v.appendChild(el("h2", "", "Team Names by Manager"));
    v.appendChild(el("p", "note",
      "Almost nobody keeps a team name two years running, so this is the thread that ties it together."));
    var grid = el("div", "owners");
    rows.forEach(function (r) {
      var c = el("div", "card owner mgr");
      c.id = "mgr-" + slug(r.name);
      var stats =
        statTile(r.seasons.length, "Seasons", "") +
        statTile(r.titles, "Titles", "gold") +
        statTile(r.seconds, "2nd", "silv") +
        statTile(r.lasts, "Last", "bad") +
        (r.tracked ? statTile(r.w + "-" + r.l, "Record", "") : "");
      var lis = r.seasons.map(function (y) {
        var rec = y.record ? y.record.wins + "-" + y.record.losses + (y.record.ties ? "-" + y.record.ties : "") : "";
        return "<li><span class='yr'>" + y.year + "</span>" +
          "<span class='nm'>" + esc(y.team) +
          (y.co.length ? "<br><span class='oname'>with " + esc(owners(y.co)) + "</span>" : "") + "</span>" +
          "<span class='oname' style='width:50px;text-align:right'>" + rec + "</span>" +
          "<span class='mark'>" + (y.champ ? "🏆" : "") + (y.second ? "🥈" : "") + (y.last ? "💩" : "") + "</span></li>";
      }).join("");
      c.innerHTML = "<h4>" + esc(r.name) + "</h4>" +
        "<div class='statline'>" + stats + "</div>" +
        "<ul class='hist'>" + lis + "</ul>";
      grid.appendChild(c);
    });
    v.appendChild(grid);
    return v;
  }

  function statTile(val, label, cls) {
    return "<div class='stat " + (cls || "") + "'><b>" + esc(val || (val === 0 ? "0" : "—")) +
      "</b><span>" + esc(label) + "</span></div>";
  }
  function slug(n) { return String(n).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  /* ----- Season ----- */
  function viewSeason(s) {
    var v = section("y" + s.year);

    var hero = el("div", "hero");
    var h = el("div");
    h.innerHTML = "<h2 style='margin:0'>" + s.year + " &nbsp;<span class='pill'>" +
      esc(L.eras[s.era].label) + "</span>" +
      (s.seasonLabel ? " <span class='pill'>" + esc(s.seasonLabel) + "</span>" : "") + "</h2>";
    hero.appendChild(h);
    var meta = el("div", "meta");
    meta.innerHTML =
      "League name: <b>" + esc(s.leagueName || "—") + "</b>" +
      "<span>Teams: <b>" + (s.teamCount || (s.teams || []).length) + "</b></span>" +
      (s.draftSource ? "<span>Draft source: <b>" + esc(s.draftSource) + "</b></span>" : "");
    hero.appendChild(meta);
    v.appendChild(hero);

    var pod = el("div", "podium");
    pod.appendChild(podCard("champ", "🏆", "Champion", s.champion));
    pod.appendChild(podCard("silver", "🥈", "Runner-up", s.runnerUp));
    pod.appendChild(podCard("toilet", "💩", "Last place", s.lastPlace));
    v.appendChild(pod);

    /* teams */
    v.appendChild(el("h2", "", "Teams &amp; Managers"));
    var tw = el("div", "card table-scroll");
    var hasRec = (s.teams || []).some(function (t) { return t.record; });
    var t = el("table");
    t.innerHTML = "<thead><tr><th class='rank'>" + (hasRec ? "Fin" : "#") + "</th><th>Team</th><th>Manager(s)</th>" +
      (hasRec ? "<th class='num'>W-L</th><th class='num'>PF</th><th class='num'>PA</th>" +
                "<th class='num'>Diff</th><th class='num'>Seed</th>" : "") +
      "</tr></thead>";
    var tb = el("tbody");
    (s.teams || []).forEach(function (tm, i) {
      var tr = el("tr");
      if (hasRec && s.playoffTeamCount && (i + 1) === s.playoffTeamCount + 1) tr.className = "cutoff";
      var mark = (s.champion && s.champion.team === tm.name ? " <span class='trophy'>🏆</span>" : "") +
        (s.runnerUp && s.runnerUp.team === tm.name ? " <span class='medal'>🥈</span>" : "") +
        (s.lastPlace && s.lastPlace.team === tm.name ? " <span class='poop'>💩</span>" : "");
      var html = "<td class='rank'>" + (tm.finalRank || i + 1) + "</td>" +
        "<td class='tname'>" + esc(tm.name) + mark +
        (tm.draftedAs ? "<br><span class='oname'>drafted as “" + esc(tm.draftedAs) + "”</span>" : "") + "</td>" +
        "<td class='oname'>" + esc(owners(tm.owners)) + "</td>";
      if (hasRec) {
        var r = tm.record;
        html += r
          ? "<td class='num'>" + r.wins + "-" + r.losses + (r.ties ? "-" + r.ties : "") + "</td>" +
            "<td class='num'>" + fmt(r.pointsFor) + "</td><td class='num'>" + fmt(r.pointsAgainst) + "</td>" +
            "<td class='num'>" + (r.pointsFor - r.pointsAgainst >= 0 ? "+" : "") + fmt(r.pointsFor - r.pointsAgainst) + "</td>" +
            "<td class='num'>" + (tm.playoffSeed || "—") +
              (tm.madePlayoffs ? "" : " <span class='oname' title='missed the playoffs'>·</span>") + "</td>"
          : "<td class='num' colspan='5' style='color:var(--dim)'>—</td>";
      }
      tr.innerHTML = html;
      tb.appendChild(tr);
    });
    t.appendChild(tb); tw.appendChild(t); v.appendChild(tw);
    if (s.standingsNote) v.appendChild(el("p", "note", esc(s.standingsNote)));

    /* draft */
    v.appendChild(el("h2", "", "Draft Board"));
    var picks = DRAFTS[s.year];
    if (!picks || !picks.length) {
      v.appendChild(el("div", "empty", "No draft data recorded for " + s.year + "."));
    } else {
      v.appendChild(draftBoard(s, picks));
      if (s.draftNote) v.appendChild(el("p", "note", esc(s.draftNote)));
    }

    /* photos */
    v.appendChild(el("h2", "", "Draft Photos"));
    v.appendChild(gallery(s.year));

    return v;
  }

  function podCard(kind, ico, label, data) {
    var c = el("div", "card " + kind);
    c.innerHTML = "<div class='ico'>" + ico + "</div><div><div class='lbl'>" + label + "</div>" +
      "<div class='team'>" + (data ? esc(data.team) : "—") + "</div>" +
      "<div class='own'>" + (data ? esc(owners(data.owners)) : "not recorded") + "</div></div>";
    var w = el("div"); w.appendChild(c);
    return c;
  }

  function draftBoard(s, picks) {
    // team column order: prefer explicit draftSlot / boardColumn, else order of first appearance
    var teams = (s.teams || []).slice();
    var ordered = teams.filter(function (t) { return t.draftSlot || t.boardColumn; })
      .sort(function (a, b) { return (a.draftSlot || a.boardColumn) - (b.draftSlot || b.boardColumn); })
      .map(function (t) { return t.name; });
    if (!ordered.length) {
      var seen = [];
      picks.forEach(function (p) { if (seen.indexOf(p.team) < 0) seen.push(p.team); });
      ordered = seen;
    }
    // pick lookup by team+round
    var by = {};
    picks.forEach(function (p) { by[p.team + "|" + p.round] = p; });
    var rounds = Math.max.apply(null, picks.map(function (p) { return p.round; }));

    var wrap = el("div", "board-scroll");
    var t = el("table", "board");
    var head = "<tr><th class='rnd'>Rd</th>" + ordered.map(function (n) {
      return "<th>" + esc(n) + "</th>";
    }).join("") + "</tr>";
    t.innerHTML = "<thead>" + head + "</thead>";
    var tb = el("tbody");
    for (var r = 1; r <= rounds; r++) {
      var tr = el("tr");
      var cells = "<td class='rnd'>" + r + "</td>";
      ordered.forEach(function (n) {
        var p = by[n + "|" + r];
        if (!p) { cells += "<td></td>"; return; }
        var meta = [];
        if (p.overall) meta.push("#" + p.overall);
        if (p.nfl) meta.push(p.nfl);
        cells += "<td><span class='pl'>" +
          (p.pos ? "<span class='pos " + posClass(p.pos) + "'>" + esc(p.pos) + "</span>" : "") +
          esc(p.player) + "</span>" +
          (meta.length ? "<span class='pmeta'>" + esc(meta.join(" · ")) + "</span>" : "") + "</td>";
      });
      tr.innerHTML = cells;
      tb.appendChild(tr);
    }
    t.appendChild(tb); wrap.appendChild(t);
    return wrap;
  }

  /* ----- photos & video ----- */
  var VIDEO_EXT = /\.(mp4|m4v|mov|webm|ogv)$/i;
  function isVideo(f) { return VIDEO_EXT.test(String(f || "")); }

  function gallery(year) {
    var list = PHOTOS[String(year)] || [];
    if (!list.length) {
      return el("div", "empty",
        "Nothing here yet for " + year + ".<br><br>" +
        "Open <a href='add-photos.html'>Add Photos &amp; Videos</a> and drag files in — " +
        "it files them and updates the gallery for you.");
    }
    var g = el("div", "gallery");
    list.forEach(function (p) {
      var src = "photos/" + year + "/" + p.file;
      var alt = p.caption || (year + " draft");
      var f = el("figure");
      if (isVideo(p.file)) {
        f.className = "vid";
        // poster is optional; without it the browser shows the first frame once metadata loads
        f.innerHTML =
          "<div class='thumb'><video preload='metadata' muted playsinline" +
          (p.poster ? " poster='" + esc("photos/" + year + "/" + p.poster) + "'" : "") +
          "><source src='" + esc(src) + "'>Your browser can't play this video.</video>" +
          "<span class='play' aria-hidden='true'>▶</span></div>" +
          (p.caption ? "<figcaption>" + esc(p.caption) + "</figcaption>" : "");
        f.querySelector(".thumb").onclick = function () { lightbox(src, true); };
      } else {
        f.innerHTML = "<img loading='lazy' src='" + esc(src) + "' alt='" + esc(alt) + "'>" +
          (p.caption ? "<figcaption>" + esc(p.caption) + "</figcaption>" : "");
        f.querySelector("img").onclick = function () { lightbox(src, false); };
      }
      g.appendChild(f);
    });
    return g;
  }

  function lightbox(src, video) {
    var lb = $("#lightbox");
    var img = $("#lightbox img"), vid = $("#lightbox video");
    if (video) {
      img.style.display = "none";
      img.removeAttribute("src");
      vid.style.display = "";
      vid.src = src;
      vid.play().catch(function () { /* autoplay may be blocked; controls are there */ });
    } else {
      vid.pause();
      vid.removeAttribute("src");
      vid.style.display = "none";
      img.style.display = "";
      img.src = src;
    }
    lb.classList.add("on");
  }
  function closeLightbox() {
    var lb = $("#lightbox");
    if (!lb) return;
    var vid = $("#lightbox video");
    if (vid) { vid.pause(); }
    lb.classList.remove("on");
  }
  document.addEventListener("click", function (e) {
    var lb = $("#lightbox");
    if (!lb || !lb.classList.contains("on") || !e.target.closest("#lightbox")) return;
    // let people scrub / hit play without the click closing the overlay
    if (e.target.closest("#lightbox video")) return;
    closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });
})();
