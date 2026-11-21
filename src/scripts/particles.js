// Ambient "gold dust" — depth-layered particles with bokeh, gentle parallax and cursor drift.
// Canvas 2D with pre-rendered glow sprites: cheap enough for laptops and phones.
export function start(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const mobile = matchMedia("(max-width: 760px)").matches;
  let W = 0, H = 0, parts = [], raf = 0, running = true;
  let mx = 0, my = 0, tmx = 0, tmy = 0, scrollY0 = scrollY;

  const sprite = (rgb, size = 64) => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.22, `rgba(${rgb},0.75)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  };
  let sprites = {};
  const palette = () => {
    const ivory = document.documentElement.dataset.theme === "ivory";
    sprites = ivory
      ? { dust: sprite("154,117,32"), warm: sprite("184,144,31"), bokeh: sprite("154,117,32", 128), alpha: 0.55 }
      : { dust: sprite("230,201,121"), warm: sprite("212,175,55"), bokeh: sprite("212,175,55", 128), alpha: 1 };
  };

  const resize = () => {
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.setProperty("width", W + "px"); canvas.style.setProperty("height", H + "px");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.round(Math.min(mobile ? 46 : 120, (W * H) / (mobile ? 9000 : 13000)));
    parts = Array.from({ length: count }, () => make(true));
    for (let i = 0; i < (mobile ? 4 : 7); i++) parts.push(make(true, true));
  };
  const make = (anywhere, bokeh = false) => {
    const z = bokeh ? 0.15 + Math.random() * 0.25 : 0.25 + Math.random() * 0.75;
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 20,
      z, bokeh,
      r: bokeh ? 28 + Math.random() * 60 : 0.7 + z * 2.2,
      vx: (Math.random() - 0.5) * 0.08, vy: -(0.05 + z * 0.22),
      tw: Math.random() * Math.PI * 2, ts: 0.6 + Math.random() * 1.6,
      warm: Math.random() < 0.4,
    };
  };

  const frame = (t) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    const dy = (scrollY - scrollY0) * 0.06; scrollY0 = scrollY;
    ctx.clearRect(0, 0, W, H);
    const time = t / 1000;
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy - dy * p.z;
      if (p.y < -80) Object.assign(p, make(false, p.bokeh));
      if (p.y > H + 90) p.y = -60;
      if (p.x < -80) p.x = W + 60; else if (p.x > W + 80) p.x = -60;
      const px = p.x + mx * p.z * 26, py = p.y + my * p.z * 18;
      const twinkle = p.bokeh ? 1 : 0.55 + 0.45 * Math.sin(time * p.ts + p.tw);
      const a = (p.bokeh ? 0.05 : 0.22 + p.z * 0.6) * twinkle * sprites.alpha;
      const s = p.r * (p.bokeh ? 1 : 6);
      ctx.globalAlpha = a;
      ctx.drawImage(p.bokeh ? sprites.bokeh : p.warm ? sprites.warm : sprites.dust, px - s / 2, py - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  };

  palette(); resize();
  addEventListener("resize", () => { cancelAnimationFrame(raf); resize(); if (running) raf = requestAnimationFrame(frame); }, { passive: true });
  addEventListener("pointermove", (e) => { tmx = e.clientX / W - 0.5; tmy = e.clientY / H - 0.5; }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    cancelAnimationFrame(raf);
    if (running) raf = requestAnimationFrame(frame);
  });
  new MutationObserver(palette).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  raf = requestAnimationFrame(frame);
  requestAnimationFrame(() => canvas.classList.add("is-on"));
}
