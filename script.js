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
