const archiveStage = document.querySelector(".archive-stage");
const slider = document.querySelector("[data-slider]");
const track = document.querySelector("[data-track]");
const currentLabel = document.querySelector("[data-slide-current]");
const prevButton = document.querySelector("[data-slide-prev]");
const nextButton = document.querySelector("[data-slide-next]");
const cards = document.querySelectorAll(".profile-card");
const nodes = document.querySelectorAll(".node");
const relationNote = document.querySelector("[data-relation-note]");
const revealItems = document.querySelectorAll(".reveal");
const siteHeader = document.querySelector(".site-header");

let currentPage = 0;
const totalPages = 3;
const autoSlideDelay = 4800;
const renderFadeDuration = 420;
const renderInDuration = 720;
const swipeThreshold = 48;
let autoSlideTimer;
let renderTimer;
let renderInTimer;
let touchStartX = 0;
let touchStartY = 0;

function isDesktopSlider() {
  return window.matchMedia("(min-width: 1081px)").matches;
}

function updateSlider(behavior = "smooth") {
  if (!track) return;

  if (isDesktopSlider()) {
    track.style.transform = `translateX(calc(${currentPage * -100}% - ${currentPage * 20}px))`;
  } else {
    track.style.transform = "translateX(0)";

    if (slider) {
      slider.scrollTo({
        left: currentPage * slider.clientWidth,
        behavior,
      });
    }
  }

  if (currentLabel) currentLabel.textContent = `${currentPage + 1} / ${totalPages}`;
}

function goToSlide(page, behavior = "smooth") {
  currentPage = (page + totalPages) % totalPages;
  updateSlider(behavior);
}

function goToNextSlide() {
  goToSlide(currentPage + 1);
}

function goToPreviousSlide() {
  goToSlide(currentPage - 1);
}

function renderToNextSlide() {
  if (!archiveStage) {
    goToNextSlide();
    return;
  }

  window.clearTimeout(renderTimer);
  window.clearTimeout(renderInTimer);
  archiveStage.classList.remove("is-rendering-in");
  archiveStage.classList.add("is-rendering-out");

  renderTimer = window.setTimeout(() => {
    goToSlide(currentPage + 1, "auto");
    archiveStage.classList.remove("is-rendering-out");
    archiveStage.classList.add("is-rendering-in");

    renderInTimer = window.setTimeout(() => {
      archiveStage.classList.remove("is-rendering-in");
    }, renderInDuration);
  }, renderFadeDuration);
}

function resetAutoSlide() {
  window.clearTimeout(autoSlideTimer);

  if (!track) return;
  autoSlideTimer = window.setTimeout(() => {
    renderToNextSlide();
    resetAutoSlide();
  }, autoSlideDelay);
}

function handleUserSlide(action) {
  action();
  resetAutoSlide();
}

if (prevButton && nextButton) {
  prevButton.addEventListener("click", () => {
    handleUserSlide(goToPreviousSlide);
  });

  nextButton.addEventListener("click", () => {
    handleUserSlide(goToNextSlide);
  });
}

if (slider) {
  slider.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );

  slider.addEventListener(
    "touchend",
    (event) => {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      const deltaX = touchStartX - touchEndX;
      const deltaY = touchStartY - touchEndY;

      if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) {
        resetAutoSlide();
        return;
      }

      handleUserSlide(deltaX > 0 ? goToNextSlide : goToPreviousSlide);
    },
    { passive: true }
  );
}

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((item) => {
      if (item !== card) item.classList.remove("is-active");
    });
    card.classList.toggle("is-active");
    resetAutoSlide();
  });
});

nodes.forEach((node) => {
  const showRelation = () => {
    if (relationNote) relationNote.textContent = node.dataset.relation;
  };

  node.addEventListener("mouseenter", showRelation);
  node.addEventListener("focus", showRelation);
  node.addEventListener("click", showRelation);
});

if (revealItems.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function updateHeaderState() {
  if (!siteHeader) return;
  siteHeader.classList.toggle("is-expanded", window.scrollY > 24);
}

window.addEventListener("resize", () => updateSlider("auto"));
window.addEventListener("scroll", updateHeaderState, { passive: true });
updateSlider("auto");
updateHeaderState();
resetAutoSlide();
