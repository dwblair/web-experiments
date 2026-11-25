/* Columns — two-column gallery site. Routes (hash-based, so it works from file://):
 *   #/            every project, cover image + "Title, Year"
 *   #/p/<slug>    one project: title, text, all images
 *   #/about       about, talks, contact
 */
(() => {
  const { site, categories, projects } = window.EC;
  const IM = window.EC_IMAGES || {};
  const ASSETS = "../assets/";

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const bySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const main = $("#main");
  const narrow = matchMedia("(max-width: 760px)");

  // Curated order for the home page.
  const ORDER = [
    "ojo-feliz", "mesh-water-level", "crate-cart", "mobile-workshop", "bike-kitchen",
    "biochar", "newfound-lake", "bike-trailers", "olathe", "co2", "quahog",
    "new-orleans", "wolfes-neck", "mothbot", "vale-da-lama", "belfast-pie", "mead", "maps",
  ];
  const ordered = [
    ...ORDER.map((s) => bySlug[s]).filter(Boolean),
    ...projects.filter((p) => !ORDER.includes(p.slug)),
  ];

  $("#mailLink").href = `mailto:${site.email}`;

  // Marquee: the phrase repeated enough to overfill, then doubled for a seamless loop.
  const phrase = ["OPEN HARDWARE KITS 4 SALE", "•", "EDGECOLLECTIVE.IO/SHOP", "•"];
  const run = Array(4).fill(phrase).flat().map((t) => `<span>${t}</span>`).join("");
  $("#marqueeTrack").innerHTML = run + run;

  /* ---------- Two balanced columns ---------- */

  function img(ref, alt) {
    const m = IM[ref];
    const scale = Math.min(1, 800 / Math.max(m.w, m.h));
    const smW = Math.round(m.w * scale);
    return `<img src="${ASSETS}${m.sm}" srcset="${ASSETS}${m.sm} ${smW}w, ${ASSETS}${m.src} ${m.w}w"
      sizes="(max-width: 760px) 92vw, 36vw" width="${m.w}" height="${m.h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  }

  // cards: [{ ref, html }]. Each card goes to whichever column is shorter so far.
  function columns(cards, captionWeight) {
    const n = narrow.matches ? 1 : 2;
    const cols = Array.from({ length: n }, () => ({ h: 0, html: [] }));
    cards.forEach((c) => {
      const m = IM[c.ref];
      const target = cols.reduce((a, b) => (b.h < a.h - 0.001 ? b : a));
      target.html.push(c.html);
      target.h += m.h / m.w + captionWeight;
    });
    return `<div class="cols${n === 1 ? " one" : ""}">${cols.map((c) => `<div class="col">${c.html.join("")}</div>`).join("")}</div>`;
  }

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
    quickImg.src = ASSETS + IM[qList[qIndex]].src;
    quickImg.alt = `${qTitle}, image ${qIndex + 1}`;
    quickCap.textContent = `${qTitle}, ${qIndex + 1} of ${qList.length}`;
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

  /* ---------- Pages ---------- */

  const thanks = () => `
    <footer class="thanks">
      <div>thank you for visiting edgecollective.io</div>
      <div class="links">${site.links.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>
      <div>&copy; ${esc(site.short)} ${new Date().getFullYear()}</div>
    </footer>`;

  function home() {
    const cards = ordered.filter((p) => IM[p.images[0]]).map((p) => ({
      ref: p.images[0],
      html: `<figure class="card"><a href="#/p/${p.slug}">${img(p.images[0], p.title)}
        <figcaption class="caption">${esc(p.title)}, <span class="nw">${esc(p.year)}</span></figcaption></a></figure>`,
    }));
    main.innerHTML = columns(cards, 0.12) + thanks();
    document.title = site.short;
  }

  function project(slug) {
    const p = bySlug[slug];
    if (!p) return home();
    const i = ordered.indexOf(p);
    const prev = ordered[(i - 1 + ordered.length) % ordered.length];
    const next = ordered[(i + 1) % ordered.length];
    const refs = p.images.filter((r) => IM[r]);
    const cards = refs.map((ref, k) => ({
      ref,
      html: `<figure class="card"><button type="button" data-quick="${k}" aria-label="Open image ${k + 1} of ${refs.length}">${img(ref, `${p.title}, image ${k + 1}`)}</button></figure>`,
    }));
    const meta = [p.with ? `With ${esc(p.with)}.` : "", p.credit ? esc(p.credit) : ""]
      .filter(Boolean).map((t) => `<p class="meta">${t}</p>`).join("");

    main.innerHTML = `
      <article>
        <header class="proj-head">
          <h1>${esc(p.title)}</h1>
          <div class="info-caption">${esc(p.year)} – ${esc(p.kind || catById[p.category].label)}</div>
        </header>
        <div class="bodycopy">
          ${p.text.map((t) => `<p>${esc(t)}</p>`).join("")}
          ${meta}
          <p><a href="${esc(p.href)}" target="_blank" rel="noopener">Read the full notes</a></p>
        </div>
        ${columns(cards, 0.06)}
        <nav class="proj-nav" aria-label="More projects">
          <a href="#/p/${prev.slug}">&larr; ${esc(prev.title)}</a>
          <a class="next" href="#/p/${next.slug}">${esc(next.title)} &rarr;</a>
        </nav>
      </article>` + thanks();
    main.querySelectorAll("[data-quick]").forEach((b) =>
      b.addEventListener("click", () => openQuick(refs, +b.dataset.quick, p.title))
    );
    document.title = `${p.title} — ${site.short}`;
  }

  function about() {
    const work = categories.map((c) => `
      <section>
        <h2>${esc(c.label)}</h2>
        <ul class="work">${projects.filter((p) => p.category === c.id)
          .map((p) => `<li><a href="#/p/${p.slug}">${esc(p.title)}</a> <span class="muted">– ${esc(p.kind)}, ${esc(p.year)}</span></li>`).join("")}</ul>
      </section>`).join("");

    main.innerHTML = `
      <div class="about">
        <p class="lede">${esc(site.about[0])}</p>
        <section><h2>About</h2><div>${site.about.slice(1).map((t) => `<p>${esc(t)}</p>`).join("")}</div></section>
        <section><h2>Recently</h2><ul>${site.focus.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></section>
        ${work}
        <section><h2>Talks and Events</h2><ul>${site.talks.map((t) =>
          `<li><a href="${esc(t.href)}" target="_blank" rel="noopener">${esc(t.title)}</a> <span class="muted">– ${esc(t.where)}, ${esc(t.year)}</span></li>`).join("")}</ul></section>
        <section><h2>Shop</h2><div><p>Open hardware kits, assembled or as bare boards: ${site.kits.map(esc).join(", ")}.</p>
          <p><a href="https://edgecollective.io/shop/" target="_blank" rel="noopener">edgecollective.io/shop</a></p></div></section>
        <section><h2>Mail</h2><p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p></section>
        <section><h2>Elsewhere</h2><ul>${site.links.map((l) =>
          `<li><a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join("")}</ul></section>
      </div>` + thanks();
    document.title = `about — ${site.short}`;
  }

  /* ---------- Router ---------- */

  function render() {
    const [kind, arg] = location.hash.replace(/^#\/?/, "").split("/");
    if (kind === "p") project(arg);
    else if (kind === "about") about();
    else home();
    document.querySelectorAll(".top [data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === kind));
  }

  function route() {
    closeQuick();
    render();
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  narrow.addEventListener("change", render); // 1 <-> 2 columns without losing scroll
  route();
})();
