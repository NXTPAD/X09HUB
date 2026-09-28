/* X09 Hub — orbit system, app bento, Ask X09 and the X09 ID section (Aurora Glass) */
(() => {
  "use strict";

  /* ------------------------------------------------------------------
     DESTINATIONS — edit to add or change where the Hub points.
     `product` links a destination to its plans in the shared X09 catalog.
     ------------------------------------------------------------------ */
  const DESTINATIONS = [
    { id: "ai", product: "ai", orb: "AI", name: "X09 AI", host: "ai.x09hub.com", url: "https://ai.x09hub.com", live: true, hue: "255,255,255",
      blurb: "Your AI co-pilot. Ask anything, plan, write, code and analyze. Fast mode runs on Claude Haiku, Deep mode on Claude Sonnet.",
      feats: ["Claude Haiku + Sonnet", "Fast & Deep modes", "Chats synced to your account", "Code, plans, emails"] },
    { id: "docs", product: "docs", orb: "DOC", name: "X09 Docs", host: "docs.x09hub.com", url: "https://docs.x09hub.com", live: true, hue: "200,200,200",
      blurb: "AI invoices, estimates, proposals and contracts. Describe the job and X09 drafts it. Clients view, download and e-sign.",
      feats: ["AI drafts", "E-signature", "PDF + client links", "Estimate → invoice"] },
    { id: "o3", orb: "03", name: "Orbit 03", host: "Reserved", url: null, live: false, hue: "140,140,140",
      blurb: "An open orbit for the next X09 app. Same account, same bill, when it lands.", feats: [] },
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
  const TILT = 0.34;
  let W = 0, H = 0, DPR = 1, CX = 0, CY = 0, U = 0, Rp = 0, GM = 0;
  const worlds = DESTINATIONS.map((d, i) => ({ d, i, x: 0, y: 0, vx: 0, vy: 0, r: 0, home: 0, trail: [], glow: 0 }));
  const belt = Array.from({ length: 140 }, () => ({ a: Math.random() * TAU, rr: 0.36 + Math.random() * 0.06, s: 0.5 + Math.random() * 1.4, z: Math.random(), h: Math.floor(Math.random() * 3) }));
  const HUES = ["255,255,255", "200,200,200", "140,140,140"];

  function layout() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    CX = W / 2; CY = H * 0.5;
    U = Math.min(W / 2 - 10, (H / 2 - 30) / TILT);           // plane radius that fits the stage
    Rp = Math.min(H * 0.2, U * 0.2);
    const homes = [0.5, 0.72, 0.9], radii = [0.07, 0.06, 0.03];
    GM = Math.pow((TAU * homes[0] * U) / 20, 2) * homes[0] * U;  // inner world: one orbit ≈ 20 s
    worlds.forEach((w, k) => {
      const first = !w.home;
      w.home = homes[k] * U; w.r = Math.max(8, Math.min(radii[k] * U, Rp * 0.42));
      if (first) {
        const a = [0.9, 3.4, 5.2][k];
        w.x = Math.cos(a) * w.home; w.y = Math.sin(a) * w.home;
        const v = Math.sqrt(GM / w.home);
        w.vx = -Math.sin(a) * v; w.vy = Math.cos(a) * v;
      }
    });
  }
  const proj = (x, y) => ({ sx: CX + x, sy: CY + y * TILT, k: 1 + (y / U) * 0.22 });

  let drag = null;
  function worldAt(sx, sy) {
    let best = null, bd = 1e9;
    for (const w of worlds) {
      const p = proj(w.x, w.y), d = Math.hypot(p.sx - sx, p.sy - sy);
      if (d < w.r * p.k + 18 && d < bd) { best = w; bd = d; }
    }
    return best;
  }
  const local = (e) => { const r = cv.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; };
  cv.addEventListener("pointerdown", (e) => {
    const { sx, sy } = local(e), w = worldAt(sx, sy);
    if (!w) return;
    cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing";
    drag = { w, px: sx - CX, py: (sy - CY) / TILT, hist: [[sx, sy, performance.now()]], sx0: sx, sy0: sy, moved: false };
    w.glow = 1;
  });
  cv.addEventListener("pointermove", (e) => {
    const { sx, sy } = local(e);
    if (!drag) { cv.style.cursor = worldAt(sx, sy) ? "grab" : "default"; return; }
    drag.px = sx - CX; drag.py = (sy - CY) / TILT;
    drag.hist.push([sx, sy, performance.now()]); if (drag.hist.length > 6) drag.hist.shift();
    if (Math.hypot(sx - drag.sx0, sy - drag.sy0) > 6) drag.moved = true;
  });
  const release = () => {
    if (!drag) return;
    const { w, hist, moved } = drag;
    cv.style.cursor = "grab";
    if (moved) {
      const a = hist[0], z = hist[hist.length - 1], dt = Math.max(16, z[2] - a[2]) / 1000;
      w.vx = Math.max(-1600, Math.min(1600, (z[0] - a[0]) / dt));
      w.vy = Math.max(-3000, Math.min(3000, (z[1] - a[1]) / dt / TILT));
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
        const soft = d * d + (U * 0.05) ** 2;
        w.vx -= (GM / soft) * nx * dt; w.vy -= (GM / soft) * ny * dt;             // gravity
        const vr = w.vx * nx + w.vy * ny, vt = w.vx * tx + w.vy * ty, vc = Math.sqrt(GM / w.home);
        const kr = (w.home - d) * 0.9 - vr * 0.55, kt = (vc - vt) * 0.35;          // orbit keeper
        w.vx += (nx * kr + tx * kt) * dt; w.vy += (ny * kr + ty * kt) * dt;
      }
      w.x += w.vx * dt; w.y += w.vy * dt;
      w.glow = Math.max(0, w.glow - dt * 0.8);
      const d = Math.hypot(w.x, w.y), min = Rp * 1.1 + w.r;                         // bounce off the planet
      if (d < min) {
        const nx = w.x / d, ny = w.y / d, vn = w.vx * nx + w.vy * ny;
        w.x = nx * min; w.y = ny * min;
        if (vn < 0) { w.vx -= 1.7 * vn * nx; w.vy -= 1.7 * vn * ny; w.glow = 1; }
      }
      const lx = W / 2 - w.r, ly = (H / 2 - w.r) / TILT;                           // stage walls
      if (w.x < -lx) { w.x = -lx; w.vx = Math.abs(w.vx) * 0.7; } if (w.x > lx) { w.x = lx; w.vx = -Math.abs(w.vx) * 0.7; }
      if (w.y < -ly) { w.y = -ly; w.vy = Math.abs(w.vy) * 0.7; } if (w.y > ly) { w.y = ly; w.vy = -Math.abs(w.vy) * 0.7; }
    }
    for (let i = 0; i < worlds.length; i++) for (let j = i + 1; j < worlds.length; j++) {    // worlds collide
      const a = worlds[i], b = worlds[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = a.r + b.r;
      if (d >= R || !d) continue;
      const nx = dx / d, ny = dy / d, ma = a.r ** 2, mb = b.r ** 2, pen = R - d;
      a.x -= nx * pen * (mb / (ma + mb)); a.y -= ny * pen * (mb / (ma + mb)); b.x += nx * pen * (ma / (ma + mb)); b.y += ny * pen * (ma / (ma + mb));
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) { const j2 = (-1.9 * vn) / (1 / ma + 1 / mb); a.vx -= (j2 / ma) * nx; a.vy -= (j2 / ma) * ny; b.vx += (j2 / mb) * nx; b.vy += (j2 / mb) * ny; a.glow = b.glow = 1; }
    }
  }

  function sphere(x, y, r, hue) {
    const gr = g.createRadialGradient(x - r * 0.36, y - r * 0.4, r * 0.06, x, y, r);
    gr.addColorStop(0, "#fff"); gr.addColorStop(0.36, "#e6e6e6"); gr.addColorStop(0.72, "#6b6b6b"); gr.addColorStop(1, "#141414");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    if (hue) { // aurora rim light
      g.globalCompositeOperation = "lighter";
      const rim = g.createRadialGradient(x + r * 0.55, y + r * 0.5, 0, x + r * 0.35, y + r * 0.3, r * 1.15);
      rim.addColorStop(0, `rgba(${hue},.7)`); rim.addColorStop(1, `rgba(${hue},0)`);
      g.fillStyle = rim; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.globalCompositeOperation = "source-over";
    }
  }
  function drawWorld(w, t) {
    const p = proj(w.x, w.y), r = w.r * p.k, sel = w.i === selected, live = w.d.live, hue = w.d.hue;
    if (w.trail.length > 2) {
      g.lineWidth = 2; g.lineCap = "round";
      for (let i = 1; i < w.trail.length; i++) {
        g.strokeStyle = `rgba(${hue},${(i / w.trail.length) * (live ? 0.55 : 0.25)})`;
        g.beginPath(); g.moveTo(w.trail[i - 1][0], w.trail[i - 1][1]); g.lineTo(w.trail[i][0], w.trail[i][1]); g.stroke();
      }
    }
    const gl = g.createRadialGradient(p.sx, p.sy, r * 0.8, p.sx, p.sy, r * 3.4);
    gl.addColorStop(0, `rgba(${hue},${(sel ? 0.35 : 0.18) + w.glow * 0.35})`); gl.addColorStop(1, `rgba(${hue},0)`);
    g.fillStyle = gl; g.beginPath(); g.arc(p.sx, p.sy, r * 3.4, 0, TAU); g.fill();
    if (live) sphere(p.sx, p.sy, r, hue);
    else { g.setLineDash([3, 4]); g.strokeStyle = `rgba(${hue},.8)`; g.lineWidth = 1.5; g.beginPath(); g.arc(p.sx, p.sy, r, 0, TAU); g.stroke(); g.setLineDash([]); }
    if (w.d.id === "docs") {
      g.save(); g.translate(p.sx, p.sy); g.rotate(-0.35);
      g.strokeStyle = `rgba(${hue},.9)`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 0, r * 1.8, r * 0.45, 0, 0, Math.PI); g.stroke(); g.restore();
    }
    if (sel) {
      g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 1.2; g.setLineDash([4, 5]); g.lineDashOffset = -t / 40;
      g.beginPath(); g.arc(p.sx, p.sy, r + 9, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    // label pill
    const label = w.d.name, fs = Math.max(11, Math.min(14, U * 0.03));
    g.font = `700 ${fs}px Manrope, sans-serif`;
    const tw = g.measureText(label).width, lx = p.sx - tw / 2 - 10, ly = p.sy + r + 12, lh = fs + 12;
    g.fillStyle = sel ? "rgba(255,255,255,.95)" : "rgba(18,18,18,.75)";
    g.strokeStyle = sel ? "transparent" : "rgba(255,255,255,.14)"; g.lineWidth = 1;
    g.beginPath(); g.roundRect(lx, ly, tw + 20, lh, lh / 2); g.fill(); g.stroke();
    g.fillStyle = sel ? "#000000" : live ? "#e8e8e8" : "rgba(232,232,232,.55)"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(label, p.sx, ly + lh / 2 + 0.5);
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000); last = t;
    if (!document.hidden && W) {
      if (!reduce) { step(dt / 2); step(dt / 2); }
      for (const w of worlds) { const p = proj(w.x, w.y); w.trail.push([p.sx, p.sy]); if (w.trail.length > 40) w.trail.shift(); }
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, W, H);
      // lanes
      g.lineWidth = 1;
      for (const w of worlds) { g.strokeStyle = `rgba(${w.d.hue},.16)`; g.setLineDash([2, 7]); g.beginPath(); g.ellipse(CX, CY, w.home, w.home * TILT, 0, 0, TAU); g.stroke(); }
      g.setLineDash([]);
      // planet halo (aurora)
      const halo = g.createRadialGradient(CX, CY, Rp * 0.5, CX, CY, Rp * 3.6);
      halo.addColorStop(0, "rgba(255,255,255,.35)"); halo.addColorStop(0.5, "rgba(200,200,200,.08)"); halo.addColorStop(1, "rgba(200,200,200,0)");
      g.fillStyle = halo; g.beginPath(); g.arc(CX, CY, Rp * 3.6, 0, TAU); g.fill();
      const spin = reduce ? 0 : t / 9000;
      const beltDots = (front) => {
        for (const b of belt) {
          const a = b.a + spin * (1.2 - b.rr), x = Math.cos(a) * b.rr * U, y = Math.sin(a) * b.rr * U;
          if ((y > 0) !== front) continue;
          const p = proj(x, y); g.fillStyle = `rgba(${HUES[b.h]},${0.3 + b.z * 0.5})`;
          g.fillRect(p.sx, p.sy, b.s, b.s);
        }
      };
      beltDots(false);
      const behind = worlds.filter((w) => w.y < 0).sort((a, b) => a.y - b.y), front = worlds.filter((w) => w.y >= 0).sort((a, b) => a.y - b.y);
      behind.forEach((w) => drawWorld(w, t));
      // the X09 planet with its crossed rings
      const ring = (deg, half) => {
        g.save(); g.translate(CX, CY); g.rotate((deg * Math.PI) / 180);
        g.beginPath(); g.ellipse(0, 0, Rp * 2, Rp * 0.6, 0, half ? 0 : Math.PI, half ? Math.PI : TAU);
        g.restore();
      };
      const wob = reduce ? 0 : Math.sin(t / 2400) * 3;
      const ringGrad = g.createLinearGradient(CX - Rp * 2, CY, CX + Rp * 2, CY);
      ringGrad.addColorStop(0, "#ffffff"); ringGrad.addColorStop(0.55, "#c4c4c4"); ringGrad.addColorStop(1, "#7c7c7c");
      g.lineCap = "round";
      for (const deg of [-30 + wob, 30 - wob]) { ring(deg, false); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = Math.max(1.4, Rp * 0.045); g.stroke(); }
      sphere(CX, CY, Rp, "255,255,255");
      for (const deg of [-30 + wob, 30 - wob]) {
        ring(deg, true); g.strokeStyle = "rgba(0,0,0,.95)"; g.lineWidth = Math.max(3, Rp * 0.14); g.stroke();
        ring(deg, true); g.strokeStyle = ringGrad; g.lineWidth = Math.max(1.8, Rp * 0.06); g.stroke();
      }
      beltDots(true);
      front.forEach((w) => drawWorld(w, t));
    }
    requestAnimationFrame(frame);
  }
  new ResizeObserver(layout).observe(cv);
  layout(); requestAnimationFrame(frame);

  /* ================= Selection + launch ================= */
  const planOf = (d) => d.product && X09.user?.products?.[d.product];
  const plansFor = (d) => catalog.find((c) => c.key === d.product)?.plans || [];
  function select(i) {
    selected = i;
    const d = DESTINATIONS[i], mine = planOf(d);
    $("sOrb").textContent = d.orb; $("sName").textContent = d.name; $("sHost").textContent = d.host; $("sBlurb").textContent = d.blurb;
    $("sChip").textContent = !d.live ? "Reserved" : mine?.plan ? mine.planName : "Live";
    $("sChip").classList.toggle("on", d.live);
    const L = $("sLaunch");
    L.href = d.url || "#"; L.textContent = d.live ? `Launch ${d.name}` : "Coming soon"; L.style.opacity = d.live ? "" : ".4";
    const P = $("sPlans"); P.hidden = !d.live;
    const from = plansFor(d)[0]?.price;
    P.textContent = mine?.plan ? "Your plan" : from ? `From ${from}/mo` : "Plans";
    worlds[i].glow = 1;
  }
  function launch(d) {
    if (!d || !d.live) return;
    $("warpName").textContent = d.name; $("warpHost").textContent = d.host;
    if (reduce) return location.assign(d.url);
    $("warp").classList.add("on");
    const r = stage.getBoundingClientRect();
    space.shockwave(r.left + r.width / 2, r.top + r.height / 2, 1.4);
    if (SAME_TAB) setTimeout(() => location.assign(d.url), 1000);
    else { window.open(d.url, "_blank", "noopener"); setTimeout(() => $("warp").classList.remove("on"), 1200); }
  }
  addEventListener("pageshow", () => $("warp").classList.remove("on"));
  $("sLaunch").addEventListener("click", (e) => { e.preventDefault(); launch(DESTINATIONS[selected]); });
  $("sPlans").addEventListener("click", () => openPlans(DESTINATIONS[selected].product));
  document.querySelectorAll("[data-launch-id]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); launch(DESTINATIONS.find((d) => d.id === a.dataset.launchId)); }));
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, [role=dialog]") || e.metaKey || e.ctrlKey) return;
    if (e.key === "ArrowRight") select((selected + 1) % DESTINATIONS.length);
    else if (e.key === "ArrowLeft") select((selected - 1 + DESTINATIONS.length) % DESTINATIONS.length);
    else if (e.key === "Enter" && document.activeElement === document.body) launch(DESTINATIONS[selected]);
  });
  function openPlans(product) {
    if (!product) return;
    if (!X09.user) return X09.openAuth("signup", () => X09.openAccount({ plans: product }));
    X09.openAccount({ plans: product });
  }

  /* ================= Bento ================= */
  function renderBento() {
    const [ai, docs, o3] = DESTINATIONS;
    const chip = (d) => { const m = planOf(d); return `<span class="x09-chip${d.live ? " on" : ""}">${!d.live ? "Reserved" : m?.plan ? esc(m.planName) : "Live"}</span>`; };
    const btns = (d, i) => { const m = planOf(d); return `<div class="row-btns"><button class="btn-primary" data-launch="${i}">Launch</button><button class="btn-ghost" data-plans="${d.product}">${m?.plan ? "Manage" : "Plans"}</button></div>`; };
    const aiPlans = plansFor(ai).map((p) => `<div class="plan-mini"><b>${esc(p.name)}</b><span>${esc(p.price)}</span><small>/mo</small><em>${Number(p.fast).toLocaleString()} fast · ${Number(p.deep).toLocaleString()} deep</em></div>`).join("");
    const docsFrom = plansFor(docs)[0]?.price;
    const anyPlan = X09.user && Object.values(X09.user.products || {}).some((p) => p.plan);
    $("bento").innerHTML = `
      <article class="tile hero-tile" data-tilt data-x09-solid>
        <div class="tile-top"><span class="orb">AI</span><div class="grow"><h3>${esc(ai.name)}</h3><span class="host">${esc(ai.host)}</span></div>${chip(ai)}</div>
        <p>${esc(ai.blurb)}</p>
        <ul class="feats">${ai.feats.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        ${aiPlans ? `<div class="plan-row">${aiPlans}</div>` : ""}
        ${btns(ai, 0)}
      </article>
      <article class="tile docs" data-tilt data-x09-solid>
        <div class="tile-top"><span class="orb" style="background:linear-gradient(135deg,#9a9a9a,#ffffff)">DOC</span><div class="grow"><h3>${esc(docs.name)}</h3><span class="host">${esc(docs.host)}</span></div></div>
        <p>${esc(docs.blurb)}</p>
        <ul class="feats">${docs.feats.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        <div class="from">${docsFrom ? `from <b>${esc(docsFrom)}</b>/mo` : ""} ${chip(docs)}</div>
        ${btns(docs, 1)}
      </article>
      <article class="tile small reserved" data-tilt>
        <div class="tile-top"><span class="orb" style="background:rgba(140,140,140,.2);box-shadow:none;border:1px dashed rgba(140,140,140,.6)">03</span><div class="grow"><h3>${esc(o3.name)}</h3><span class="host">Reserved orbit</span></div></div>
        <p class="note" style="margin-top:14px">${esc(o3.blurb)}</p>
      </article>
      <article class="tile small" data-tilt>
        <div class="big-num x09-grad">1</div>
        <p class="note"><b style="color:#fff">account, profile and bill</b> for every X09 app${anyPlan ? " — yours is active." : "."}</p>
      </article>`;
    $("bento").querySelectorAll("[data-launch]").forEach((b) => b.addEventListener("click", () => launch(DESTINATIONS[+b.dataset.launch])));
    $("bento").querySelectorAll("[data-plans]").forEach((b) => b.addEventListener("click", () => openPlans(b.dataset.plans)));
  }

  /* ================= X09 ID ================= */
  function renderUser(u) {
    const btn = $("accountBtn");
    if (u) { btn.classList.add("signed-in", "x09-avatar"); X09.paintAvatar(btn, u); btn.title = u.email; }
    else { btn.classList.remove("signed-in", "has-photo", "x09-avatar"); btn.style.backgroundImage = ""; btn.textContent = "Sign in"; btn.title = ""; }
    $("meCard").hidden = !u; $("guestCard").hidden = !!u;
    if (u) {
      X09.paintAvatar($("meAv"), u);
      $("meName").textContent = u.name || "Your X09 account";
      $("meEmail").textContent = u.email + (u.company ? ` · ${u.company}` : "");
      $("meChips").innerHTML = Object.values(u.products || {}).map((p) => `<span class="x09-chip${p.plan ? " on" : ""}">${esc(p.name)} · ${p.plan ? esc(p.planName) : "no plan"}</span>`).join("");
      $("meBilling").hidden = !u.hasBilling;
      $("askFoot").textContent = u.guide?.limit ? `${u.guide.used} of ${u.guide.limit} questions used this month · included with your plan` : "Included with any X09 plan · pick one to start asking";
    } else $("askFoot").textContent = "Included with any X09 plan · 100 questions a month";
    renderBento(); select(selected);
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
      if (li) { (list ||= []).push(`<li>${inline(li[1])}</li>`); continue; }
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
      if (!res.ok) { const d = await res.json().catch(() => ({})); const err = new Error(d.error || "Something went wrong."); err.code = d.code; throw err; }
      const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          const d = l.slice(5).trim(); if (!d || d === "[DONE]") continue;
          let j; try { j = JSON.parse(d); } catch { continue; }
          if (j.error) throw new Error(j.error);
          text += j.response || "";
        }
        a.innerHTML = md(text); log.scrollTop = log.scrollHeight;
      }
      convo.push({ role: "assistant", content: text });
      X09.refresh();
    } catch (ex) {
      convo.pop();
      a.classList.add("err"); a.textContent = ex.message;
      if (ex.code === "plan_required") { X09.toast("Ask X09 is included with any X09 plan."); setTimeout(() => X09.openAccount({ plans: "ai" }), 700); }
    } finally { a.classList.remove("cursor"); busy = false; autosize(); }
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
    renderBento(); select(0);
    if (checkout === "success") {
      X09.toast("Payment received — activating your plan…", 6000);
      const active = () => !!X09.user?.products?.[product]?.plan;
      for (let i = 0; i < 12 && !active(); i++) { await new Promise((r) => setTimeout(r, 1500)); await X09.refresh(); }
      const p = X09.user?.products?.[product];
      X09.toast(active() ? `${p.name} ${p.planName} plan active.` : "Payment received. Your plan will activate shortly.", 6000);
    } else if (checkout === "cancel") X09.toast("Checkout canceled — no charge was made.");
  })();
})();
