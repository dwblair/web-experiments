/* Collage — freeform gallery site. Routes (hash-based, so it works from file://):
 *   #/            overview: a couple of images from every project
 *   #/c/<id>      one category
 *   #/p/<slug>    one project (images open in the quick view)
 *   #/index       project index
 *   #/info        about
 */
(() => {
  const { site, categories, projects } = window.EC;
  const IM = window.EC_IMAGES || {};
  const ASSETS = "../assets/";

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const bySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const inCat = (id) => projects.filter((p) => p.category === id);

  const main = $("#main");
  const nav = $("#nav");
  const sideLabel = $("#sideLabel");
  const sideFoot = $("#sideFoot");

  // Curated order for the overview, mixing categories so the collage varies.
  const OVERVIEW = [
    "ojo-feliz", "crate-cart", "newfound-lake", "bike-kitchen", "mesh-water-level",
    "olathe", "mobile-workshop", "quahog", "biochar", "wolfes-neck", "bike-trailers",
    "co2", "new-orleans", "vale-da-lama", "mead", "mothbot", "belfast-pie", "maps",
  ];

  const FROM = {
    projects: "From the project",
    field: "From the field notes",
    hardware: "From the prototype",
    workshops: "From",
  };

  /* ---------- Seeded randomness, so each page always lays out the same way ---------- */

  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Freeform collage ---------- */

  // Decide each item's width and a few candidate horizontal positions
  // (all in % of container width). placeY() later picks whichever candidate
  // lets the item sit highest, once caption heights are known.
  function planColumns(items, seed) {
    const r = seeded(seed);
    let side = r() < 0.5 ? 0 : 1;
    return items.map((it) => {
      const portrait = it.ar > 1.1;
      let w = portrait ? 16 + r() * 18 : 22 + r() * 26;
      if (r() < 0.14) w = 50 + r() * 12; // the occasional big one
      if (it.captioned) w = Math.max(w, 30);
      if (w * it.ar > 52) w = 52 / it.ar; // keep tall images from towering
      const room = 100 - w;
      const left = r() * room * 0.3;
      const right = room - r() * room * 0.3;
      const mid = room * (0.3 + r() * 0.4);
      if (r() < 0.75) side ^= 1; // usually alternate sides
      const xs = side === 0 ? [left, mid, right] : [right, mid, left];
      return { w, xs, drift: 4 + r() * 12 };
    });
  }

  // Skyline placement: each item goes as high as it can without colliding,
  // but never above the previous item plus a little drift (keeps reading order).
  function placeY(plan, heights) {
    const placed = [];
    let prevY = 0;
    plan.forEach((p, i) => {
      const floor = i === 0 ? 0 : prevY + p.drift;
      let best = null;
      for (const x of p.xs) {
        let y = floor;
        for (const q of placed) {
          if (x < q.x + q.w + 3 && x + p.w + 3 > q.x) y = Math.max(y, q.y + q.h + 5);
        }
        if (!best || y < best.y - 1) best = { x, y };
      }
      placed.push({ x: best.x, y: best.y, w: p.w, h: heights[i] });
      prevY = best.y;
    });
    const total = placed.reduce((m, q) => Math.max(m, q.y + q.h), 0) + 2;
    return { placed, total };
  }

  function imgTag(ref, alt, widthPct) {
    const m = IM[ref];
    if (!m) return "";
    const scale = Math.min(1, 800 / Math.max(m.w, m.h));
    const smW = Math.round(m.w * scale);
    const vw = Math.max(20, Math.round(widthPct * 0.8));
    return `<img src="${ASSETS}${m.sm}" srcset="${ASSETS}${m.sm} ${smW}w, ${ASSETS}${m.src} ${m.w}w"
      sizes="(max-width: 760px) 100vw, ${vw}vw" width="${m.w}" height="${m.h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  }

  // items: [{ ref, alt, href?, caption?, index? }]
  function collage(items, seed) {
    const usable = items.filter((it) => IM[it.ref]);
    const plan = planColumns(
      usable.map((it) => ({ ar: IM[it.ref].h / IM[it.ref].w, captioned: !!it.caption })),
      seed
    );
    const figs = usable
      .map((it, i) => {
        const ph = it.href
          ? `<a class="ph" href="${it.href}">${imgTag(it.ref, it.alt, plan[i].w)}</a>`
          : `<button class="ph" data-quick="${it.index}" aria-label="Open image ${it.index + 1}">${imgTag(it.ref, it.alt, plan[i].w)}</button>`;
        const cap = it.caption ? `<figcaption class="caption">${it.caption}</figcaption>` : "";
        return `<figure class="ff-item" style="--w:${plan[i].w.toFixed(2)};--x:0;--y:0">${ph}${cap}</figure>`;
      })
      .join("");

    const wrap = document.createElement("div");
    wrap.className = "ff";
    wrap.innerHTML = `<div class="ff-box" style="--h:0">${figs}</div>`;
    const box = wrap.firstElementChild;
    const figEls = [...box.children];

    let lastWidth = 0;
    const relayout = () => {
      const cw = wrap.clientWidth;
      if (!cw || cw === lastWidth) return;
      lastWidth = cw;
      const unit = cw / 100;
      const heights = figEls.map((fig, i) => {
        const m = IM[usable[i].ref];
        const capEl = fig.querySelector("figcaption");
        const capH = capEl ? (capEl.offsetHeight + parseFloat(getComputedStyle(capEl).marginTop)) / unit : 0;
        return plan[i].w * (m.h / m.w) + capH;
      });
      const { placed, total } = placeY(plan, heights);
      figEls.forEach((fig, i) => {
        fig.style.setProperty("--x", placed[i].x.toFixed(2));
        fig.style.setProperty("--y", placed[i].y.toFixed(2));
      });
      box.style.setProperty("--h", total.toFixed(2));
    };
    new ResizeObserver(relayout).observe(wrap);
    return wrap;
  }

  /* ---------- Scroll reveal ---------- */

  const reveal = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        reveal.unobserve(e.target);
      }
    }),
    { rootMargin: "0px 0px -6% 0px" }
  );
  const observeItems = () => main.querySelectorAll(".ff-item").forEach((el) => reveal.observe(el));

  /* ---------- Quick view ---------- */

  const quick = $("#quick");
  const quickImg = $("#quickImg");
  const quickCap = $("#quickCap");
  let qList = [];
  let qIndex = 0;
  let qTitle = "";

  function openQuick(list, i, title) {
    qList = list;
    qTitle = title;
    showQuick(i);
    quick.hidden = false;
    document.body.style.overflow = "hidden";
    $("#quickClose").focus({ preventScroll: true });
  }
  function showQuick(i) {
    qIndex = (i + qList.length) % qList.length;
    const m = IM[qList[qIndex]];
    quickImg.src = ASSETS + m.src;
    quickImg.alt = `${qTitle}, image ${qIndex + 1}`;
    quickCap.textContent = `${qTitle} — ${qIndex + 1} / ${qList.length}`;
  }
  function closeQuick() {
    if (quick.hidden) return;
    quick.hidden = true;
    document.body.style.overflow = "";
    const back = main.querySelector(`[data-quick="${qIndex}"]`);
    if (back) back.focus({ preventScroll: true });
  }
  quickImg.addEventListener("click", () => showQuick(qIndex + 1));
  $("#quickPrev").addEventListener("click", () => showQuick(qIndex - 1));
  $("#quickNext").addEventListener("click", () => showQuick(qIndex + 1));
  $("#quickClose").addEventListener("click", closeQuick);
  quick.addEventListener("click", (e) => { if (e.target === quick) closeQuick(); });
  document.addEventListener("keydown", (e) => {
    if (quick.hidden) return;
    if (e.key === "Escape") closeQuick();
    if (e.key === "ArrowRight") showQuick(qIndex + 1);
    if (e.key === "ArrowLeft") showQuick(qIndex - 1);
  });

  /* ---------- Chrome: nav, labels, footer ---------- */

  nav.innerHTML =
    categories.map((c) => `<a href="#/c/${c.id}" data-nav="${c.id}">${esc(c.label)}</a>`).join("") +
    `<a href="#/info" data-nav="info">Info</a>`;

  function setChrome({ active = "", label = "", foot = "" }) {
    nav.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.dataset.nav === active));
    sideLabel.innerHTML = label;
    sideFoot.innerHTML = foot;
  }

  const indexLink = `<a class="u" href="#/index">Project Index</a>`;
  const pageFoot = (extra = "") =>
    `<div class="page-foot">${extra}<button type="button" data-top>&uarr; Back to Top</button></div>`;

  /* ---------- Pages ---------- */

  function overview() {
    const items = [];
    OVERVIEW.map((s) => bySlug[s]).filter(Boolean).forEach((p) => {
      p.images.slice(0, 2).forEach((ref, i) => {
        items.push({
          ref,
          alt: p.title,
          href: `#/p/${p.slug}`,
          caption: i === 0 ? `${FROM[p.category]} <i><a href="#/p/${p.slug}">${esc(p.title)}</a></i>` : "",
        });
      });
    });
    main.replaceChildren(collage(items, "overview"));
    main.insertAdjacentHTML("beforeend", pageFoot());
    setChrome({ foot: `<span class="what">Overview</span>${indexLink}` });
    document.title = site.name;
  }

  function category(id) {
    const cat = catById[id];
    if (!cat) return overview();
    const items = [];
    inCat(id).forEach((p) => {
      p.images.slice(0, 3).forEach((ref, i) => {
        items.push({
          ref,
          alt: p.title,
          href: `#/p/${p.slug}`,
          caption: i === 0 ? `<i><a href="#/p/${p.slug}">${esc(p.title)}</a></i>, <span class="nw">${esc(p.year)}</span>` : "",
        });
      });
    });
    main.replaceChildren(collage(items, `cat-${id}`));
    main.insertAdjacentHTML("beforeend", pageFoot());
    setChrome({ active: id, foot: `<span class="what">${esc(cat.label)} Overview</span>${indexLink}` });
    document.title = `${cat.label} — ${site.name}`;
  }

  function project(slug) {
    const p = bySlug[slug];
    if (!p) return overview();
    const cat = catById[p.category];
    const label = `<div class="t"><i>${esc(p.title)},</i> <span class="nw">${esc(p.year)}</span></div><p>${esc(p.text[0])}</p>`;

    const items = p.images.map((ref, i) => ({ ref, alt: `${p.title}, image ${i + 1}`, index: i }));
    const rest = p.text.slice(1).map((t) => `<p>${esc(t)}</p>`).join("");
    const meta = [
      p.with ? `With ${esc(p.with)}.` : "",
      p.credit ? esc(p.credit) : "",
    ].filter(Boolean).map((t) => `<p class="meta">${t}</p>`).join("");

    main.innerHTML = `<div class="mobile-label">${label}</div>`;
    main.append(collage(items, `p-${slug}`));
    main.insertAdjacentHTML(
      "beforeend",
      `<div class="prose project-text">${rest}${meta}
        <p><a href="${esc(p.href)}" target="_blank" rel="noopener">Full notes on edgecollective.io &nearr;</a></p></div>` +
      pageFoot(`<a href="#/c/${cat.id}">&larr; Back to ${esc(cat.label)}</a>`)
    );
    main.querySelectorAll("[data-quick]").forEach((b) =>
      b.addEventListener("click", () => openQuick(p.images.filter((r) => IM[r]), +b.dataset.quick, p.title))
    );
    setChrome({ active: p.category, label, foot: indexLink });
    document.title = `${p.title} — ${site.name}`;
  }

  function index() {
    const groups = categories.map((c) => `
      <section><h2>${esc(c.label)}</h2>
        ${inCat(c.id).map((p) => `<a href="#/p/${p.slug}">${esc(p.title)}<span class="yr">, <span class="nw">${esc(p.year)}</span></span></a>`).join("")}
      </section>`).join("");
    main.innerHTML = `<div class="index-list">${groups}</div>` +
      `<div class="page-foot"><a href="#/">&larr; Back</a></div>`;
    setChrome({ foot: `<span class="what">Project Index</span>` });
    document.title = `Project Index — ${site.name}`;
  }

  function info() {
    const li = (arr) => `<ul>${arr.join("")}</ul>`;
    main.innerHTML = `
      <div class="prose">
        <h1 class="headline">${esc(site.name)}</h1>
        ${site.about.map((t) => `<p>${esc(t)}</p>`).join("")}
        <h2>Recently</h2>
        ${li(site.focus.map((f) => `<li>${esc(f)}</li>`))}
        <h2>Talks</h2>
        ${li(site.talks.map((t) => `<li><a href="${esc(t.href)}" target="_blank" rel="noopener">${esc(t.title)}</a> <span class="muted">— ${esc(t.where)}, ${esc(t.year)}</span></li>`))}
        <h2>Kits in the shop</h2>
        ${li(site.kits.map((k) => `<li>${esc(k)}</li>`))}
        <h2>Contact</h2>
        <p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
        <h2>Elsewhere</h2>
        ${li(site.links.map((l) => `<li><a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`))}
      </div>` + pageFoot();
    setChrome({ active: "info", foot: indexLink });
    document.title = `Info — ${site.name}`;
  }

  /* ---------- Router ---------- */

  function route() {
    closeQuick();
    document.body.classList.remove("menu-open");
    $("#menuBtn").setAttribute("aria-expanded", "false");
    $("#menuBtn").textContent = "Menu";

    const [kind, arg] = location.hash.replace(/^#\/?/, "").split("/");
    if (kind === "p") project(arg);
    else if (kind === "c") category(arg);
    else if (kind === "index") index();
    else if (kind === "info") info();
    else overview();

    window.scrollTo(0, 0);
    observeItems();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-top]")) window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#menuBtn").addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    $("#menuBtn").setAttribute("aria-expanded", String(open));
    $("#menuBtn").textContent = open ? "Close" : "Menu";
  });

  window.addEventListener("hashchange", route);
  route();
})();
