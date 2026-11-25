/* Field Days — upcoming schedule, a "today" line, then past days as a photo timeline.
 * Reads window.EC (content.js) and window.EC_IMAGES (images.js).
 */
(() => {
  const { site, schedule, categories, projects } = window.EC;
  const IM = window.EC_IMAGES || {};
  const ASSETS = document.body.dataset.content || "../";

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const main = $("#main");
  const narrow = matchMedia("(max-width: 760px)");
  const catLabel = Object.fromEntries(categories.map((c) => [c.id, c.label]));

  /* ---------- Dates ---------- */

  const parse = (iso) => new Date(`${iso}T12:00:00`);
  const fmt = (iso, opts) => parse(iso).toLocaleDateString("en-US", opts);
  const dateBlock = (iso) => `
    <div class="date" aria-label="${esc(fmt(iso, { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}">
      <span class="d" aria-hidden="true">${fmt(iso, { day: "2-digit" })}</span>
      <span class="wm" aria-hidden="true">${fmt(iso, { weekday: "short" })}<br>${fmt(iso, { month: "short" })}</span>
    </div>`;

  /* ---------- Chrome ---------- */

  $("#mailLink").href = `mailto:${site.email}`;
  $("#homeLink").textContent = site.short;
  const mq = site.marquee;
  $("#marquee").href = mq.href;
  $("#marquee").setAttribute("aria-label", mq.label || mq.items.join(" — "));
  const run = Array(4).fill(mq.items.flatMap((t) => [t, "•"])).flat().map((t) => `<span>${esc(t)}</span>`).join("");
  $("#marqueeTrack").innerHTML = run + run;

  /* ---------- Photo columns (same balancing as the columns page) ---------- */

  function img(ref, alt) {
    const m = IM[ref];
    const scale = Math.min(1, 800 / Math.max(m.w, m.h));
    return `<img src="${ASSETS}${m.sm}" srcset="${ASSETS}${m.sm} ${Math.round(m.w * scale)}w, ${ASSETS}${m.src} ${m.w}w"
      sizes="(max-width: 760px) 92vw, 28vw" width="${m.w}" height="${m.h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  }

  function photoColumns(refs, title, dayIndex) {
    const n = narrow.matches ? 1 : 2;
    const cols = Array.from({ length: n }, () => ({ h: 0, html: [] }));
    refs.forEach((ref, k) => {
      const m = IM[ref];
      const target = cols.reduce((a, b) => (b.h < a.h - 0.001 ? b : a));
      target.html.push(`<figure class="card"><button type="button" data-day="${dayIndex}" data-k="${k}"
        aria-label="Open photo ${k + 1} of ${refs.length}">${img(ref, `${title}, photo ${k + 1}`)}</button></figure>`);
      target.h += m.h / m.w + 0.06;
    });
    return `<div class="cols${n === 1 ? " one" : ""}">${cols.map((c) => `<div class="col">${c.html.join("")}</div>`).join("")}</div>`;
  }

  /* ---------- Page ---------- */

  const past = projects
    .filter((p) => p.date && (p.category === "fielddays" || p.category === "events") && p.date < schedule.today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const dayRefs = past.map((p) => p.images.filter((r) => IM[r]));

  function render() {
    const rows = schedule.upcoming.map((u) => `
      <li class="row">
        ${dateBlock(u.date)}
        <div>
          <div class="title">${esc(u.title)}</div>
          ${u.blurb ? `<p class="blurb">${esc(u.blurb)}</p>` : ""}
        </div>
        <div class="place">${esc(u.place)}</div>
        <div class="time">${esc(u.time)}</div>
        <a class="go" href="${esc(schedule.registerHref)}" target="_blank" rel="noopener"
           aria-label="Register for ${esc(u.title)}, ${esc(fmt(u.date, { month: "long", day: "numeric" }))}">Register <span>&rarr;</span></a>
      </li>`).join("");

    let lastYear = "";
    const days = past.map((p, i) => {
      const year = p.date.slice(0, 4);
      let head = "";
      if (year !== lastYear) {
        const kinds = [...new Set(past.filter((q) => q.date.startsWith(year)).map((q) => catLabel[q.category]))];
        head = `<h2 class="year">${year}<small>${esc(kinds.join(" & "))}</small></h2>`;
        lastYear = year;
      }
      const refs = dayRefs[i];
      return `${head}
        <article class="day" id="${esc(p.slug)}">
          <div class="day-label">
            ${dateBlock(p.date)}
            <h2>${esc(p.title)}</h2>
            <p class="where">${esc(p.kind)}${p.place ? ` · ${esc(p.place)}` : ""}</p>
            <p>${esc(p.text[0])}</p>
            <p class="count">${refs.length} photos &middot; <a class="more" href="${esc(p.href)}" target="_blank" rel="noopener">${esc(site.moreLabel || "Read more")}</a></p>
          </div>
          ${photoColumns(refs, p.title, i)}
        </article>`;
    }).join("");

    const todayLabel = fmt(schedule.today, { weekday: "long", month: "long", day: "numeric" });

    main.innerHTML = `
      <section class="fd-hero">
        <h1>${esc(schedule.title)}</h1>
        <p>${esc(schedule.lede)}</p>
      </section>

      <section aria-label="Upcoming Field Days">
        <div class="kicker"><span>Upcoming</span><span>${esc(schedule.season)}</span></div>
        <ol class="rows">${rows}</ol>
      </section>

      <div class="today" role="separator"><span class="dot" aria-hidden="true"></span>Today &middot; ${esc(todayLabel)}</div>

      <section aria-label="Past Field Days">${days}</section>

      <footer class="thanks">
        <div>thank you for visiting ${esc(site.domain)}</div>
        <div class="links">${site.links.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>
        <div>&copy; ${esc(site.short)} ${new Date().getFullYear()}</div>
      </footer>`;

    main.querySelectorAll("[data-day]").forEach((b) =>
      b.addEventListener("click", () => openQuick(+b.dataset.day, +b.dataset.k))
    );
  }

  /* ---------- Quick view ---------- */

  const quick = $("#quick");
  const quickImg = $("#quickImg");
  const quickCap = $("#quickCap");
  let qDay = 0, qIndex = 0;

  function openQuick(day, k) {
    qDay = day;
    showQuick(k);
    quick.hidden = false;
    document.body.style.overflow = "hidden";
    $("#quickClose").focus({ preventScroll: true });
  }
  function showQuick(k) {
    const refs = dayRefs[qDay];
    qIndex = (k + refs.length) % refs.length;
    quickImg.src = ASSETS + IM[refs[qIndex]].src;
    quickImg.alt = `${past[qDay].title}, photo ${qIndex + 1}`;
    quickCap.textContent = `${past[qDay].title}, ${qIndex + 1} of ${refs.length}`;
  }
  function closeQuick() {
    if (quick.hidden) return;
    quick.hidden = true;
    document.body.style.overflow = "";
    const back = main.querySelector(`[data-day="${qDay}"][data-k="${qIndex}"]`);
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

  narrow.addEventListener("change", render);
  render();
})();
