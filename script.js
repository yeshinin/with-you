// Fade sections in as they scroll into view, one after another
const revealed = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.35, rootMargin: "0px 0px -10% 0px" }
  );
  revealed.forEach((el) => observer.observe(el));
} else {
  revealed.forEach((el) => el.classList.add("is-visible"));
}

// Six-ways carousel: arrow buttons, mouse drag, and arrow state at the ends
const carousel = document.querySelector(".carousel");

if (carousel) {
  const arrows = document.querySelectorAll(".arrow");
  const step = () => carousel.querySelector(".slide").offsetWidth + 20;

  // Remember where we're heading so quick repeated clicks add up
  let target = null;
  let clearTarget;
  arrows.forEach((btn) =>
    btn.addEventListener("click", () => {
      const max = carousel.scrollWidth - carousel.clientWidth;
      const base = target ?? carousel.scrollLeft;
      const index = Math.round(base / step()) + Number(btn.dataset.dir);
      target = Math.min(max, Math.max(0, index * step()));
      carousel.scrollTo({ left: target, behavior: "smooth" });
      clearTimeout(clearTarget);
      clearTarget = setTimeout(() => (target = null), 700);
    })
  );

  const updateArrows = () => {
    const max = carousel.scrollWidth - carousel.clientWidth - 2;
    arrows[0].disabled = carousel.scrollLeft <= 2;
    arrows[1].disabled = carousel.scrollLeft >= max;
  };
  carousel.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  updateArrows();

  // Click-and-drag scrolling for mouse users (touch already swipes natively)
  let startX = 0;
  let startScroll = 0;
  let dragging = false;
  carousel.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    dragging = true;
    startX = e.clientX;
    startScroll = carousel.scrollLeft;
    carousel.setPointerCapture(e.pointerId);
  });
  carousel.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) > 4) carousel.classList.add("dragging");
    carousel.scrollLeft = startScroll - (e.clientX - startX);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    // re-enable snapping, then settle on the nearest card
    const nearest = Math.round(carousel.scrollLeft / step()) * step();
    carousel.classList.remove("dragging");
    carousel.scrollTo({ left: nearest, behavior: "smooth" });
  };
  carousel.addEventListener("pointerup", endDrag);
  carousel.addEventListener("pointercancel", endDrag);
}

// Octopus diagram: hovering (or tapping) the hub grows the arms out; while
// they're out, the arm nearest the cursor is highlighted
const octo = document.querySelector(".octo");

if (octo) {
  const hub = octo.querySelector(".hub");
  const svg = octo.querySelector(".octo-arms");
  const arms = [...octo.querySelectorAll(".arm")];
  const marks = [...octo.querySelectorAll(".octo-arms [data-arm]")];
  const tips = [...svg.querySelectorAll("circle")].map((c) => ({
    id: c.dataset.arm,
    angle: Math.atan2(c.cy.baseVal.value - 270, c.cx.baseVal.value - 500),
  }));

  const focusArm = (id) => {
    if (id === (octo.dataset.active || null)) return;
    if (id) octo.dataset.active = id;
    else delete octo.dataset.active;
    arms.forEach((arm) => arm.classList.toggle("on", arm.dataset.arm === id));
    marks.forEach((mark) => mark.classList.toggle("on", mark.dataset.arm === id));
  };

  const setOpen = (open) => {
    octo.classList.toggle("open", open);
    hub.setAttribute("aria-expanded", String(open));
    if (!open) focusArm(null);
  };

  hub.addEventListener("mouseenter", () => setOpen(true));
  hub.addEventListener("focus", () => setOpen(true));
  hub.addEventListener("click", () => setOpen(!octo.classList.contains("open")));
  hub.addEventListener("blur", () => setOpen(false));
  octo.addEventListener("mouseleave", () => setOpen(false));

  // phones have no hover: tap a label to open or close its sub-points
  arms.forEach((arm) =>
    arm.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 720px)").matches) arm.classList.toggle("open");
    })
  );

  octo.addEventListener("mousemove", (e) => {
    if (!octo.classList.contains("open") || window.matchMedia("(max-width: 720px)").matches) return;
    // reading the open label keeps the focus where it is
    if (e.target.closest(".arm.on")) return;
    const box = hub.getBoundingClientRect();
    const overHub = e.clientX > box.left && e.clientX < box.right && e.clientY > box.top && e.clientY < box.bottom;
    if (overHub) return focusArm(null);

    // convert the cursor into the SVG's 1000×540 space and pick the closest arm by angle
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 1000;
    const y = ((e.clientY - r.top) / r.height) * 540;
    const angle = Math.atan2(y - 270, x - 500);
    const gap = (a) => Math.abs(Math.atan2(Math.sin(a - angle), Math.cos(a - angle)));
    const nearest = tips.reduce((best, tip) => (gap(tip.angle) < gap(best.angle) ? tip : best));
    focusArm(nearest.id);
  });
}

// Phone menu: the button toggles the nav links; picking a link closes it
const header = document.querySelector(".nav");
const menuButton = document.querySelector(".menu-toggle");

if (header && menuButton) {
  const setMenu = (open) => {
    header.classList.toggle("menu-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
  };
  menuButton.addEventListener("click", () => setMenu(!header.classList.contains("menu-open")));
  header.querySelectorAll(".nav-links a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
}

// What's different billboard: one example at a time, rotating on its own.
// The active dot's progress bar times each example; when it fills, the next one shows.
// Hovering or focusing pauses it, and reduced motion keeps it still.
const billboard = document.querySelector(".billboard");
if (billboard) {
  const card = billboard.closest(".diff-card");
  const slides = [...billboard.querySelectorAll(".bb-slide")];
  const dots = [...card.querySelectorAll(".bb-dot")];
  let current = 0;

  const show = (i) => {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      s.classList.toggle("is-on", n === current);
      s.toggleAttribute("aria-hidden", n !== current);
    });
    dots.forEach((d) => {
      d.classList.remove("is-on");
      d.removeAttribute("aria-current");
    });
    void dots[current].offsetWidth; // restart the progress bar
    dots[current].classList.add("is-on");
    dots[current].setAttribute("aria-current", "true");
  };

  dots.forEach((d, n) => {
    d.addEventListener("click", () => show(n));
    d.addEventListener("animationend", () => show(current + 1));
  });
  const pause = () => card.classList.add("billboard-paused");
  const resume = () => card.classList.remove("billboard-paused");
  billboard.addEventListener("mouseenter", pause);
  billboard.addEventListener("mouseleave", resume);
  card.addEventListener("focusin", pause);
  card.addEventListener("focusout", resume);
}

// Partners page charts: bars grow in and big numbers count up, once, when the
// chart scrolls into view. The final values are already in the HTML, so the
// charts read correctly if this never runs or motion is reduced.
const charts = document.querySelectorAll("[data-chart]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (charts.length && "IntersectionObserver" in window && !reduceMotion) {
  document.documentElement.classList.add("charts-anim");
  const counters = document.querySelectorAll("[data-chart] [data-to]");
  counters.forEach((el) => (el.textContent = "0"));

  const countUp = (el) => {
    const to = parseFloat(el.dataset.to);
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 1300);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const chartObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        entry.target.querySelectorAll("[data-to]").forEach(countUp);
        chartObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );
  charts.forEach((c) => chartObserver.observe(c));
}

// Partners page impact calculator: outputs update as the inputs change
const calc = document.querySelector("[data-calc]");

if (calc) {
  const read = (name) => {
    const v = parseFloat(calc.elements[name].value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(v) ? v : 0;
  };
  const update = () => {
    const avoided = read("discharges") * (read("rate") / 100) * (read("reduction") / 100);
    const saved = avoided * read("cost");
    calc.elements.avoided.value = (Math.round(avoided * 10) / 10).toLocaleString("en-US");
    calc.elements.saved.value = "$" + Math.round(saved).toLocaleString("en-US");
  };
  calc.addEventListener("input", update);
  calc.addEventListener("submit", (e) => e.preventDefault());
  // tidy thousands separators once a field is left
  calc.querySelectorAll("[data-commas]").forEach((input) =>
    input.addEventListener("change", () => {
      const v = read(input.name);
      if (v) input.value = v.toLocaleString("en-US");
    })
  );
  update();
}
