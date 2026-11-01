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

// Soft chime, synthesised (no audio file). Browsers only allow sound after the
// visitor has clicked, tapped or pressed a key, so we unlock on the first one.
let audio = null;
const unlockAudio = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audio = audio || new Ctx();
  if (audio.state === "suspended") audio.resume();
};
["pointerdown", "keydown", "touchstart"].forEach((type) =>
  window.addEventListener(type, unlockAudio, { passive: true })
);

// one gentle note per arm (a pentatonic scale, so any order sounds pleasant)
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
const chime = (index) => {
  if (!audio || audio.state !== "running") return;
  const now = audio.currentTime;
  const out = audio.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
  out.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  out.connect(audio.destination);
  // fundamental plus a quiet bell-like overtone
  [[1, 1], [2.76, 0.25]].forEach(([ratio, level]) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = NOTES[index] * ratio;
    gain.gain.value = level;
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.95);
  });
};

// Octopus diagram: hovering (or tapping) the hub grows the arms out; while
// they're out, the arm nearest the cursor is focused, chimes, and sprouts
// its sub-points. On phones the arms are a tap-to-expand list instead.
const octo = document.querySelector(".octo");

if (octo) {
  const hub = octo.querySelector(".hub");
  const svg = octo.querySelector(".octo-arms");
  const arms = [...octo.querySelectorAll(".arm")];
  const marks = [...octo.querySelectorAll(".octo-arms > [data-arm], .octo-arms .sub, .subs")];
  const isPhone = () => window.matchMedia("(max-width: 720px)").matches;
  const tips = [...svg.querySelectorAll("circle")].map((c) => ({
    id: c.dataset.arm,
    angle: Math.atan2(c.cy.baseVal.value - 270, c.cx.baseVal.value - 500),
  }));

  const focusArm = (id) => {
    if (id === (octo.dataset.active || null)) return;
    const arm = arms.find((a) => a.dataset.arm === id);
    if (id) {
      octo.dataset.active = id;
      octo.dataset.side = arm.classList.contains("arm-l") ? "l" : "r";
      chime(Number(id) - 1);
    } else {
      delete octo.dataset.active;
      delete octo.dataset.side;
    }
    arms.forEach((a) => a.classList.toggle("on", a.dataset.arm === id));
    marks.forEach((m) => m.classList.toggle("on", m.dataset.arm === id));
  };

  const setOpen = (open) => {
    octo.classList.toggle("open", open);
    hub.setAttribute("aria-expanded", String(open));
    if (!open) focusArm(null);
  };

  hub.addEventListener("mouseenter", () => !isPhone() && setOpen(true));
  hub.addEventListener("focus", () => !isPhone() && setOpen(true));
  hub.addEventListener("click", () => !isPhone() && setOpen(!octo.classList.contains("open")));
  octo.addEventListener("mouseleave", () => setOpen(false));
  octo.addEventListener("focusout", (e) => {
    if (!octo.contains(e.relatedTarget)) setOpen(false);
  });

  octo.addEventListener("mousemove", (e) => {
    if (!octo.classList.contains("open") || isPhone()) return;
    // reading a sub-point or the focused label keeps the focus where it is
    if (e.target.closest(".subs.on, .arm.on")) return;

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

  // keyboard: tabbing onto a label focuses that arm; phones: tap to expand
  arms.forEach((arm) => {
    const button = arm.querySelector(".arm-label");
    button.addEventListener("focus", () => {
      if (isPhone()) return;
      setOpen(true);
      focusArm(arm.dataset.arm);
    });
    button.addEventListener("click", () => {
      if (!isPhone()) return focusArm(arm.dataset.arm);
      const open = arm.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
    });
  });
}
