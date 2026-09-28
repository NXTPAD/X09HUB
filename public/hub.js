/* X09 Hub — orbit system, destinations, Ask X09 and the X09 ID section */
(() => {
  "use strict";

  /* ------------------------------------------------------------------
     DESTINATIONS — edit to add or change where the Hub points.
     `product` links a destination to its plans in the shared X09 catalog.
     ------------------------------------------------------------------ */
  const DESTINATIONS = [
    { id: "ai", product: "ai", name: "X09 AI", host: "ai.x09hub.com", url: "https://ai.x09hub.com", live: true,
      blurb: "Your AI co-pilot. Ask anything, plan, write, code and analyze. Fast mode runs on Claude Haiku, Deep mode on Claude Sonnet.",
      tags: ["Claude Haiku + Sonnet", "Synced chats", "Fast & Deep"],
      feats: ["<b>Fast</b> answers in seconds", "<b>Deep</b> mode for the hard stuff", "Chats saved to your X09 account"] },
    { id: "docs", product: "docs", name: "X09 Docs", host: "docs.x09hub.com", url: "https://docs.x09hub.com", live: true,
      blurb: "AI invoices, estimates, proposals, quotes and contracts. Describe the job and X09 drafts it. Clients view, download and e-sign.",
      tags: ["Invoices", "Estimates", "Proposals", "Contracts", "E-sign"],
      feats: ["<b>AI drafts</b> from one sentence", "<b>E-signature</b> + PDF + client links", "Convert estimates to invoices"] },
    { id: "o3", name: "Orbit 03", host: "Reserved", url: null, live: false,
      blurb: "An open orbit for the next X09 app. Same account, same bill, when it lands.",
      tags: ["Coming soon"], feats: ["Uses your X09 account", "Shows up in the app switcher", "Plans on the same bill"] },
  ];
  const SAME_TAB = true;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  let catalog = [];
  let selected = 0;

  const space = X09Space.start({ density: 1.1, opacity: 1 });
  X09.init({ site: "hub", onUser: renderUser });

  /* ================= Orbit system (Newtonian gravity on an inclined plane) ================= */
  const stage = $("stage"), cv = $("orbit"), g = cv.getContext("2d");
  stage.classList.add("no-space");
  const TILT = 0.46;                 // how flat the orbital plane looks (1 = seen from above)
  let S = 0, DPR = 1, C = 0, Rp = 0, GM = 0;
  const worlds = DESTINATIONS.map((d, i) => ({ d, i, x: 0, y: 0, vx: 0, vy: 0, r: 0, home: 0, trail: [], glow: 0 }));
  const belt = Array.from({ length: 90 }, () => ({ a: Math.random() * TAU, rr: 0.19 + Math.random() * 0.035, s: 0.4 + Math.random() * 1.2, z: Math.random() }));

  function layout() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    S = stage.clientWidth; C = S / 2;
    cv.width = cv.height = S * DPR;
    Rp = S * 0.12;
    const homes = [0.29, 0.385, 0.455], radii = [0.036, 0.031, 0.014];
    const Tai = 18; // seconds per orbit for the inner world
    GM = Math.pow((TAU * homes[0] * S) / Tai, 2) * homes[0] * S;
    worlds.forEach((w, k) => {
      const first = !w.home;
      w.home = homes[k] * S; w.r = radii[k] * S;
      if (first) {
        const a = [0.6, 2.9, 4.6][k];
        w.x = Math.cos(a) * w.home; w.y = Math.sin(a) * w.home;
        const v = Math.sqrt(GM / w.home);
        w.vx = -Math.sin(a) * v; w.vy = Math.cos(a) * v;
      }
    });
  }

  // plane → screen
  const proj = (x, y) => ({ sx: C + x, sy: C + y * TILT, k: 1 + (y / (S * 0.5)) * 0.16 });

  let drag = null; // { w, px, py, hist, moved }
  function worldAt(sx, sy) {
    let best = null, bd = 1e9;
    for (const w of worlds) {
      const p = proj(w.x, w.y), d = Math.hypot(p.sx - sx, p.sy - sy);
      if (d < w.r * p.k + 16 && d < bd) { best = w; bd = d; }
    }
    return best;
  }
  function local(e) { const r = cv.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; }
  cv.addEventListener("pointerdown", (e) => {
    const { sx, sy } = local(e);
    const w = worldAt(sx, sy);
    if (!w) return;
    cv.setPointerCapture(e.pointerId); cv.classList.add("dragging");
    drag = { w, px: sx - C, py: (sy - C) / TILT, hist: [[sx, sy, performance.now()]], sx0: sx, sy0: sy, moved: false };
    w.glow = 1;
  });
  cv.addEventListener("pointermove", (e) => {
    const { sx, sy } = local(e);
    if (!drag) { cv.style.cursor = worldAt(sx, sy) ? "grab" : "default"; return; }
    drag.px = sx - C; drag.py = (sy - C) / TILT;
    drag.hist.push([sx, sy, performance.now()]); if (drag.hist.length > 6) drag.hist.shift();
    if (Math.hypot(sx - drag.sx0, sy - drag.sy0) > 6) drag.moved = true;
  });
  const release = () => {
    if (!drag) return;
    const { w, hist, moved } = drag;
    cv.classList.remove("dragging");
    if (moved) {
      const a = hist[0], z = hist[hist.length - 1], dt = Math.max(16, z[2] - a[2]) / 1000;
      w.vx = Math.max(-1400, Math.min(1400, (z[0] - a[0]) / dt));
      w.vy = Math.max(-2400, Math.min(2400, (z[1] - a[1]) / dt / TILT));
    } else select(w.i);
    drag = null;
  };
  cv.addEventListener("pointerup", release);
  cv.addEventListener("pointercancel", release);
  cv.addEventListener("touchstart", (e) => { const t = e.touches[0], r = cv.getBoundingClientRect(); if (worldAt(t.clientX - r.left, t.clientY - r.top)) e.preventDefault(); }, { passive: false });

  function step(dt) {
    for (const w of worlds) {
      if (drag && drag.w === w) {
        w.vx += ((drag.px - w.x) * 70 - w.vx * 13) * dt;
        w.vy += ((drag.py - w.y) * 70 - w.vy * 13) * dt;
      } else {
        const d = Math.hypot(w.x, w.y) || 1, nx = w.x / d, ny = w.y / d, tx = -ny, ty = nx;
        const soft = d * d + (S * 0.03) ** 2;
        // gravity toward the X09 planet
        w.vx -= (GM / soft) * nx * dt; w.vy -= (GM / soft) * ny * dt;
        // gentle "orbit keeper": flung worlds swing wide, then settle back into their lane
        const vr = w.vx * nx + w.vy * ny, vt = w.vx * tx + w.vy * ty, vc = Math.sqrt(GM / w.home);
        const kr = (w.home - d) * 0.9 - vr * 0.55, kt = (vc - vt) * 0.35;
        w.vx += (nx * kr + tx * kt) * dt; w.vy += (ny * kr + ty * kt) * dt;
      }
      w.x += w.vx * dt; w.y += w.vy * dt;
      w.glow = Math.max(0, w.glow - dt * 0.8);
      // bounce off the planet
      const d = Math.hypot(w.x, w.y), min = Rp * 1.05 + w.r;
      if (d < min) {
        const nx = w.x / d, ny = w.y / d, vn = w.vx * nx + w.vy * ny;
        w.x = nx * min; w.y = ny * min;
        if (vn < 0) { w.vx -= 1.7 * vn * nx; w.vy -= 1.7 * vn * ny; w.glow = 1; }
      }
      // keep inside the stage
      const lim = S * 0.5 - w.r, ly = (S * 0.5) / TILT - w.r;
      if (w.x < -lim) { w.x = -lim; w.vx = Math.abs(w.vx) * 0.7; } if (w.x > lim) { w.x = lim; w.vx = -Math.abs(w.vx) * 0.7; }
      if (w.y < -ly) { w.y = -ly; w.vy = Math.abs(w.vy) * 0.7; } if (w.y > ly) { w.y = ly; w.vy = -Math.abs(w.vy) * 0.7; }
    }
    // worlds collide with each other
    for (let i = 0; i < worlds.length; i++) for (let j = i + 1; j < worlds.length; j++) {
      const a = worlds[i], b = worlds[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = a.r + b.r;
      if (d >= R || !d) continue;
      const nx = dx / d, ny = dy / d, ma = a.r ** 2, mb = b.r ** 2, pen = R - d;
      a.x -= nx * pen * (mb / (ma + mb)); a.y -= ny * pen * (mb / (ma + mb)); b.x += nx * pen * (ma / (ma + mb)); b.y += ny * pen * (ma / (ma + mb));
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) { const j2 = (-1.9 * vn) / (1 / ma + 1 / mb); a.vx -= (j2 / ma) * nx; a.vy -= (j2 / ma) * ny; b.vx += (j2 / mb) * nx; b.vy += (j2 / mb) * ny; a.glow = b.glow = 1; }
    }
  }

  function sphere(x, y, r, alpha = 1) {
    const gr = g.createRadialGradient(x - r * 0.36, y - r * 0.4, r * 0.08, x, y, r);
    gr.addColorStop(0, `rgba(255,255,255,${alpha})`); gr.addColorStop(0.38, `rgba(226,226,226,${alpha})`);
    gr.addColorStop(0.72, `rgba(107,107,107,${alpha})`); gr.addColorStop(1, `rgba(22,22,22,${alpha})`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  function drawWorld(w, t) {
    const p = proj(w.x, w.y), r = w.r * p.k, sel = w.i === selected, live = w.d.live;
    // trail
    if (w.trail.length > 2) {
      g.lineWidth = 1.2;
      for (let i = 1; i < w.trail.length; i++) {
        g.strokeStyle = `rgba(255,255,255,${(i / w.trail.length) * (live ? 0.35 : 0.15)})`;
        g.beginPath(); g.moveTo(w.trail[i - 1][0], w.trail[i - 1][1]); g.lineTo(w.trail[i][0], w.trail[i][1]); g.stroke();
      }
    }
    if (w.glow > 0 || sel) {
      const gl = g.createRadialGradient(p.sx, p.sy, r, p.sx, p.sy, r * 3.2);
      gl.addColorStop(0, `rgba(255,255,255,${0.16 + w.glow * 0.25})`); gl.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(p.sx, p.sy, r * 3.2, 0, TAU); g.fill();
    }
    if (live) sphere(p.sx, p.sy, r);
    else { g.setLineDash([2, 3]); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.beginPath(); g.arc(p.sx, p.sy, r, 0, TAU); g.stroke(); g.setLineDash([]); }
    if (w.d.id === "docs") { // a little ring on the Docs world
      g.save(); g.translate(p.sx, p.sy); g.rotate(-0.35);
      g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, r * 1.75, r * 0.45, 0, 0, Math.PI); g.stroke(); g.restore();
    }
    if (sel) {
      g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.setLineDash([3, 4]); g.lineDashOffset = -t / 40;
      g.beginPath(); g.arc(p.sx, p.sy, r + 7, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    g.textAlign = "center";
    g.fillStyle = sel ? "#fff" : live ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.45)";
    g.font = `500 ${Math.max(10, S * 0.02)}px "JetBrains Mono", monospace`;
    g.fillText(w.d.name.toUpperCase(), p.sx, p.sy + r + Math.max(16, S * 0.035));
    g.fillStyle = "rgba(255,255,255,.4)"; g.font = `${Math.max(9, S * 0.016)}px "JetBrains Mono", monospace`;
    g.fillText(w.d.host, p.sx, p.sy + r + Math.max(29, S * 0.062));
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000); last = t;
    if (!document.hidden && S) {
      if (!reduce) { step(dt / 2); step(dt / 2); }
      for (const w of worlds) { const p = proj(w.x, w.y); w.trail.push([p.sx, p.sy]); if (w.trail.length > 46) w.trail.shift(); }
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, S, S);
      // lane guides
      g.lineWidth = 1;
      for (const w of worlds) { g.strokeStyle = "rgba(255,255,255,.08)"; g.setLineDash([2, 6]); g.beginPath(); g.ellipse(C, C, w.home, w.home * TILT, 0, 0, TAU); g.stroke(); }
      g.setLineDash([]);
      // planet halo
      const halo = g.createRadialGradient(C, C, Rp * 0.6, C, C, Rp * 3);
      halo.addColorStop(0, "rgba(255,255,255,.12)"); halo.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = halo; g.beginPath(); g.arc(C, C, Rp * 3, 0, TAU); g.fill();
      // asteroid belt: back half, then worlds behind the planet
      const spin = reduce ? 0 : t / 9000;
      const beltDot = (front) => {
        for (const b of belt) {
          const a = b.a + spin * (1.2 - b.rr * 2), x = Math.cos(a) * b.rr * S, y = Math.sin(a) * b.rr * S;
          if ((y > 0) !== front) continue;
          const p = proj(x, y); g.fillStyle = `rgba(255,255,255,${0.25 + b.z * 0.4})`;
          g.fillRect(p.sx, p.sy, b.s, b.s);
        }
      };
      beltDot(false);
      const behind = worlds.filter((w) => w.y < 0).sort((a, b) => a.y - b.y), front = worlds.filter((w) => w.y >= 0).sort((a, b) => a.y - b.y);
      behind.forEach((w) => drawWorld(w, t));
      // the X09 planet with its crossed rings
      const ring = (deg, half) => {
        g.save(); g.translate(C, C); g.rotate((deg * Math.PI) / 180);
        g.beginPath(); g.ellipse(0, 0, Rp * 2, Rp * 0.6, 0, half ? 0 : Math.PI, half ? Math.PI : TAU);
        g.restore();
      };
      const wob = reduce ? 0 : Math.sin(t / 2400) * 3;
      g.lineCap = "round";
      for (const deg of [-30 + wob, 30 - wob]) { ring(deg, false); g.strokeStyle = "rgba(255,255,255,.42)"; g.lineWidth = Math.max(1.2, Rp * 0.045); g.stroke(); }
      sphere(C, C, Rp);
      for (const deg of [-30 + wob, 30 - wob]) {
        ring(deg, true); g.strokeStyle = "#000"; g.lineWidth = Math.max(3, Rp * 0.13); g.stroke();
        ring(deg, true); g.strokeStyle = "#fff"; g.lineWidth = Math.max(1.4, Rp * 0.05); g.stroke();
      }
      beltDot(true);
      front.forEach((w) => drawWorld(w, t));
    }
    requestAnimationFrame(frame);
  }
  new ResizeObserver(layout).observe(stage);
  layout(); requestAnimationFrame(frame);

  /* ================= Selection + launch ================= */
  const planOf = (d) => d.product && X09.user?.products?.[d.product];
  function fromPrice(d) {
    const p = catalog.find((c) => c.key === d.product);
    return p ? p.plans[0].price : null;
  }
  function select(i) {
    selected = i;
    const d = DESTINATIONS[i];
    $("dLabel").textContent = `Orbit ${String(i + 1).padStart(2, "0")} · selected`;
    $("dName").textContent = d.name;
    $("dHost").textContent = d.host;
    $("dBlurb").textContent = d.blurb;
    $("dTags").innerHTML = d.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    const mine = planOf(d);
    $("dChip").textContent = !d.live ? "Reserved" : mine?.plan ? `${mine.planName} plan` : "Live";
    $("dChip").classList.toggle("on", d.live);
    const L = $("dLaunch");
    L.href = d.url || "#";
    L.firstChild.textContent = d.live ? `Launch ${d.name} ` : "Not open yet ";
    L.toggleAttribute("aria-disabled", !d.live); L.style.opacity = d.live ? "" : ".4";
    $("dPlans").hidden = !d.live;
    $("dPlans").textContent = mine?.plan ? "Your plan" : fromPrice(d) ? `Plans from ${fromPrice(d)}/mo` : "See plans";
    worlds[i].glow = 1;
  }
  function launch(d) {
    if (!d.live) return;
    $("warpName").textContent = d.name; $("warpHost").textContent = d.host;
    if (reduce) return location.assign(d.url);
    $("warp").classList.add("on");
    const r = stage.getBoundingClientRect();
    space.shockwave(r.left + r.width / 2, r.top + r.height / 2, 1.4);
    if (SAME_TAB) setTimeout(() => location.assign(d.url), 1000);
    else { window.open(d.url, "_blank", "noopener"); setTimeout(() => $("warp").classList.remove("on"), 1200); }
  }
  addEventListener("pageshow", () => $("warp").classList.remove("on"));
  $("dLaunch").addEventListener("click", (e) => { e.preventDefault(); launch(DESTINATIONS[selected]); });
  $("dPlans").addEventListener("click", () => openPlans(DESTINATIONS[selected].product));
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, [role=dialog]") || e.metaKey || e.ctrlKey) return;
    const live = DESTINATIONS.map((d, i) => i);
    if (e.key === "ArrowRight") select((selected + 1) % live.length);
    else if (e.key === "ArrowLeft") select((selected - 1 + live.length) % live.length);
    else if (e.key === "Enter" && document.activeElement === document.body) launch(DESTINATIONS[selected]);
  });

  function openPlans(product) {
    if (!product) return;
    if (!X09.user) return X09.openAuth("signup", () => X09.openAccount({ plans: product }));
    X09.openAccount({ plans: product });
  }

  /* ================= Destination cards ================= */
  function renderCards() {
    $("cards").innerHTML = DESTINATIONS.map((d, i) => {
      const mine = planOf(d), price = fromPrice(d);
      return `<article class="card${d.live ? "" : " reserved"}" data-tilt data-x09-solid>
        <div class="card-top"><span class="x09-switch-orb">${d.live ? (d.id === "ai" ? "AI" : "DOC") : "03"}</span>
          <div class="grow"><h3>${esc(d.name)}</h3><span class="host">${esc(d.host)}</span></div>
          <span class="x09-chip${d.live ? " on" : ""}">${!d.live ? "Reserved" : mine?.plan ? esc(mine.planName) : "Live"}</span></div>
        <p>${esc(d.blurb)}</p>
        <ul>${d.feats.map((f) => `<li>${f}</li>`).join("")}</ul>
        ${d.live ? `<div class="price">${price ? `from <b>${esc(price)}</b>/mo` : "&nbsp;"}</div>` : '<div class="price">&nbsp;</div>'}
        <div class="row-btns">
          ${d.live ? `<button class="btn-primary" data-launch="${i}">Launch</button><button class="btn-ghost" data-plans="${d.product}">${mine?.plan ? "Manage" : "Plans"}</button>` : '<button class="btn-ghost" disabled>Coming soon</button>'}
        </div>
      </article>`;
    }).join("");
    $("cards").querySelectorAll("[data-launch]").forEach((b) => b.addEventListener("click", () => launch(DESTINATIONS[+b.dataset.launch])));
    $("cards").querySelectorAll("[data-plans]").forEach((b) => b.addEventListener("click", () => openPlans(b.dataset.plans)));
  }

  /* ================= X09 ID (account) ================= */
  function renderUser(u) {
    const btn = $("accountBtn");
    if (u) { btn.classList.add("signed-in"); X09.paintAvatar(btn, u); btn.title = u.email; btn.classList.add("x09-avatar"); }
    else { btn.classList.remove("signed-in", "has-photo", "x09-avatar"); btn.style.backgroundImage = ""; btn.textContent = "Sign in"; btn.title = ""; }
    $("meCard").hidden = !u; $("guestCard").hidden = !!u;
    if (u) {
      X09.paintAvatar($("meAv"), u);
      $("meName").textContent = u.name || "Your X09 account";
      $("meEmail").textContent = u.email + (u.company ? ` · ${u.company}` : "");
      $("meChips").innerHTML = Object.values(u.products || {}).map((p) => `<span class="x09-chip${p.plan ? " on" : ""}">${esc(p.name)} · ${p.plan ? esc(p.planName) : "no plan"}</span>`).join("");
      $("meBilling").hidden = !u.hasBilling;
      $("askFoot").textContent = u.guide?.limit ? `${u.guide.used} / ${u.guide.limit} questions this month · included with your X09 plan` : "Included with any X09 plan · pick one to start asking";
    } else $("askFoot").textContent = "Included with any X09 plan · 100 questions / month";
    renderCards(); select(selected);
  }
  $("accountBtn").addEventListener("click", () => (X09.user ? X09.openAccount() : X09.openAuth("login")));
  $("meOpen").addEventListener("click", () => X09.openAccount());
  $("meBilling").addEventListener("click", () => X09.openBilling());
  $("guestSignup").addEventListener("click", () => X09.openAuth("signup"));
  $("guestLogin").addEventListener("click", () => X09.openAuth("login"));

  /* ================= Ask X09 (Claude) ================= */
  const log = $("askLog"), input = $("askInput"), send = $("askSend");
  let convo = [], busy = false;
  function md(src) {
    const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, "$1<i>$2</i>")
      .replace(/\b(https:\/\/[a-z0-9.-]*x09hub\.com[^\s)<]*)/gi, '<a href="$1">$1</a>');
    const out = []; let list = null;
    for (const line of String(src).split("\n")) {
      const li = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
      if (li) { if (!list) { list = []; } list.push(`<li>${inline(li[1])}</li>`); continue; }
      if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
      if (line.trim()) out.push(`<p>${inline(line.replace(/^#+\s*/, ""))}</p>`);
    }
    if (list) out.push(`<ul>${list.join("")}</ul>`);
    return out.join("");
  }
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(140, input.scrollHeight) + "px"; send.disabled = busy || !input.value.trim(); }
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("askForm").requestSubmit(); } });
  $("askChips").querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { input.value = c.textContent; autosize(); $("askForm").requestSubmit(); }));
  $("askForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || busy) return;
    if (!X09.user) return X09.openAuth("signup", () => $("askForm").requestSubmit());
    busy = true; input.value = ""; autosize();
    log.querySelector(".console-empty")?.remove();
    const el = document.createElement("div"); el.className = "qa";
    el.innerHTML = `<div class="q-row"><div class="q"></div></div><div class="a cursor"></div>`;
    el.querySelector(".q").textContent = q; log.appendChild(el); log.scrollTop = log.scrollHeight;
    const a = el.querySelector(".a");
    convo.push({ role: "user", content: q });
    let text = "";
    try {
      const res = await fetch("/api/guide", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: convo.slice(-10) }) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const err = new Error(d.error || "Something went wrong."); err.code = d.code; throw err;
      }
      const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          const d = l.slice(5).trim(); if (!d || d === "[DONE]") continue;
          try { const j = JSON.parse(d); if (j.error) throw new Error(j.error); text += j.response || ""; } catch (ex) { if (ex.message && !/JSON/.test(ex.message)) throw ex; }
        }
        a.innerHTML = md(text); log.scrollTop = log.scrollHeight;
      }
      convo.push({ role: "assistant", content: text });
      X09.refresh();
    } catch (ex) {
      convo.pop();
      a.classList.add("err"); a.textContent = ex.message;
      if (ex.code === "plan_required") { X09.toast("Ask X09 is included with any X09 plan."); setTimeout(() => X09.openAccount({ plans: "ai" }), 700); }
    } finally {
      a.classList.remove("cursor"); busy = false; autosize();
    }
  });

  /* ================= Clock + boot ================= */
  const t0 = Date.now(), pad = (n) => String(n).padStart(2, "0");
  function tick() {
    const n = new Date();
    $("clock").textContent = `${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}:${pad(n.getUTCSeconds())} UTC`;
    const s = Math.floor((Date.now() - t0) / 1000);
    $("tplus").textContent = `T+ ${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  }
  setInterval(tick, 1000); tick();

  (async function boot() {
    renderUser(null);
    const params = new URLSearchParams(location.search);
    const checkout = params.get("checkout"), product = params.get("product");
    if (params.has("checkout") || params.has("portal")) history.replaceState(null, "", "/");
    try { catalog = (await X09.api("/api/plans")).catalog; X09.catalog = catalog; } catch {}
    await X09.refresh();
    renderCards(); select(0);
    if (checkout === "success") {
      X09.toast("Payment received — activating your plan…", 6000);
      const active = () => !!X09.user?.products?.[product]?.plan;
      for (let i = 0; i < 12 && !active(); i++) { await new Promise((r) => setTimeout(r, 1500)); await X09.refresh(); }
      const p = X09.user?.products?.[product];
      X09.toast(active() ? `${p.name} ${p.planName} plan active. Launch it from the Hub.` : "Payment received. Your plan will activate shortly.", 6000);
    } else if (checkout === "cancel") X09.toast("Checkout canceled — no charge was made.");
  })();
})();
