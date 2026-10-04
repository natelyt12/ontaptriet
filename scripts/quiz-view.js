/**
 * Module: Giao diện Làm bài thi - Vertical Snap Carousel (scripts/quiz-view.js)
 *
 * Architecture:
 * - All .quiz-slide elements have natural height (content-driven, no fixed height)
 * - .quiz-carousel-track translateY positions the current slide at vertical center of viewport
 * - Scroll & Physics: Critically Damped Spring Engine (ported from Yume CarouselEngine & physics.js)
 *   → continuousIndex float position, preserves velocity on retargeting (zero stutter/jitter)
 *   → wheel accumulator pattern: accumulates delta, triggers snap when |acc| >= WHEEL_THRESHOLD (150)
 *   → touch drag with smooth velocity sampling and spring momentum release
 * - Opacity: Continuous interpolation based on distance from center (1.0 at center, 0.4 floor)
 * - ALWAYS CENTERED: track has top padding = viewportH/2 - firstSlideH/2 so slide 0 is centered
 * - After answering, AUTO_ADVANCE_DELAY ms → advanceCarousel()
 * - No "Next question" button
 */

/* ─── State ─── */
let isBackConfirming = false;
let backResetTimer = null;
let copyResetTimer = null;
window.quizIsDragMoved = false;

/* Carousel Physics State (Critically Damped Spring — ported from Yume CarouselEngine) */
let continuousIndex = 0; // Virtual float position
let hardIndex = 0; // Settled integer slide index
let softIndex = 0; // Closest integer index during motion
let targetSlideIdx = 0; // Destination slide index
let viewSlideIdx = 0; // Active slide index for copy / status bar
let scrollCurrentY = 0; // Currently applied translateY (pixels)

let animRafId = null; // rAF handle for spring loop
let animState = null; // { target, vx, lastMs, onSettle }

/* Physics Constants */
const SCROLL_DURATION = 600; // ms — time for spring to settle
const SPRING_OMEGA = 10; // Spring frequency multiplier (settles at ~0.96 * duration)
const SPRING_MAX_STEP_MS = 100; // Max dt step to avoid leap on tab pause
const SPRING_POS_EPS = 0.001; // Position threshold for rest
const SPRING_VEL_EPS = 0.01; // Velocity threshold for rest

/* Wheel Accumulator */
let wheelAccumulator = 0;
let wheelResetTimer = null;
const WHEEL_THRESHOLD = 40; // Accumulated delta to trigger one step
const WHEEL_RESET_MS = 250; // Timeout to clear accumulator

/* Drag & Momentum Constants (ported from Yume physics.js) */
const DRAG_STEP = 300; // Drag distance in px per slide
const FLICK_VELOCITY = 4; // Velocity threshold for flick
const FLICK_MIN_DISTANCE = 25; // Minimum drag px to qualify as flick
const EDGE_RESISTANCE = 0.25; // Rubber-band resistance at list edges
const DRAG_DEAD_ZONE = 4; // px threshold before considering a drag move
const DRAG_VELOCITY_SMOOTH = 0.4; // Smoothing factor for release velocity
const RELEASE_DECAY_MS = 80; // Velocity decay time when holding still before release
const MAX_FLICK_OVERSHOOT = 0.25; // Max overshoot clamp (in slides)

/* Geometry */
let slideTopMap = []; // slideTopMap[i]    = offsetTop of slide i relative to track
let slideHeightMap = []; // slideHeightMap[i] = offsetHeight of slide i
let viewportH = 0; // available height (window - header - statusbar)
let trackPaddingTop = 0; // extra top padding added to track so slide 0 is centered

/* DOM references */
let carouselTrack = null;
let carouselViewport = null;

/* Timers */
let advanceTimer = null;

/* Constants */
const AUTO_ADVANCE_DELAY = 600; // ms after answering before auto-advance

/* ─── Clipboard / Status Bar ─── */

function resetBackBtnState() {
  isBackConfirming = false;
  clearTimeout(backResetTimer);
  const backBtn = document.getElementById("quiz-back-btn");
  const vp = document.getElementById("quiz-back-viewport");
  if (backBtn) backBtn.classList.remove("confirming");
  if (vp) {
    const span = vp.querySelector(".label-text-current");
    const txt = span ? span.textContent.trim() : vp.textContent.trim();
    if (txt !== "Quay lại") {
      if (typeof animateLabelRoll === "function") {
        animateLabelRoll(vp, "Quay lại");
      } else {
        vp.innerHTML = `<span class="label-text-current">Quay lại</span>`;
      }
    }
  } else if (backBtn) {
    const lbl = backBtn.querySelector(".back-label");
    if (lbl) lbl.textContent = "Quay lại";
  }
}

function resetCopyBtnState() {
  clearTimeout(copyResetTimer);
  const vp = document.getElementById("quiz-copy-viewport");
  if (vp) {
    const span = vp.querySelector(".label-text-current");
    if (span && span.textContent.trim() !== "Copy câu hỏi") {
      if (typeof animateLabelRoll === "function") {
        animateLabelRoll(vp, "Copy câu hỏi");
      } else {
        vp.innerHTML = `<span class="label-text-current">Copy câu hỏi</span>`;
      }
    }
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    Object.assign(ta.style, {
      position: "fixed",
      left: "-9999px",
      top: "-9999px",
      opacity: "0",
    });
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.error("Copy failed:", err);
    return false;
  }
}

function formatQuestionForCopy(qData) {
  if (!qData) return "";
  let q = (qData.question || "")
    .trim()
    .replace(/^câu\s*\d+[\s:.-]*/i, "")
    .trim();
  const prefixes = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const opts = (qData.options || []).map((opt, i) => {
    const p = prefixes[i] || String.fromCharCode(65 + i);
    const t = (opt || "")
      .trim()
      .replace(/^[a-z]\.\s*/i, "")
      .trim();
    return `${p}. ${t}`;
  });
  return opts.length ? `${q}\n${opts.join("\n")}` : q;
}

async function handleCopyCurrentQuestion() {
  const idx = viewSlideIdx;
  const qData = currentQuestions && currentQuestions[idx];
  if (!qData) return;
  const text = formatQuestionForCopy(qData);
  if (!text) return;

  const ok = await copyTextToClipboard(text);
  if (ok) {
    const vp = document.getElementById("quiz-copy-viewport");
    if (vp) {
      clearTimeout(copyResetTimer);
      if (typeof animateLabelRoll === "function") {
        animateLabelRoll(vp, "Đã copy!");
      } else {
        vp.innerHTML = `<span class="label-text-current">Đã copy!</span>`;
      }
      copyResetTimer = setTimeout(resetCopyBtnState, 2000);
    }
  }
}

function initStatusBar() {
  const backBtn = document.getElementById("quiz-back-btn");
  const backVp = document.getElementById("quiz-back-viewport");
  if (backBtn) {
    backBtn.addEventListener("mousedown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (!isBackConfirming) {
        isBackConfirming = true;
        backBtn.classList.add("confirming");
        if (backVp && typeof animateLabelRoll === "function") {
          animateLabelRoll(backVp, "Xác nhận");
        } else {
          const lbl = backBtn.querySelector(".back-label") || backVp;
          if (lbl) lbl.textContent = "Xác nhận";
        }
        clearTimeout(backResetTimer);
        backResetTimer = setTimeout(resetBackBtnState, 4000);
      } else {
        clearTimeout(advanceTimer);
        stopScrollAnim();
        resetBackBtnState();
        resetCopyBtnState();
        returnToMenu();
      }
    });
  }

  const copyBtn = document.getElementById("quiz-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("mousedown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      handleCopyCurrentQuestion();
    });
  }

  const settingsBtn = document.getElementById("quiz-settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("mousedown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (typeof showSettingsScreen === "function") {
        showSettingsScreen("quiz-screen");
      }
    });
  }
}

/* ─── Scroll Engine (Critically Damped Spring — ported from Yume) ─── */

function springOmega() {
  return SPRING_OMEGA / Math.max(0.05, SCROLL_DURATION / 1000);
}

function stopScrollAnim() {
  if (animRafId) {
    cancelAnimationFrame(animRafId);
    animRafId = null;
  }
  animState = null;
}

function wheelClear(reset = true) {
  if (wheelResetTimer) clearTimeout(wheelResetTimer);
  wheelResetTimer = null;
  if (reset) wheelAccumulator = 0;
}

/**
 * Animate carousel to target slide using a critically damped spring.
 *
 * Retargeting midway preserves current (position, velocity) without resetting
 * motion clock to 0, ensuring seamless momentum without stutter/jitter.
 *
 * @param {number} target - Destination slide index
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - Animate even if already at rest at target
 * @param {number|null} [options.velocity=null] - Initial velocity (steps/sec), used on drag release
 * @param {number|null} [options.sinceMs=null] - Starting timestamp for spring clock
 * @param {Function} [options.onSettle=null] - Callback when motion finishes
 */
function animateTo(
  target,
  { force = false, velocity = null, sinceMs = null, onSettle = null } = {},
) {
  if (!currentQuestions || currentQuestions.length === 0) return;

  const next = Math.max(0, Math.min(currentQuestionIndex, target));

  // Đang nhắm đúng đích này rồi thì không dựng lại lò xo (tránh bơm vận tốc 0 khi liên tục cuộn ở biên)
  if (!force && animState?.target === next) return;

  const atRest =
    !animState &&
    next === hardIndex &&
    Math.abs(continuousIndex - next) < SPRING_POS_EPS;

  if (!force && atRest) {
    if (onSettle) onSettle();
    return;
  }

  animState = {
    target: next,
    // Giữ nguyên vận tốc của cú đang chạy khi đổi đích — nối tiếp mượt mà
    vx: velocity ?? animState?.vx ?? 0,
    // Nối tiếp đồng hồ của cú đang chạy
    lastMs: sinceMs ?? animState?.lastMs ?? null,
    onSettle: onSettle ?? animState?.onSettle ?? null,
  };

  targetSlideIdx = next;

  if (!animRafId) {
    animRafId = requestAnimationFrame(springTick);
  }
}

/**
 * One frame of critically damped spring (damping ratio = 1) around target:
 *   u(t) = (u0 + (v0 + omega * u0) * t) * e^(-omega * t), where u = pos - target
 * Closed-form analytical solution: stable at any dt step, zero error accumulation.
 */
function springTick(nowMs) {
  if (!animState) {
    animRafId = null;
    return;
  }

  if (animState.lastMs === null) animState.lastMs = nowMs;
  const dt =
    Math.min(Math.max(nowMs - animState.lastMs, 0), SPRING_MAX_STEP_MS) / 1000;
  animState.lastMs = nowMs;

  const omega = springOmega();
  const u0 = continuousIndex - animState.target;
  const slope = animState.vx + omega * u0;
  const decay = Math.exp(-omega * dt);

  continuousIndex = animState.target + (u0 + slope * dt) * decay;
  animState.vx = (slope - omega * (u0 + slope * dt)) * decay;

  renderAt(continuousIndex);

  if (
    Math.abs(continuousIndex - animState.target) > SPRING_POS_EPS ||
    Math.abs(animState.vx) > SPRING_VEL_EPS
  ) {
    animRafId = requestAnimationFrame(springTick);
    return;
  }

  // Settled: lock cleanly at target and invoke settle callback
  animRafId = null;
  const settledTarget = animState.target;
  const callback = animState.onSettle;
  animState = null;

  hardIndex = settledTarget;
  softIndex = settledTarget;
  viewSlideIdx = settledTarget;
  targetSlideIdx = settledTarget;
  continuousIndex = settledTarget;
  renderAt(settledTarget);

  if (callback) callback();
}

/**
 * Computes the translateY value that centers slide `idx` vertically in the viewport.
 */
function computeTargetY(idx) {
  const top = slideTopMap[idx] || 0;
  const height = slideHeightMap[idx] || 0;
  const offsetToCenter = (viewportH - height) / 2;
  // Leave safe top margin for absolute header
  return Math.max(0, top - Math.max(100, offsetToCenter));
}

/**
 * Interpolates vertical scroll Y from a continuous index float value.
 */
function getYFromContinuousIdx(idx) {
  if (slideTopMap.length === 0) return 0;
  const lastIdx = currentQuestionIndex;
  if (idx <= 0) {
    const y0 = computeTargetY(0);
    const y1 = computeTargetY(Math.min(1, lastIdx));
    const dy = y1 - y0;
    return y0 + idx * (dy > 0 ? dy : 200);
  }
  if (idx >= lastIdx) {
    const yLast = computeTargetY(lastIdx);
    const yPrev = computeTargetY(Math.max(0, lastIdx - 1));
    const dy = yLast - yPrev;
    return yLast + (idx - lastIdx) * (dy > 0 ? dy : 200);
  }
  const from = Math.floor(idx);
  const to = Math.min(lastIdx, from + 1);
  const progress = idx - from;
  const yFrom = computeTargetY(from);
  const yTo = computeTargetY(to);
  return yFrom + (yTo - yFrom) * progress;
}

/**
 * Maps a physical scroll Y position to a continuous float index.
 */
function getContinuousIdx(y) {
  if (currentQuestionIndex === 0) return 0;

  for (let i = 0; i < currentQuestionIndex; i++) {
    const y1 = computeTargetY(i);
    const y2 = computeTargetY(i + 1);
    if (y >= y1 && y <= y2) {
      const fraction = (y - y1) / (y2 - y1);
      return i + fraction;
    }
  }

  const y0 = computeTargetY(0);
  if (y < y0) {
    const y1 = computeTargetY(1);
    const dy = y1 - y0;
    return dy > 0 ? 0 - (y0 - y) / dy : 0;
  }

  const yLast = computeTargetY(currentQuestionIndex);
  if (y > yLast) {
    const yPrev = computeTargetY(currentQuestionIndex - 1);
    const dy = yLast - yPrev;
    return dy > 0
      ? currentQuestionIndex + (y - yLast) / dy
      : currentQuestionIndex;
  }

  return currentQuestionIndex;
}

/**
 * Updates track translateY and slide opacities based on continuous index,
 * and updates softIndex / status bar on index boundary crossing.
 */
function renderAt(idx) {
  const scrollY = getYFromContinuousIdx(idx);
  scrollCurrentY = scrollY;
  if (carouselTrack) {
    carouselTrack.style.transform = `translateY(${-scrollY}px)`;
  }
  applySlideOpacities(idx);

  const closest = Math.round(Math.max(0, Math.min(currentQuestionIndex, idx)));
  if (closest !== softIndex) {
    softIndex = closest;
    viewSlideIdx = closest;
    const statusEl = document.getElementById("quiz-index-text");
    if (statusEl && currentQuestions) {
      statusEl.textContent = `${closest + 1}/${currentQuestions.length}`;
    }
  }
}

/**
 * Updates opacity of visible slides based on continuous index distance from center.
 */
function applySlideOpacities(continuousIdx) {
  if (!carouselTrack) return;
  const slides = carouselTrack.querySelectorAll(".quiz-slide");
  slides.forEach((slide) => {
    if (slide.classList.contains("upcoming")) {
      slide.style.opacity = "0";
      return;
    }
    const i = parseInt(slide.getAttribute("data-slide-index"), 10);
    const dist = Math.abs(i - continuousIdx);
    // Linear fade: opacity 1 at center, 0.4 at distance >= 1
    const opacity = Math.max(0.4, 1 - dist * 0.6);
    slide.style.opacity = opacity.toFixed(3);
  });
}

/**
 * Backward compatibility adapter for snapScrollTo.
 */
function snapScrollTo(targetY, idx, onSettle) {
  if (idx !== undefined) {
    animateTo(idx, { force: true, onSettle });
  } else {
    const mappedIdx = Math.round(getContinuousIdx(targetY));
    animateTo(mappedIdx, { force: true, onSettle });
  }
}

/* ─── Geometry ─── */

/**
 * Reads and caches the offsetTop and offsetHeight of every .quiz-slide.
 * Must be called after DOM changes that affect slide heights.
 */
function measureSlides() {
  if (!carouselTrack) return;
  const slides = carouselTrack.querySelectorAll(".quiz-slide");
  slideTopMap = [];
  slideHeightMap = [];
  slides.forEach((slide) => {
    slideTopMap.push(slide.offsetTop);
    slideHeightMap.push(slide.offsetHeight);
  });
}

/* ─── Slide Content ─── */

/**
 * Injects real question content + stagger enter animation into a placeholder slide.
 */
function revealSlideContent(slideEl, qData, qIndex) {
  const contentEl = slideEl.querySelector(".quiz-slide-content");
  if (!contentEl) return;

  const prefixes = ["A", "B", "C", "D", "E", "F"];
  const optionsHTML = qData.options
    .map(
      (opt, idx) => `
        <div class="quiz-option quiz-item-enter" data-index="${idx}" style="animation-delay:${0.09 + idx * 0.05}s;">
            <span class="option-prefix">${prefixes[idx] || ""}.</span> ${opt}
        </div>`,
    )
    .join("");

  contentEl.innerHTML = `
        <div class="quiz-question quiz-item-enter" style="animation-delay:0.04s;">
            <strong class="question-number">Câu ${qIndex + 1}:</strong>
            <span class="question-text">${qData.question}</span>
        </div>
        <div class="quiz-options">
            ${optionsHTML}
        </div>`;

  const duration = Math.round(
    (0.09 + qData.options.length * 0.05) * 1000 + 380 + 40,
  );
  setTimeout(() => {
    contentEl.querySelectorAll(".quiz-item-enter").forEach((el) => {
      el.classList.remove("quiz-item-enter");
      el.style.animationDelay = "";
    });
  }, duration);
}

/* ─── Answer Interaction ─── */

/**
 * Wires up click handlers for answer options. Locks after first selection,
 * shows correct/wrong feedback, schedules auto-advance.
 */
function attachAnswerHandlers(slideEl, qIndex) {
  const optContainer = slideEl.querySelector(".quiz-options");
  const optionEls = slideEl.querySelectorAll(".quiz-option");
  let hasAnswered = false;

  optionEls.forEach((el) => {
    el.addEventListener("pointerup", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (window.quizIsDragMoved) return;
      if (hasAnswered) return;
      hasAnswered = true;

      if (optContainer) optContainer.classList.add("quiz-answered");

      const selectedIdx = parseInt(el.getAttribute("data-index"), 10);
      const result = submitAnswer(selectedIdx);

      if (result.isCorrect) {
        el.classList.add("answer-correct");
      } else {
        el.classList.remove("answer-wrong");
        void el.offsetWidth;
        el.classList.add("answer-wrong");
        if (
          result.correctIndex !== undefined &&
          optionEls[result.correctIndex]
        ) {
          const correctEl = optionEls[result.correctIndex];
          correctEl.classList.remove("answer-correct");
          void correctEl.offsetWidth;
          correctEl.classList.add("answer-correct-revealed");
        }
      }

      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(() => advanceCarousel(), AUTO_ADVANCE_DELAY);
    });
  });
}

/* ─── Carousel Orchestration ─── */

/**
 * Advances to the next question after answering.
 * Marks current slide as "past", reveals next slide content, snaps to center it.
 */
function advanceCarousel() {
  if (!carouselTrack) return;

  const answeredIdx = currentQuestionIndex;
  currentQuestionIndex++;
  const nextIdx = currentQuestionIndex;

  // Mark answered slide as past
  const answeredSlide = carouselTrack.querySelector(
    `.quiz-slide[data-slide-index="${answeredIdx}"]`,
  );
  if (answeredSlide) {
    answeredSlide.classList.remove("current");
    answeredSlide.classList.add("past");
  }

  if (nextIdx >= currentQuestions.length) {
    stopScrollAnim();
    if (typeof renderQuizResult === "function") renderQuizResult();
    return;
  }

  const nextSlide = carouselTrack.querySelector(
    `.quiz-slide[data-slide-index="${nextIdx}"]`,
  );
  if (!nextSlide) return;

  // Inject content and activate next slide
  if (nextSlide.classList.contains("upcoming")) {
    revealSlideContent(nextSlide, currentQuestions[nextIdx], nextIdx);
  }
  nextSlide.classList.remove("upcoming");
  nextSlide.classList.add("current");

  // Lock DropdownAnimationLock during stagger enter
  if (DropdownAnimationLock) DropdownAnimationLock.lock();
  const enterDuration = Math.round(
    (0.09 + currentQuestions[nextIdx].options.length * 0.05) * 1000 + 380 + 40,
  );
  setTimeout(() => {
    if (DropdownAnimationLock) DropdownAnimationLock.unlock();
  }, enterDuration);

  attachAnswerHandlers(nextSlide, nextIdx);

  // Re-measure after content injection then animate smoothly with spring
  targetSlideIdx = nextIdx;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      measureSlides();
      animateTo(nextIdx, { force: true });
      resetCopyBtnState();
    });
  });
}

/**
 * Scrolls to slide `idx` using the spring engine.
 * Used by the wheel handler to browse answered slides.
 *
 * @param {number} idx - clamp to [0, currentQuestionIndex]
 */
function scrollToSlide(idx) {
  const clamped = Math.max(0, Math.min(currentQuestionIndex, idx));
  targetSlideIdx = clamped;
  animateTo(clamped);
  resetCopyBtnState();
}

/* ─── Entry Point ─── */

/**
 * Builds and mounts the full carousel into #quiz-screen.
 */
function renderCurrentQuestion() {
  const quizScreen = document.getElementById("quiz-screen");
  if (!quizScreen) return;

  document.body.style.overflowY = "hidden";

  // Reset all state
  stopScrollAnim();
  clearTimeout(advanceTimer);
  wheelClear(true);
  scrollCurrentY = 0;
  continuousIndex = 0;
  hardIndex = 0;
  softIndex = 0;
  viewSlideIdx = 0;
  targetSlideIdx = 0;
  slideTopMap = [];
  slideHeightMap = [];
  carouselTrack = null;
  carouselViewport = null;
  trackPaddingTop = 0;

  resetCopyBtnState();

  if (!currentQuestions || currentQuestions.length === 0) {
    quizScreen.innerHTML = `<div class="quiz-container"><div class="quiz-question">Đã hoàn thành tất cả câu hỏi!</div></div>`;
    return;
  }

  const statusEl = document.getElementById("quiz-index-text");
  if (statusEl) statusEl.textContent = `1/${currentQuestions.length}`;

  // ── Compute available viewport height ──
  viewportH = window.innerHeight;

  // ── Build DOM ──
  const viewport = document.createElement("div");
  viewport.className = "quiz-screen-viewport";
  viewport.style.height = `${viewportH}px`;
  carouselViewport = viewport;

  const track = document.createElement("div");
  track.className = "quiz-carousel-track";
  carouselTrack = track;

  const prefixes = ["A", "B", "C", "D", "E", "F"];

  // Slide 0: full content + stagger enter
  const firstQ = currentQuestions[0];
  const firstOptionsHTML = firstQ.options
    .map(
      (opt, idx) => `
        <div class="quiz-option quiz-item-enter" data-index="${idx}" style="animation-delay:${0.09 + idx * 0.05}s;">
            <span class="option-prefix">${prefixes[idx] || ""}.</span> ${opt}
        </div>`,
    )
    .join("");

  const firstSlideHTML = `
        <div class="quiz-slide current" data-slide-index="0">
            <div class="quiz-container quiz-slide-content">
                <div class="quiz-question quiz-item-enter" style="animation-delay:0.04s;">
                    <strong class="question-number">Câu 1:</strong>
                    <span class="question-text">${firstQ.question}</span>
                </div>
                <div class="quiz-options">
                    ${firstOptionsHTML}
                </div>
            </div>
        </div>`;

  // Remaining slides: empty placeholders (opacity 0, no content)
  const upcomingHTML = currentQuestions
    .slice(1)
    .map((_, relIdx) => {
      const absIdx = relIdx + 1;
      return `<div class="quiz-slide upcoming" data-slide-index="${absIdx}">
            <div class="quiz-container quiz-slide-content" aria-hidden="true"></div>
        </div>`;
    })
    .join("");

  track.innerHTML = firstSlideHTML + upcomingHTML;
  viewport.appendChild(track);
  quizScreen.innerHTML = "";
  quizScreen.appendChild(viewport);

  // ── Wheel handler (Accumulator pattern — ported from Yume CarouselEngine) ──
  // Registers on the viewport (passive: false to allow preventDefault)
  viewport.addEventListener(
    "wheel",
    (e) => {
      // Bảo vệ tính năng Zoom của trình duyệt (Ctrl + Wheel)
      if (e.ctrlKey) return;
      if (!currentQuestions || currentQuestions.length <= 1) return;

      // Gom delta rồi mới nhảy bậc: bánh xe rời rạc từng nấc nhỏ, cộng dồn lại
      // vẫn ra một bậc đúng ý người dùng mà không nuốt từng sự kiện
      wheelAccumulator += e.deltaY || e.deltaX || 0;
      wheelClear(false);

      if (Math.abs(wheelAccumulator) < WHEEL_THRESHOLD) return;

      e.preventDefault();
      const direction = Math.sign(wheelAccumulator);
      wheelAccumulator = 0;

      const base = animState ? animState.target : hardIndex;
      scrollToSlide(base + direction);

      wheelResetTimer = setTimeout(() => wheelClear(true), WHEEL_RESET_MS);
    },
    { passive: false },
  );

  // ── Touch / Drag engine with Momentum & Spring Release (ported from Yume) ──
  let drag = null;

  const startDrag = (clientY) => {
    if (!currentQuestions || currentQuestions.length <= 1) return;

    stopScrollAnim();
    wheelClear(true);
    window.quizIsDragMoved = false;

    drag = {
      startY: clientY,
      lastY: clientY,
      deltaY: 0,
      durationMs: 0,
      startIndex: continuousIndex,
      virtual: continuousIndex,
      startTime: performance.now(),
      sampleMs: performance.now(),
      sampleVirtual: continuousIndex,
      vx: 0,
    };

    hardIndex = Math.round(
      Math.max(0, Math.min(currentQuestionIndex, continuousIndex)),
    );
  };

  const moveDrag = (clientY) => {
    if (!drag) return;

    const deltaY = clientY - drag.startY;
    const now = performance.now();
    drag.lastY = clientY;
    drag.deltaY = deltaY;
    drag.durationMs = now - drag.startTime;

    if (Math.abs(deltaY) > DRAG_DEAD_ZONE) {
      window.quizIsDragMoved = true;
    }

    const count = currentQuestionIndex + 1;
    const last = count - 1;
    const raw = drag.startIndex - deltaY / DRAG_STEP;
    let virtual = raw;
    if (raw < 0) virtual = raw * EDGE_RESISTANCE;
    else if (raw > last) virtual = last + (raw - last) * EDGE_RESISTANCE;

    drag.virtual = virtual;
    continuousIndex = virtual;

    const sampleMs = now - drag.sampleMs;
    if (sampleMs > 0) {
      const instant = ((virtual - drag.sampleVirtual) / sampleMs) * 1000;
      drag.vx += (instant - drag.vx) * DRAG_VELOCITY_SMOOTH;
      drag.sampleMs = now;
      drag.sampleVirtual = virtual;
    }

    renderAt(continuousIndex);
  };

  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;

    const count = currentQuestionIndex + 1;
    const last = count - 1;
    let target = Math.round(Math.max(0, Math.min(last, d.virtual)));

    const velocity = d.deltaY / Math.max(1, d.durationMs);
    const flicked =
      Math.abs(velocity) > FLICK_VELOCITY &&
      Math.abs(d.deltaY) > FLICK_MIN_DISTANCE;
    if (flicked) {
      target += d.deltaY < 0 ? 1 : -1;
    }
    target = Math.max(0, Math.min(last, target));

    const releaseMs = performance.now();
    const idleMs = releaseMs - d.sampleMs;
    const omega = springOmega();
    const limit = MAX_FLICK_OVERSHOOT * omega * Math.E;
    let relVx = Math.max(
      -limit,
      Math.min(limit, d.vx * Math.exp(-idleMs / RELEASE_DECAY_MS)),
    );

    // Kéo vượt mép rồi nhả: nếu đà hướng ra ngoài dải thì bỏ
    const outward =
      (relVx < 0 && continuousIndex <= 0) ||
      (relVx > 0 && continuousIndex >= last);
    if (outward) relVx = 0;

    animateTo(target, {
      force: true,
      velocity: relVx,
      sinceMs: releaseMs,
    });

    setTimeout(() => {
      window.quizIsDragMoved = false;
    }, 50);
  };

  viewport.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) startDrag(e.touches[0].pageY);
    },
    { passive: true },
  );

  viewport.addEventListener(
    "touchmove",
    (e) => {
      if (drag && e.touches.length === 1) moveDrag(e.touches[0].pageY);
    },
    { passive: true },
  );

  viewport.addEventListener("touchend", () => {
    if (drag) endDrag();
  });

  viewport.addEventListener("touchcancel", () => {
    if (drag) endDrag();
  });

  // Desktop (mouse) drag is intentionally disabled — use wheel to navigate.
  // Touch drag (pointerType !== "mouse") remains active for mobile.
  viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    if (e.button !== undefined && e.button !== 0) return;
    startDrag(e.pageY);
  });

  const onPointerMove = (e) => {
    if (drag && e.pointerType !== "mouse") moveDrag(e.pageY);
  };
  const onPointerUp = (e) => {
    if (drag && e.pointerType !== "mouse") endDrag();
  };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  // Resize listener for responsive geometry
  const onResize = () => {
    viewportH = window.innerHeight;
    if (carouselViewport) {
      carouselViewport.style.height = `${viewportH}px`;
    }
    measureSlides();
    const slide0H = slideHeightMap[0] || 0;
    trackPaddingTop = Math.max(120, Math.floor((viewportH - slide0H) / 2));
    if (carouselTrack) {
      carouselTrack.style.paddingTop = `${trackPaddingTop}px`;
      const lastSlideH = slideHeightMap[currentQuestions.length - 1] || 0;
      const trackPaddingBottom = Math.max(
        120,
        Math.floor((viewportH - lastSlideH) / 2),
      );
      carouselTrack.style.paddingBottom = `${trackPaddingBottom}px`;
    }
    measureSlides(); // Re-measure after padding applied
    continuousIndex = hardIndex;
    renderAt(hardIndex);
  };
  window.addEventListener("resize", onResize);

  // Save cleanup globally to call on returnToMenu
  window.quizCleanupDrag = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("resize", onResize);
  };

  // ── Stagger enter + pointer lock for slide 0 ──
  if (DropdownAnimationLock) DropdownAnimationLock.lock();
  const firstEnterDuration = Math.round(
    (0.09 + firstQ.options.length * 0.05) * 1000 + 380 + 40,
  );
  setTimeout(() => {
    quizScreen.querySelectorAll(".quiz-item-enter").forEach((el) => {
      el.classList.remove("quiz-item-enter");
      el.style.animationDelay = "";
    });
    if (DropdownAnimationLock) DropdownAnimationLock.unlock();
  }, firstEnterDuration);

  // ── Measure geometry and initial position after two rAF frames ──
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      measureSlides();

      // Ensure at least 120px padding at top (header clearance)
      const slide0H = slideHeightMap[0] || 0;
      trackPaddingTop = Math.max(120, Math.floor((viewportH - slide0H) / 2));
      track.style.paddingTop = `${trackPaddingTop}px`;

      // Ensure at least 120px padding at bottom (status bar clearance)
      const lastSlideH = slideHeightMap[currentQuestions.length - 1] || 0;
      const trackPaddingBottom = Math.max(
        120,
        Math.floor((viewportH - lastSlideH) / 2),
      );
      track.style.paddingBottom = `${trackPaddingBottom}px`;

      // Re-measure after padding is applied (all offsetTop values shift by trackPaddingTop)
      measureSlides();

      // Position at slide 0 center (which is now exactly viewportH/2 due to padding)
      continuousIndex = 0;
      hardIndex = 0;
      softIndex = 0;
      viewSlideIdx = 0;
      targetSlideIdx = 0;
      scrollCurrentY = computeTargetY(0);
      track.style.transform = `translateY(${-scrollCurrentY}px)`;
      applySlideOpacities(0);

      const firstSlide = track.querySelector(
        ".quiz-slide[data-slide-index='0']",
      );
      if (firstSlide) attachAnswerHandlers(firstSlide, 0);
    });
  });
}

/** Legacy alias */
function transitionToNextQuestion() {
  advanceCarousel();
}

/* ─── Return to Menu ─── */

function returnToMenu() {
  stopScrollAnim();
  clearTimeout(advanceTimer);
  wheelClear(true);
  document.body.style.overflowY = "";

  if (window.quizCleanupDrag) {
    window.quizCleanupDrag();
    window.quizCleanupDrag = null;
  }

  // Force-release any stagger/animation lock left over from quiz rendering
  // so the menu transition is never blocked.
  if (typeof DropdownAnimationLock !== "undefined" && DropdownAnimationLock) {
    DropdownAnimationLock.unlock();
  }

  ScreenSwitcher.to("menu-screen", {
    fadeIn: true,
    autoUnlock: true,
    onBeforeFade: () => {
      const statusBar = document.getElementById("quiz-status-bar");
      if (statusBar) statusBar.classList.remove("active");
      resetBackBtnState();
      resetCopyBtnState();
    },
    onShow: (menuScreen) => {
      const quizScreen = document.getElementById("quiz-screen");
      if (quizScreen) quizScreen.innerHTML = "";

      const resultScreen = document.getElementById("result-screen");
      if (resultScreen) resultScreen.innerHTML = "";

      const brandHeader = document.getElementById("brand-header");
      if (brandHeader) brandHeader.classList.remove("fade-out");

      const copyright = document.getElementById("site-copyright");
      if (copyright) copyright.classList.remove("fade-out");

      if (menuScreen) {
        menuScreen.querySelectorAll(".menu-row, .menu-actions").forEach((r) => {
          r.classList.remove("menu-exit");
          r.style.animationDelay = "";
        });
      }
    },
  });
}
