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
    if (!octo.classList.contains("open")) return;
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
