const archiveStage = document.querySelector(".archive-stage");
const slider = document.querySelector("[data-slider]");
const track = document.querySelector("[data-track]");
const currentLabel = document.querySelector("[data-slide-current]");
const progressBar = document.querySelector("[data-slide-progress]");
const prevButton = document.querySelector("[data-slide-prev]");
const nextButton = document.querySelector("[data-slide-next]");
const cards = Array.from(document.querySelectorAll(".profile-card"));
const nodes = document.querySelectorAll(".node");
const relationNote = document.querySelector("[data-relation-note]");
const revealItems = document.querySelectorAll(".reveal");
const siteHeader = document.querySelector(".site-header");

const autoSlideDelay = 4800;
const leaveDuration = 450;
const leaveStagger = 40;
const enterDuration = 900;
const enterStagger = 90;
const swipeThreshold = 48;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentPage = 0;
let isAnimating = false;
let queuedStep = 0;
let isPaused = false;
let autoSlideTimer;
let touchStartX = 0;
let touchStartY = 0;

// 每頁張數寫在 CSS 的 --per-page（桌面 6、平板 3、手機 2），這裡照著算頁數
function getPerPage() {
  if (!slider) return 1;
  return parseInt(getComputedStyle(slider).getPropertyValue("--per-page"), 10) || 1;
}

function getTotalPages() {
  return Math.ceil(cards.length / getPerPage());
}

function getFirstIndex(page) {
  const perPage = getPerPage();
  return Math.min(page * perPage, Math.max(cards.length - perPage, 0));
}

function getPageCards(page) {
  const first = getFirstIndex(page);
  return cards.slice(first, first + getPerPage());
}

function placeTrack(page) {
  if (!track) return;
  const perPage = getPerPage();
  const first = getFirstIndex(page);
  track.style.transform = `translateX(calc(${-first} * (100% + var(--card-gap)) / ${perPage}))`;
  cards.forEach((card, index) => {
    const visible = index >= first && index < first + perPage;
    card.toggleAttribute("inert", !visible);
    card.setAttribute("aria-hidden", String(!visible));
  });
  if (currentLabel) currentLabel.textContent = `${page + 1} / ${getTotalPages()}`;
}

function staggerClass(pageCards, className) {
  pageCards.forEach((card, index) => {
    card.style.setProperty("--i", index);
    card.classList.add(className);
  });
}

function clearClass(pageCards, className) {
  pageCards.forEach((card) => card.classList.remove(className));
}

// 揭幕換頁：舊卡片依序降下帷幕 → 換到新的一頁 → 新卡片依序升起
function goToSlide(page) {
  const totalPages = getTotalPages();
  const nextPage = (page + totalPages) % totalPages;
  if (nextPage === currentPage) return;
  // 動畫進行中按下的翻頁先記著，等這一頁升起後再接著翻
  if (isAnimating) {
    queuedStep = page - currentPage;
    return;
  }

  cards.forEach((card) => card.classList.remove("is-active"));

  if (reducedMotion.matches) {
    currentPage = nextPage;
    placeTrack(currentPage);
    return;
  }

  isAnimating = true;
  const leaving = getPageCards(currentPage);
  staggerClass(leaving, "is-leaving");

  window.setTimeout(() => {
    clearClass(leaving, "is-leaving");
    currentPage = nextPage;
    placeTrack(currentPage);

    const entering = getPageCards(currentPage);
    staggerClass(entering, "is-entering");

    window.setTimeout(() => {
      clearClass(entering, "is-entering");
      isAnimating = false;

      if (queuedStep) {
        const step = queuedStep;
        queuedStep = 0;
        goToSlide(currentPage + step);
      }
    }, enterDuration + enterStagger * (entering.length - 1));
  }, leaveDuration + leaveStagger * (leaving.length - 1));
}

function restartProgress() {
  if (!progressBar) return;
  progressBar.classList.remove("is-running");
  void progressBar.offsetWidth;
  if (!isPaused && !reducedMotion.matches) progressBar.classList.add("is-running");
}

function resetAutoSlide() {
  window.clearTimeout(autoSlideTimer);
  restartProgress();
  if (!track || isPaused || reducedMotion.matches) return;

  autoSlideTimer = window.setTimeout(() => {
    goToSlide(currentPage + 1);
    resetAutoSlide();
  }, autoSlideDelay);
}

function setPaused(paused) {
  isPaused = paused;
  if (archiveStage) archiveStage.classList.toggle("is-paused", paused);
  if (paused) {
    window.clearTimeout(autoSlideTimer);
  } else {
    resetAutoSlide();
  }
}

function handleUserSlide(step) {
  goToSlide(currentPage + step);
  resetAutoSlide();
}

if (progressBar) progressBar.style.setProperty("--slide-delay", `${autoSlideDelay}ms`);

if (prevButton && nextButton) {
  prevButton.addEventListener("click", () => handleUserSlide(-1));
  nextButton.addEventListener("click", () => handleUserSlide(1));
}

if (archiveStage) {
  // 滑鼠停在卡片上、或用鍵盤瀏覽時暫停自動翻頁，讓人看完再走
  archiveStage.addEventListener("mouseenter", () => setPaused(true));
  archiveStage.addEventListener("mouseleave", () => setPaused(false));
  archiveStage.addEventListener("focusin", () => setPaused(true));
  archiveStage.addEventListener("focusout", (event) => {
    if (!archiveStage.contains(event.relatedTarget)) setPaused(false);
  });
  archiveStage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") handleUserSlide(1);
    if (event.key === "ArrowLeft") handleUserSlide(-1);
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
      const deltaX = touchStartX - event.changedTouches[0].clientX;
      const deltaY = touchStartY - event.changedTouches[0].clientY;

      if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) {
        resetAutoSlide();
        return;
      }

      handleUserSlide(deltaX > 0 ? 1 : -1);
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
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.clearTimeout(autoSlideTimer);
  } else if (!isPaused) {
    resetAutoSlide();
  }
});

window.addEventListener("resize", () => {
  // 換斷點時每頁張數會變，頁碼要跟著收回範圍內
  currentPage = Math.max(0, Math.min(currentPage, getTotalPages() - 1));
  placeTrack(currentPage);
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

window.addEventListener("scroll", updateHeaderState, { passive: true });
placeTrack(currentPage);
updateHeaderState();
resetAutoSlide();
