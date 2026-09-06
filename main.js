/* =====================================================================
   Bapan Ghosh — Portfolio · main.js
   1) Three.js physics-based 3D background
      (Newtonian particle field: Brownian motion + cursor force-field +
       damping, linked into a live mesh — reacts like a real simulation)
   2) All UI interactions (nav, tour, project modals, certificate viewer…)
   ===================================================================== */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 820px)").matches;

  /* =================================================================
     1. THREE.JS  —  physics particle field
  ================================================================== */
  function initBackground() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas || typeof THREE === "undefined") return; // CSS gradient fallback

    const RED = 0xe10600;
    const WHITE = 0xffffff;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: !isMobile,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08080a, 0.05);

    const camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 100
    );
    camera.position.z = 16;

    // rotating wireframe solids live in their own group
    const solidGroup = new THREE.Group();
    scene.add(solidGroup);

    /* ---- soft circular sprite for particle points ---- */
    function makeDotTexture() {
      const s = 64;
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      const t = new THREE.Texture(c);
      t.needsUpdate = true;
      return t;
    }
    const dotTex = makeDotTexture();

    /* ---- particle field (the "simulation") ---- */
    const N = prefersReduced ? 40 : isMobile ? 55 : 100;
    const BX = 24, BY = 15, BZ = 12;          // simulation bounds (half-extents)
    const LINK = isMobile ? 4.4 : 4.8;         // link distance
    const K_BROWNIAN = prefersReduced ? 0.002 : 0.006;
    const DAMP = 0.94;
    const MOUSE_R = 6.5;                        // cursor force radius
    const MOUSE_F = prefersReduced ? 0 : 0.9;   // cursor force strength

    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2 * BX;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2 * BY;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * BZ;
    }

    // points
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const ptCol = new Float32Array(N * 3);
    const cRed = new THREE.Color(RED), cWhite = new THREE.Color(WHITE);
    for (let i = 0; i < N; i++) {
      const c = Math.random() < 0.34 ? cRed : cWhite;
      ptCol[i * 3] = c.r; ptCol[i * 3 + 1] = c.g; ptCol[i * 3 + 2] = c.b;
    }
    ptGeo.setAttribute("color", new THREE.BufferAttribute(ptCol, 3));
    const points = new THREE.Points(
      ptGeo,
      new THREE.PointsMaterial({
        size: isMobile ? 0.4 : 0.32,
        map: dotTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    scene.add(points);

    // links
    const MAX_LINKS = N * 7;
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(MAX_LINKS * 6);
    const lineCol = new Float32Array(MAX_LINKS * 6);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    scene.add(lines);

    /* ---- rotating wireframe solids ---- */
    const solids = [];
    function addSolid(geo, color, pos3) {
      const mesh = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.26 })
      );
      mesh.position.set(pos3.x, pos3.y, pos3.z);
      mesh.userData.spin = new THREE.Vector3(
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.004
      );
      solidGroup.add(mesh);
      solids.push(mesh);
    }
    if (!prefersReduced) {
      addSolid(new THREE.IcosahedronGeometry(2.6, 0), RED, { x: -11, y: 4, z: -5 });
      addSolid(new THREE.OctahedronGeometry(2.1, 0), WHITE, { x: 11, y: -4, z: -7 });
      if (!isMobile) {
        addSolid(new THREE.TorusGeometry(2.2, 0.55, 8, 24), RED, { x: 8, y: 6, z: -10 });
        addSolid(new THREE.DodecahedronGeometry(1.9, 0), WHITE, { x: -9, y: -6, z: -11 });
      }
    }

    /* ---- cursor as a force field (unproject to z=0 plane) ---- */
    const mouseNDC = new THREE.Vector2(0, 0);
    let mouseActive = false;
    const mouseWorld = new THREE.Vector3(0, 0, 0);
    const _v = new THREE.Vector3();
    function updateMouseWorld() {
      _v.set(mouseNDC.x, mouseNDC.y, 0.5).unproject(camera);
      _v.sub(camera.position).normalize();
      const dist = -camera.position.z / _v.z;
      mouseWorld.copy(camera.position).add(_v.multiplyScalar(dist));
    }
    window.addEventListener("pointermove", (e) => {
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseActive = true;
    }, { passive: true });
    window.addEventListener("pointerleave", () => (mouseActive = false), { passive: true });

    let scrollN = 0;
    window.addEventListener("scroll", () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scrollN = max > 0 ? window.scrollY / max : 0;
    }, { passive: true });

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize, { passive: true });

    /* ---- simulation + render loop ---- */
    let raf = null, running = true;
    const clock = new THREE.Clock();
    let camX = 0, camY = 0;

    function frame() {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const t = clock.getElapsedTime();
      updateMouseWorld();

      // integrate particle physics
      for (let i = 0; i < N; i++) {
        const ix = i * 3, iy = ix + 1, iz = ix + 2;
        // Brownian random force
        vel[ix] += (Math.random() - 0.5) * K_BROWNIAN;
        vel[iy] += (Math.random() - 0.5) * K_BROWNIAN;
        vel[iz] += (Math.random() - 0.5) * K_BROWNIAN;
        // cursor repulsion (inverse-square, in xy)
        if (mouseActive && MOUSE_F) {
          const dx = pos[ix] - mouseWorld.x;
          const dy = pos[iy] - mouseWorld.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_R * MOUSE_R && d2 > 0.001) {
            const f = (MOUSE_F * (1 - Math.sqrt(d2) / MOUSE_R)) / Math.sqrt(d2);
            vel[ix] += dx * f;
            vel[iy] += dy * f;
          }
        }
        // damping
        vel[ix] *= DAMP; vel[iy] *= DAMP; vel[iz] *= DAMP;
        // integrate
        pos[ix] += vel[ix]; pos[iy] += vel[iy]; pos[iz] += vel[iz];
        // soft-bounce at bounds (elastic walls)
        if (pos[ix] > BX) { pos[ix] = BX; vel[ix] *= -0.8; }
        else if (pos[ix] < -BX) { pos[ix] = -BX; vel[ix] *= -0.8; }
        if (pos[iy] > BY) { pos[iy] = BY; vel[iy] *= -0.8; }
        else if (pos[iy] < -BY) { pos[iy] = -BY; vel[iy] *= -0.8; }
        if (pos[iz] > BZ) { pos[iz] = BZ; vel[iz] *= -0.8; }
        else if (pos[iz] < -BZ) { pos[iz] = -BZ; vel[iz] *= -0.8; }
      }
      ptGeo.attributes.position.needsUpdate = true;

      // rebuild links between nearby particles
      let li = 0;
      const lp = lineGeo.attributes.position.array;
      const lc = lineGeo.attributes.color.array;
      const LINK2 = LINK * LINK;
      for (let a = 0; a < N; a++) {
        const ax = a * 3;
        for (let b = a + 1; b < N; b++) {
          if (li >= MAX_LINKS) break;
          const bx = b * 3;
          const dx = pos[ax] - pos[bx];
          const dy = pos[ax + 1] - pos[bx + 1];
          const dz = pos[ax + 2] - pos[bx + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < LINK2) {
            const alpha = 1 - Math.sqrt(d2) / LINK;
            const o = li * 6;
            lp[o] = pos[ax]; lp[o + 1] = pos[ax + 1]; lp[o + 2] = pos[ax + 2];
            lp[o + 3] = pos[bx]; lp[o + 4] = pos[bx + 1]; lp[o + 5] = pos[bx + 2];
            const r = 0.88 * alpha, g = 0.07 * alpha, bl = 0.06 * alpha;
            lc[o] = r; lc[o + 1] = g; lc[o + 2] = bl;
            lc[o + 3] = r; lc[o + 4] = g; lc[o + 5] = bl;
            li++;
          }
        }
      }
      lineGeo.setDrawRange(0, li * 2);
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;

      // spin solids + drift
      solids.forEach((s) => {
        s.rotation.x += s.userData.spin.x;
        s.rotation.y += s.userData.spin.y;
        s.rotation.z += s.userData.spin.z;
        s.position.y += Math.sin(t * 0.4 + s.position.x) * 0.0025;
      });
      solidGroup.rotation.y = t * 0.03;

      // gentle camera parallax + scroll dolly
      const tx = mouseNDC.x * 1.6, ty = mouseNDC.y * 1.0;
      camX += (tx - camX) * 0.04;
      camY += (ty - camY) * 0.04;
      camera.position.x = camX;
      camera.position.y = camY;
      camera.position.z = 16 - scrollN * 5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    frame();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        clock.getDelta();
        frame();
      }
    });
  }

  /* =================================================================
     2. UI INTERACTIONS
  ================================================================== */
  function initUI() {
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    const yearEl = $("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* scroll progress */
    const progress = $("#scroll-progress");
    const onScrollProgress = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (progress) progress.style.width = p + "%";
    };
    window.addEventListener("scroll", onScrollProgress, { passive: true });
    onScrollProgress();

    /* header shrink */
    const header = $("#site-header");
    window.addEventListener("scroll",
      () => header && header.classList.toggle("scrolled", window.scrollY > 40),
      { passive: true });

    /* mobile menu */
    const menuBtn = $("#menu-toggle");
    const mobileNav = $("#mobile-nav");
    const closeMenu = () => {
      menuBtn && menuBtn.classList.remove("open");
      mobileNav && mobileNav.classList.remove("open");
      menuBtn && menuBtn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("no-scroll");
    };
    if (menuBtn && mobileNav) {
      menuBtn.addEventListener("click", () => {
        const open = mobileNav.classList.toggle("open");
        menuBtn.classList.toggle("open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("no-scroll", open);
      });
      $$("a", mobileNav).forEach((a) => a.addEventListener("click", closeMenu));
    }

    /* smooth scroll */
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id === "#" || id.length < 2) return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          const y = target.getBoundingClientRect().top + window.scrollY - 74;
          window.scrollTo({ top: y, behavior: prefersReduced ? "auto" : "smooth" });
        }
      });
    });

    /* scroll-spy */
    const sections = $$("section[id]");
    const navLinks = $$(".nav-link");
    const spy = () => {
      let cur = "";
      const y = window.scrollY + 120;
      sections.forEach((s) => { if (y >= s.offsetTop) cur = s.id; });
      navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + cur));
    };
    window.addEventListener("scroll", spy, { passive: true });
    spy();

    /* reveal on scroll */
    const revealEls = $$("[data-reveal]");
    if ("IntersectionObserver" in window && !prefersReduced) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add("in"));
    }

    /* typing role */
    const typedEl = $("#typed-role");
    if (typedEl && !prefersReduced) {
      const roles = JSON.parse(typedEl.dataset.roles || "[]");
      let ri = 0, ci = 0, deleting = false;
      const tick = () => {
        const word = roles[ri] || "";
        typedEl.textContent = word.slice(0, ci);
        if (!deleting && ci < word.length) { ci++; setTimeout(tick, 70); }
        else if (!deleting && ci === word.length) { deleting = true; setTimeout(tick, 1500); }
        else if (deleting && ci > 0) { ci--; setTimeout(tick, 35); }
        else { deleting = false; ri = (ri + 1) % roles.length; setTimeout(tick, 300); }
      };
      tick();
    } else if (typedEl) {
      const roles = JSON.parse(typedEl.dataset.roles || "[]");
      typedEl.textContent = roles[0] || "";
    }

    /* animated counters */
    const counters = $$("[data-count]");
    if (counters.length) {
      const run = (el) => {
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const dur = 1400, start = performance.now();
        const step = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step); else el.textContent = target + suffix;
        };
        requestAnimationFrame(step);
      };
      if ("IntersectionObserver" in window) {
        const cio = new IntersectionObserver((entries) => {
          entries.forEach((en) => { if (en.isIntersecting) { run(en.target); cio.unobserve(en.target); } });
        }, { threshold: 0.5 });
        counters.forEach((c) => cio.observe(c));
      } else counters.forEach(run);
    }

    /* project filter */
    const filterBtns = $$(".filter-btn");
    const projectCards = $$(".project-card");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const f = btn.dataset.filter;
        projectCards.forEach((card) => {
          const show = f === "all" || (card.dataset.cat || "").split(" ").includes(f);
          card.style.display = show ? "" : "none";
        });
      });
    });

    /* project modal */
    const modal = $("#project-modal");
    const modalBody = $("#modal-body");
    const modalClose = $("#modal-close");
    const openModal = (card) => {
      const full = card.querySelector(".project-full");
      if (!full || !modal || !modalBody) return;
      modalBody.innerHTML = full.innerHTML;
      modal.classList.add("open");
      modalBody.parentElement.scrollTop = 0;
      document.body.classList.add("no-scroll");
      modalClose && modalClose.focus();
    };
    const closeModal = () => {
      modal && modal.classList.remove("open");
      document.body.classList.remove("no-scroll");
    };
    $$(".btn-details").forEach((b) =>
      b.addEventListener("click", () => openModal(b.closest(".project-card"))));
    modalClose && modalClose.addEventListener("click", closeModal);
    modal && modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    /* certificate viewer (eye button -> lightbox) */
    const eyeBtns = $$(".cert-eye");
    const certList = eyeBtns.map((b) => ({ img: b.dataset.img, title: b.dataset.title || "Certificate" }));
    const lightbox = $("#lightbox");
    const lightboxImg = $("#lightbox-img");
    const lbClose = $("#lightbox-close");
    const lbPrev = $("#lightbox-prev");
    const lbNext = $("#lightbox-next");
    const lbCounter = $("#lightbox-counter");
    const lbTitle = $("#lightbox-title");
    let lbIndex = 0;
    const showLb = (i) => {
      if (!certList.length) return;
      lbIndex = (i + certList.length) % certList.length;
      if (lightboxImg) lightboxImg.src = certList[lbIndex].img;
      if (lbTitle) lbTitle.textContent = certList[lbIndex].title;
      if (lbCounter) lbCounter.textContent = `${lbIndex + 1} / ${certList.length}`;
    };
    eyeBtns.forEach((b, i) => b.addEventListener("click", () => {
      showLb(i);
      lightbox && lightbox.classList.add("show");
      document.body.classList.add("no-scroll");
    }));
    const closeLb = () => {
      lightbox && lightbox.classList.remove("show");
      document.body.classList.remove("no-scroll");
    };
    lbClose && lbClose.addEventListener("click", closeLb);
    lbPrev && lbPrev.addEventListener("click", () => showLb(lbIndex - 1));
    lbNext && lbNext.addEventListener("click", () => showLb(lbIndex + 1));
    lightbox && lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLb(); });

    /* keyboard */
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeModal(); closeLb(); closeMenu(); }
      if (lightbox && lightbox.classList.contains("show")) {
        if (e.key === "ArrowRight") showLb(lbIndex + 1);
        if (e.key === "ArrowLeft") showLb(lbIndex - 1);
      }
    });

    /* back to top */
    const toTop = $("#to-top");
    window.addEventListener("scroll",
      () => toTop && toTop.classList.toggle("show", window.scrollY > 600),
      { passive: true });
    toTop && toTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" }));

    /* toast */
    const toast = (msg, ok = true) => {
      const t = $("#toast");
      if (!t) return;
      t.textContent = msg;
      t.className = "toast show " + (ok ? "ok" : "err");
      setTimeout(() => (t.className = "toast"), 4000);
    };

    /* contact form (AJAX) */
    const form = $("#contact-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const label = btn ? btn.innerHTML : "";
        if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
        try {
          const res = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { Accept: "application/json" },
            body: new FormData(form),
          });
          const data = await res.json();
          if (data.success) { toast("Thanks! Your message was sent. 🚀", true); form.reset(); }
          else toast("Something went wrong. Please email me directly.", false);
        } catch (err) {
          toast("Network error. Please email me directly.", false);
        } finally {
          if (btn) { btn.disabled = false; btn.innerHTML = label; }
        }
      });
    }

    initTour($, $$);
  }

  /* =================================================================
     3. GUIDED TOUR
  ================================================================== */
  function initTour($, $$) {
    const overlay = $("#tour-overlay");
    const card = $("#tour-card");
    if (!overlay || !card) return;
    const emoji = $("#tour-emoji"), title = $("#tour-title"), text = $("#tour-text");
    const next = $("#tour-next"), skip = $("#tour-skip"), progress = $("#tour-progress");
    const restart = $("#tour-restart"), header = $("#site-header");

    const steps = [
      { emoji: "👋", title: "Welcome!", text: "First time here? A quick 25-second tour so you find everything fast. Skip anytime.", target: null, btn: "Show me 🚀" },
      { emoji: "🧭", title: "Quick Navigation", text: "Jump to any section instantly — About, Skills, Projects, Certificates & Contact.", target: ".nav-desktop" },
      { emoji: "🚀", title: "Real, Shipped Projects", text: "Rescuen is LIVE on the Play Store. Every project has a “View Details” with its architecture, features & metrics.", target: "#projects" },
      { emoji: "🎓", title: "Verified Credentials", text: "Oracle, IBM, Microsoft, Kaggle & more — click the 👁 on any card to view the real certificate.", target: "#certificates" },
      { emoji: "📬", title: "Let's Connect", text: "Looking for an intern or a driven developer? Message, call or WhatsApp me — I reply fast. Thanks for visiting! 🙌", target: "#contact", btn: "Start exploring 🔥" },
    ];

    let idx = 0, hl = null;
    const clearHl = () => { if (hl) hl.classList.remove("tour-highlight"); hl = null; header && header.classList.remove("tour-raise"); };
    const show = (i) => {
      const s = steps[i];
      clearHl();
      emoji.textContent = s.emoji; title.textContent = s.title; text.textContent = s.text;
      next.textContent = s.btn || (i === steps.length - 1 ? "Done 🎉" : "Next ➜");
      skip.style.display = i === steps.length - 1 ? "none" : "inline-block";
      progress.innerHTML = "";
      steps.forEach((_, d) => {
        const dot = document.createElement("span");
        dot.className = "tour-dot" + (d === i ? " active" : "");
        progress.appendChild(dot);
      });
      if (s.target) {
        const el = document.querySelector(s.target);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          hl = el; el.classList.add("tour-highlight");
          if (el.closest("header")) header && header.classList.add("tour-raise");
        }
        card.classList.remove("center");
      } else { window.scrollTo({ top: 0, behavior: "smooth" }); card.classList.add("center"); }
      card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop");
    };
    const start = () => { idx = 0; overlay.classList.add("active"); card.classList.add("active"); show(0); };
    const end = () => {
      clearHl(); overlay.classList.remove("active"); card.classList.remove("active");
      try { localStorage.setItem("bapanTourDone", "yes"); } catch (e) {}
    };
    next.addEventListener("click", () => { if (idx >= steps.length - 1) return end(); idx++; show(idx); });
    skip.addEventListener("click", end);
    restart && restart.addEventListener("click", start);
    overlay.addEventListener("click", end);
    let seen = false;
    try { seen = localStorage.getItem("bapanTourDone") === "yes"; } catch (e) {}
    if (!seen) setTimeout(start, 1400);
  }

  /* boot */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { initBackground(); initUI(); });
  } else { initBackground(); initUI(); }
})();
