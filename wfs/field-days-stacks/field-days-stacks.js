/* Field Days, stacks variant.
 *  - Upcoming rows get a square thumbnail sized to the title + blurb beside it.
 *  - Each past day shows one photo, drawn as the top of a small stack of prints.
 *  - Clicking a stack grows that photo into a full-screen, swipeable gallery of the day
 *    (View Transitions where supported, otherwise a plain cut).
 */
(() => {
  const { site, schedule, projects } = window.EC;
  const IM = window.EC_IMAGES || {};
  const ASSETS = document.body.dataset.content || "../";

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const main = $("#main");
  const narrow = matchMedia("(max-width: 760px)");
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  const sm = (ref) => ASSETS + IM[ref].sm;
  const full = (ref) => ASSETS + IM[ref].src;

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

  /* ---------- Data ---------- */

  const past = projects
    .filter((p) => p.date && (p.category === "fielddays" || p.category === "events") && p.date < schedule.today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const dayRefs = past.map((p) => p.images.filter((r) => IM[r]));

  // A loose rhythm for the single photos: varying widths, alternating sides.
  const WIDTHS = ["100%", "80%", "92%", "72%", "96%", "84%"];

  /* ---------- Render ---------- */

  function render() {
    const rows = schedule.upcoming.map((u) => {
      const has = u.image && IM[u.image];
      return `
      <li><a class="row" href="${esc(schedule.registerHref)}" target="_blank" rel="noopener"
             aria-label="${esc(`${u.title}, ${fmt(u.date, { weekday: "long", month: "long", day: "numeric" })}, ${u.place}, ${u.time} — register`)}">
        ${dateBlock(u.date)}
        <span class="thumb" aria-hidden="true">${has ? `<img src="${esc(sm(u.image))}" alt="" loading="lazy" decoding="async">` : ""}</span>
        <div class="txt">
          <div class="title">${esc(u.title)}</div>
          ${u.blurb ? `<p class="blurb">${esc(u.blurb)}</p>` : ""}
          <p class="meta-m">${esc(u.place)} &middot; <span class="nw">${esc(u.time)}</span></p>
        </div>
        <div class="place">${esc(u.place)}</div>
        <div class="time">${esc(u.time)}</div>
      </a></li>`;
    }).join("");

    let lastYear = "";
    const entries = past.map((p, i) => {
      const refs = dayRefs[i];
      const year = p.date.slice(0, 4);
      let head = "";
      if (year !== lastYear) {
        head = `<h2 class="year">${year}<small>Journal</small></h2>`;
        lastYear = year;
      }
      const [a, b, c] = refs;
      const m = IM[a];
      const scale = Math.min(1, 800 / Math.max(m.w, m.h));
      const behind = (ref, cls) => ref ? `<span class="print ${cls}" aria-hidden="true"><img src="${esc(sm(ref))}" alt="" loading="lazy" decoding="async"></span>` : "";
      return `${head}
        <article class="entry" id="${esc(p.slug)}">
          <div class="day-label">
            ${dateBlock(p.date)}
            <h2>${esc(p.title)}</h2>
            <p class="where">${esc(p.kind)}${p.place ? ` · ${esc(p.place)}` : ""}</p>
            <p>${esc(p.text[0])}</p>
            <p class="links">
              <button class="open" type="button" data-day="${i}">View all ${refs.length} photos</button>
              <a class="more" href="${esc(p.href)}" target="_blank" rel="noopener">${esc(site.moreLabel || "Read more")}</a>
            </p>
          </div>
          <div class="stack-wrap" style="--align:${i % 2 ? "flex-end" : "flex-start"}">
            <button class="stack" type="button" data-day="${i}" style="--w:${WIDTHS[i % WIDTHS.length]};--arw:${m.w};--arh:${m.h}"
                    aria-label="Open ${refs.length} photos from ${esc(p.title)}">
              ${behind(c, "p3")}${behind(b, "p2")}
              <span class="print p1"><img src="${esc(sm(a))}" srcset="${esc(sm(a))} ${Math.round(m.w * scale)}w, ${esc(full(a))} ${m.w}w"
                sizes="(max-width: 760px) 92vw, 50vw" width="${m.w}" height="${m.h}" alt="${esc(p.title)}" loading="lazy" decoding="async"></span>
              <span class="badge">${refs.length} photos</span>
            </button>
          </div>
        </article>`;
    }).join("");

    main.innerHTML = `
      <section class="fd-hero">
        <h1>${esc(schedule.title)}</h1>
        <p>${esc(schedule.lede)}</p>
      </section>

      <section aria-label="Upcoming Field Days">
        <div class="kicker"><span>Upcoming</span><span>${esc(schedule.season)}</span></div>
        <ol class="rows">${rows}</ol>
      </section>

      <section aria-label="Past Field Days">${entries}</section>

      <footer class="thanks">
        <div>thank you for visiting ${esc(site.domain)}</div>
        <div class="links">${site.links.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>
        <div>&copy; ${esc(site.short)} ${new Date().getFullYear()}</div>
      </footer>`;

    main.querySelectorAll("[data-day]").forEach((el) =>
      el.addEventListener("click", () => openGallery(+el.dataset.day, el))
    );
    sizeThumbs();
  }

  /* ---------- Square thumbnails, sized from the text beside them ---------- */

  const THUMB_SCALE = 1.65; // 65% taller than the title + blurb
  const thumbObserver = new ResizeObserver((entries) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const cap = (narrow.matches ? 5.4 : 9) * rem * THUMB_SCALE;
    entries.forEach((e) => {
      const row = e.target.closest(".row");
      const h = Math.round(Math.min(e.target.offsetHeight * THUMB_SCALE, cap));
      row.style.setProperty("--t", `${h}px`);
    });
  });
  function sizeThumbs() {
    thumbObserver.disconnect();
    main.querySelectorAll(".row .txt").forEach((t) => thumbObserver.observe(t));
  }

  /* ---------- Gallery ---------- */

  const gal = $("#gal");
  const track = $("#galTrack");
  const strip = $("#galStrip");
  const count = $("#galCount");
  let gDay = -1, gIndex = 0, gOpener = null, scrollRaf = 0;

  const canMorph = () => typeof document.startViewTransition === "function" && !calm.matches;
  const heroOf = (day) => main.querySelector(`.stack[data-day="${day}"] .p1 img`);

  function fillGallery(day) {
    const p = past[day];
    const refs = dayRefs[day];
    $("#galTitle").innerHTML = `${esc(p.title)} <span>&middot; ${esc(fmt(p.date, { month: "short", day: "numeric", year: "numeric" }))}</span>`;
    track.innerHTML = refs.map((ref, k) => `
      <figure class="gal-slide" aria-roledescription="slide" aria-label="${k + 1} of ${refs.length}">
        <img style="--ar:${IM[ref].w}/${IM[ref].h}" src="${esc(k === 0 ? (heroOf(day)?.currentSrc || sm(ref)) : full(ref))}"
             alt="${esc(p.title)}, photo ${k + 1}" ${k > 1 ? 'loading="lazy"' : ""} decoding="async">
      </figure>`).join("");
    strip.innerHTML = refs.map((ref, k) => `
      <button type="button" data-k="${k}" aria-label="Photo ${k + 1}"><img src="${esc(sm(ref))}" alt="" loading="lazy"></button>`).join("");
    strip.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => go(+b.dataset.k)));
  }

  function setIndex(k) {
    gIndex = k;
    const n = dayRefs[gDay].length;
    count.textContent = `${k + 1} / ${n}`;
    $("#galPrev").disabled = k === 0;
    $("#galNext").disabled = k === n - 1;
    strip.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-current", String(i === k)));
    strip.children[k]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function go(k, smooth = !calm.matches) {
    const n = dayRefs[gDay].length;
    k = Math.max(0, Math.min(n - 1, k));
    track.scrollTo({ left: k * track.clientWidth, behavior: smooth ? "smooth" : "auto" });
    setIndex(k);
  }

  track.addEventListener("scroll", () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      const k = Math.round(track.scrollLeft / track.clientWidth);
      if (k !== gIndex) setIndex(k);
    });
  }, { passive: true });

  // Opening pushes "#<slug>" so links are shareable and Back closes the gallery.
  // The photo only "grows" into the gallery after a click; links and Back just cut to it.
  async function openGallery(day, opener, start = 0, push = true, morph = push) {
    if (!gal.hidden) return;
    gDay = day;
    gOpener = opener || heroOf(day)?.closest(".stack");
    if (push) history.pushState({ gal: true }, "", `#${past[day].slug}`);
    const hero = morph && start === 0 ? heroOf(day) : null;

    const show = async () => {
      fillGallery(day);
      gal.hidden = false;
      document.documentElement.style.overflow = "hidden";
      track.scrollLeft = start * track.clientWidth;
      setIndex(start);
      const first = track.querySelector("img");
      if (hero) hero.style.viewTransitionName = "";
      if (first) {
        first.style.viewTransitionName = "hero";
        try { await first.decode(); } catch (e) { /* show it anyway */ }
      }
    };

    if (canMorph() && hero) {
      hero.style.viewTransitionName = "hero";
      await document.startViewTransition(show).finished.catch(() => {});
    } else {
      await show();
    }
    if (start) go(start, false);
    // Swap the first slide up to full resolution once it's on screen.
    const first = track.querySelector("img");
    if (first) {
      first.style.viewTransitionName = "";
      const ref = dayRefs[day][0];
      if (!first.src.endsWith(IM[ref].src)) first.src = full(ref);
    }
    $("#galClose").focus({ preventScroll: true });
  }

  // UI close: step back through history if we pushed an entry, so Back stays in sync.
  function closeGallery() {
    if (gal.hidden) return;
    if (history.state && history.state.gal) history.back();
    else { history.replaceState(null, "", location.pathname + location.search); doClose(); }
  }

  async function doClose() {
    if (gal.hidden) return;
    const hero = heroOf(gDay);
    const current = track.children[gIndex]?.querySelector("img");
    const morphBack = canMorph() && hero && gIndex === 0 && current;

    const hide = () => {
      if (current) current.style.viewTransitionName = "";
      gal.hidden = true;
      document.documentElement.style.overflow = "";
      if (morphBack) hero.style.viewTransitionName = "hero";
    };

    if (canMorph()) {
      if (morphBack) current.style.viewTransitionName = "hero";
      await document.startViewTransition(hide).finished.catch(() => {});
      if (hero) hero.style.viewTransitionName = "";
    } else {
      hide();
    }
    track.innerHTML = "";
    strip.innerHTML = "";
    if (gOpener) gOpener.focus({ preventScroll: true });
  }

  $("#galClose").addEventListener("click", closeGallery);
  $("#galPrev").addEventListener("click", () => go(gIndex - 1));
  $("#galNext").addEventListener("click", () => go(gIndex + 1));
  track.addEventListener("click", (e) => {
    // Click the photo itself to advance; click the empty margin around it to close.
    if (e.target.tagName === "IMG") go(gIndex + 1 < dayRefs[gDay].length ? gIndex + 1 : 0);
    else closeGallery();
  });
  document.addEventListener("keydown", (e) => {
    if (gal.hidden) return;
    if (e.key === "Escape") closeGallery();
    else if (e.key === "ArrowRight") { e.preventDefault(); go(gIndex + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(gIndex - 1); }
    else if (e.key === "Tab") {
      // keep focus inside the dialog
      const f = [...gal.querySelectorAll("button:not([disabled])")];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  addEventListener("resize", () => { if (!gal.hidden) go(gIndex, false); });

  // "#slug" or "#slug/3" opens that day's gallery (photo 3).
  function fromHash() {
    const [slug, n] = decodeURIComponent(location.hash.slice(1)).split("/");
    const day = past.findIndex((p) => p.slug === slug);
    return day < 0 ? null : { day, k: Math.max(0, Math.min(dayRefs[day].length - 1, (parseInt(n, 10) || 1) - 1)) };
  }
  addEventListener("popstate", () => {
    const want = fromHash();
    if (!want) doClose();
    else if (gal.hidden) openGallery(want.day, null, want.k, false);
  });

  narrow.addEventListener("change", render);
  render();
  const initial = fromHash();
  if (initial) openGallery(initial.day, null, initial.k, false);
})();
