// Footer timepiece: sweeps the analog hands, drives the LCD window and the date/day bar — in the visitor's local time.
const MAP = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg", " ": "" };

export function start(root) {
  const svg = root.querySelector(".watch__svg");
  if (!svg) return;
  // the photographic peacock dial loads only now, when the footer is near the screen
  const dial = svg.querySelector("image[data-href]");
  if (dial) dial.setAttribute("href", dial.getAttribute("data-href"));
  const hand = (k) => svg.querySelector(`[data-hand="${k}"]`);
  const H = hand("h"), M = hand("m"), S = hand("s");
  const cells = [...svg.querySelectorAll("[data-d]")].sort((a, b) => a.dataset.d - b.dataset.d);
  const ap = svg.querySelector("[data-ap]");
  const dateEl = root.querySelector("[data-tp-date]"), dayEl = root.querySelector("[data-tp-day]");
  const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const setDigit = (g, ch) => {
    if (g.dataset.on === ch) return;
    g.dataset.on = ch;
    const on = MAP[ch] || "";
    for (const p of g.children) p.classList.toggle("on", on.includes(p.dataset.s));
  };
  let raf = 0, last = -1, lastDay = "";
  const frame = () => {
    const now = new Date();
    const ms = now.getMilliseconds(), sec = now.getSeconds();
    const s = sec + (smooth ? ms / 1000 : 0), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
    S.setAttribute("transform", `rotate(${(s * 6).toFixed(2)} 200 200)`);
    M.setAttribute("transform", `rotate(${(m * 6).toFixed(2)} 200 200)`);
    H.setAttribute("transform", `rotate(${(h * 30).toFixed(2)} 200 200)`);
    if (sec !== last) {
      last = sec;
      const hr = now.getHours() % 12 || 12;
      const hh = String(hr).padStart(2, " "), mm = String(now.getMinutes()).padStart(2, "0"), ss = String(sec).padStart(2, "0");
      [hh[0], hh[1], mm[0], mm[1], ss[0], ss[1]].forEach((ch, i) => cells[i] && setDigit(cells[i], ch));
      if (ap) ap.textContent = now.getHours() < 12 ? "AM" : "PM";
      const key = now.toDateString();
      if (key !== lastDay) {
        lastDay = key;
        const wd = now.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase();
        const d = now.toLocaleDateString("en-IN", { day: "2-digit" });
        const mo = now.toLocaleDateString("en-IN", { month: "short" }).toUpperCase().slice(0, 3);
        dateEl.textContent = `${wd}, ${d} ${mo} ${now.getFullYear()}`;
        dateEl.setAttribute("datetime", now.toISOString().slice(0, 10));
        dayEl.textContent = now.toLocaleDateString("en-IN", { weekday: "long" }).toUpperCase();
      }
    }
    raf = requestAnimationFrame(frame);
  };
  const run = (on) => { cancelAnimationFrame(raf); raf = on ? requestAnimationFrame(frame) : 0; };
  frame(); // paint immediately, then keep time only while visible
  run(false);
  if ("IntersectionObserver" in window) new IntersectionObserver((en) => run(en.some((e) => e.isIntersecting))).observe(root);
  else run(true);
  document.addEventListener("visibilitychange", () => { if (document.hidden) run(false); else if (root.getBoundingClientRect().top < innerHeight) run(true); });
}
