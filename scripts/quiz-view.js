/**
 * Module: Giao diện Làm bài thi - Vertical Snap Carousel (scripts/quiz-view.js)
 *
 * Architecture:
 * - All .quiz-slide elements have natural height (content-driven, no fixed height)
 * - .quiz-carousel-track translateY positions the current slide at vertical center of viewport
 * - Scroll: wheel accumulator pattern (ref: carousel temp) — continuous, no hard throttle
 *   → accumulate deltaY, trigger snap when |acc| >= WHEEL_THRESHOLD
 *   → while animating, next target = targetSlideIdx ± 1 (continuous scroll)
 * - Snap animation uses easeOutExpo timed RAF (700ms)
 * - Opacity: 3 fixed levels via CSS classes, `linear` transition
 *     .past    → 0.4  (answered, above current)
 *     .current → 1    (being answered)
 *     .upcoming → 0   (not yet revealed)
 * - ALWAYS CENTERED: track has top padding = viewportH/2 - firstSlideH/2 so even slide 0 is centered
 * - After answering, AUTO_ADVANCE_DELAY ms → advanceCarousel()
 * - No "Next question" button
 */

/* ─── State ─── */
let isBackConfirming = false;
let backResetTimer = null;
let copyResetTimer = null;
window.quizIsDragMoved = false;

let isFreeScrollMode = false;
let inertiaAnimId = null;
let inertiaVelocity = 0;

/* Scroll animation state (easeOutExpo timed RAF) */
let scrollAnimId = null;    // rAF handle
let scrollStartY = 0;       // translateY at animation start
let scrollTargetY = 0;       // translateY destination
let scrollStartTime = 0;       // performance.now() at start
let scrollCurrentY = 0;       // currently applied translateY

/* Slide index tracking */
let targetSlideIdx = 0;       // destination slide index (may be ahead of viewSlideIdx during animation)
let viewSlideIdx = 0;       // last settled slide index

/* Wheel accumulator (ref: carousel temp wheel pattern) */
let wheelAccumulator = 0;
let wheelResetTimer = null;
const WHEEL_THRESHOLD = 35;     // accumulated deltaY to trigger one snap step
const WHEEL_RESET_MS = 120;    // ms of no wheel input → reset accumulator

/* Geometry */
let slideTopMap = [];   // slideTopMap[i]    = offsetTop of slide i relative to track
let slideHeightMap = [];   // slideHeightMap[i] = offsetHeight of slide i
let viewportH = 0;    // available height (window - header - statusbar)
let trackPaddingTop = 0;   // extra top padding added to track so slide 0 is centered

/* DOM references */
let carouselTrack = null;
let carouselViewport = null;

/* Timers */
let advanceTimer = null;

/* Constants */
const SCROLL_DURATION = 500;   // ms — easeOutExpo snap
const AUTO_ADVANCE_DELAY = 600;  // ms after answering before auto-advance

/* Slide index for opacity interpolation */
let scrollStartSlideIdx = 0;  // slide idx when current snap animation started

/* ─── Easing (matches carousel temp) ─── */
function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

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
        try { await navigator.clipboard.writeText(text); return true; } catch (_) { }
    }
    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        Object.assign(ta.style, { position: "fixed", left: "-9999px", top: "-9999px", opacity: "0" });
        document.body.appendChild(ta);
        ta.focus(); ta.select();
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
    let q = (qData.question || "").trim().replace(/^câu\s*\d+[\s:.-]*/i, "").trim();
    const prefixes = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const opts = (qData.options || []).map((opt, i) => {
        const p = prefixes[i] || String.fromCharCode(65 + i);
        const t = (opt || "").trim().replace(/^[a-z]\.\s*/i, "").trim();
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

/* ─── Scroll Engine (easeOutExpo timed RAF) ─── */

function stopScrollAnim() {
    if (scrollAnimId) {
        cancelAnimationFrame(scrollAnimId);
        scrollAnimId = null;
    }
    if (inertiaAnimId) {
        cancelAnimationFrame(inertiaAnimId);
        inertiaAnimId = null;
    }
}

function launchInertiaScroll(initialVelocity) {
    stopScrollAnim();
    inertiaVelocity = initialVelocity;
    let lastTime = performance.now();

    function tick(now) {
        const dt = now - lastTime;
        lastTime = now;

        const cappedDt = Math.min(dt, 32);

        // Apply friction
        inertiaVelocity *= Math.pow(0.992, cappedDt);

        if (Math.abs(inertiaVelocity) < 0.05) {
            inertiaAnimId = null;
            return;
        }

        scrollCurrentY -= (inertiaVelocity * cappedDt);

        const minY = computeTargetY(0);
        let maxY = computeTargetY(currentQuestionIndex);
        const currentTop = slideTopMap[currentQuestionIndex] || 0;
        const currentH = slideHeightMap[currentQuestionIndex] || 0;
        const maxScrollForBottom = currentTop + currentH - (viewportH - 120);
        if (maxScrollForBottom > maxY) maxY = maxScrollForBottom;

        if (scrollCurrentY < minY) {
            inertiaAnimId = null;
            snapScrollTo(minY);
            return;
        } else if (scrollCurrentY > maxY) {
            inertiaAnimId = null;
            snapScrollTo(maxY);
            return;
        }

        if (carouselTrack) {
            carouselTrack.style.transform = `translateY(${-scrollCurrentY}px)`;
            applySlideOpacities(getContinuousIdx(scrollCurrentY));
        }

        inertiaAnimId = requestAnimationFrame(tick);
    }
    inertiaAnimId = requestAnimationFrame(tick);
}

/**
 * Computes the translateY value that centers slide `idx` vertically in the viewport.
 *
 * trackPaddingTop is pre-added at the track top so that slide 0 is centered without any offset.
 * For slide i: target = trackPaddingTop + slideTopMap[i] - (viewportH - slideHeightMap[i]) / 2
 * Which simplifies to: the center of slide i aligns with the center of the viewport.
 *
 * @param {number} idx
 * @returns {number} translateY value (positive = track moves up)
 */
function computeTargetY(idx) {
    const top = slideTopMap[idx] || 0;
    const height = slideHeightMap[idx] || 0;
    const offsetToCenter = (viewportH - height) / 2;
    // Leave safe top margin for absolute header
    return Math.max(0, top - Math.max(100, offsetToCenter));
}

/**
 * Updates the opacity of every visible (non-upcoming) slide based on a continuous
 * float index representing the current "center" of the viewport.
 *
 * Matches the carousel temp's continuous opacity pattern:
 * - Distance 0 from center → opacity 1.0
 * - Distance ≥1 from center → opacity 0.4 (floor)
 * Applied directly via style.opacity every RAF tick (no CSS transition involved).
 *
 * @param {number} continuousIdx - float, e.g. 1.4 means 40% between slide 1 and 2
 */
function applySlideOpacities(continuousIdx) {
    if (!carouselTrack) return;
    const slides = carouselTrack.querySelectorAll(".quiz-slide");
    slides.forEach(slide => {
        if (slide.classList.contains("upcoming")) {
            slide.style.opacity = "0";
            return;
        }
        if (isFreeScrollMode) {
            slide.style.opacity = "1";
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
        return dy > 0 ? currentQuestionIndex + (y - yLast) / dy : currentQuestionIndex;
    }

    return currentQuestionIndex;
}

/**
 * Launches a timed easeOutExpo snap animation from `scrollCurrentY` to `targetY`.
 * Updates translateY and slide opacities every RAF tick (continuous soft-select).
 * Fires onSettle() when animation completes (hard select equivalent).
 *
 * @param {number}   targetY
 * @param {number}   [idx]       - slide index being scrolled to
 * @param {Function} [onSettle]  - called when animation finishes
 */
function snapScrollTo(targetY, idx, onSettle) {
    stopScrollAnim();

    scrollStartY = scrollCurrentY;
    scrollTargetY = targetY;
    scrollStartTime = performance.now();
    scrollStartSlideIdx = viewSlideIdx;

    // Soft-select: update status bar immediately when snap starts
    if (idx !== undefined) {
        viewSlideIdx = idx;
        const statusEl = document.getElementById("quiz-index-text");
        if (statusEl) statusEl.textContent = `${idx + 1}/${currentQuestions.length}`;
    }

    if (Math.abs(scrollTargetY - scrollStartY) < 0.5) {
        scrollCurrentY = scrollTargetY;
        if (carouselTrack) carouselTrack.style.transform = `translateY(${-scrollCurrentY}px)`;
        applySlideOpacities(idx !== undefined ? idx : viewSlideIdx);
        if (onSettle) onSettle();
        return;
    }

    const startIdx = scrollStartSlideIdx;
    const endIdx = idx !== undefined ? idx : viewSlideIdx;

    function tick(now) {
        const elapsed = now - scrollStartTime;
        const t = Math.min(elapsed / SCROLL_DURATION, 1);
        const eased = easeOutExpo(t);
        scrollCurrentY = scrollStartY + (scrollTargetY - scrollStartY) * eased;

        if (carouselTrack) {
            carouselTrack.style.transform = `translateY(${-scrollCurrentY}px)`;
            applySlideOpacities(getContinuousIdx(scrollCurrentY));
        }

        if (t < 1) {
            scrollAnimId = requestAnimationFrame(tick);
        } else {
            scrollCurrentY = scrollTargetY;
            scrollAnimId = null;
            // Hard select: snap complete, apply final discrete opacities
            applySlideOpacities(endIdx);
            if (onSettle) onSettle();
        }
    }

    scrollAnimId = requestAnimationFrame(tick);
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
    slides.forEach(slide => {
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
    const optionsHTML = qData.options.map((opt, idx) => `
        <div class="quiz-option quiz-item-enter" data-index="${idx}" style="animation-delay:${0.09 + idx * 0.05}s;">
            <span class="option-prefix">${prefixes[idx] || ""}.</span> ${opt}
        </div>`).join("");

    contentEl.innerHTML = `
        <div class="quiz-question quiz-item-enter" style="animation-delay:0.04s;">
            <strong class="question-number">Câu ${qIndex + 1}:</strong>
            <span class="question-text">${qData.question}</span>
        </div>
        <div class="quiz-options">
            ${optionsHTML}
        </div>`;

    const duration = Math.round((0.09 + qData.options.length * 0.05) * 1000 + 380 + 40);
    setTimeout(() => {
        contentEl.querySelectorAll(".quiz-item-enter").forEach(el => {
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

    optionEls.forEach(el => {
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
                if (result.correctIndex !== undefined && optionEls[result.correctIndex]) {
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

    isFreeScrollMode = false;

    const answeredIdx = currentQuestionIndex;
    currentQuestionIndex++;
    const nextIdx = currentQuestionIndex;

    // Mark answered slide as past
    const answeredSlide = carouselTrack.querySelector(`.quiz-slide[data-slide-index="${answeredIdx}"]`);
    if (answeredSlide) {
        answeredSlide.classList.remove("current");
        answeredSlide.classList.add("past");
    }

    if (nextIdx >= currentQuestions.length) {
        stopScrollAnim();
        if (typeof renderQuizResult === "function") renderQuizResult();
        return;
    }

    const nextSlide = carouselTrack.querySelector(`.quiz-slide[data-slide-index="${nextIdx}"]`);
    if (!nextSlide) return;

    // Inject content and activate next slide
    if (nextSlide.classList.contains("upcoming")) {
        revealSlideContent(nextSlide, currentQuestions[nextIdx], nextIdx);
    }
    nextSlide.classList.remove("upcoming");
    nextSlide.classList.add("current");

    // Lock DropdownAnimationLock during stagger enter
    if (DropdownAnimationLock) DropdownAnimationLock.lock();
    const enterDuration = Math.round((0.09 + currentQuestions[nextIdx].options.length * 0.05) * 1000 + 380 + 40);
    setTimeout(() => { if (DropdownAnimationLock) DropdownAnimationLock.unlock(); }, enterDuration);

    attachAnswerHandlers(nextSlide, nextIdx);

    // Re-measure after content injection then snap
    targetSlideIdx = nextIdx;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            measureSlides();
            snapScrollTo(computeTargetY(nextIdx), nextIdx);
            resetCopyBtnState();
        });
    });
}

/**
 * Scrolls to slide `idx` using the snap engine.
 * Used by the wheel handler to browse answered slides.
 *
 * @param {number} idx - clamp to [0, currentQuestionIndex]
 */
function scrollToSlide(idx) {
    const clamped = Math.max(0, Math.min(currentQuestionIndex, idx));
    targetSlideIdx = clamped;
    snapScrollTo(computeTargetY(clamped), clamped);
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
    clearTimeout(wheelResetTimer);
    wheelAccumulator = 0;
    scrollCurrentY = 0;
    scrollTargetY = 0;
    viewSlideIdx = 0;
    targetSlideIdx = 0;
    slideTopMap = [];
    slideHeightMap = [];
    carouselTrack = null;
    carouselViewport = null;
    trackPaddingTop = 0;
    isFreeScrollMode = false;

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
    const firstOptionsHTML = firstQ.options.map((opt, idx) => `
        <div class="quiz-option quiz-item-enter" data-index="${idx}" style="animation-delay:${0.09 + idx * 0.05}s;">
            <span class="option-prefix">${prefixes[idx] || ""}.</span> ${opt}
        </div>`).join("");

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
    const upcomingHTML = currentQuestions.slice(1).map((_, relIdx) => {
        const absIdx = relIdx + 1;
        return `<div class="quiz-slide upcoming" data-slide-index="${absIdx}">
            <div class="quiz-container quiz-slide-content" aria-hidden="true"></div>
        </div>`;
    }).join("");

    track.innerHTML = firstSlideHTML + upcomingHTML;
    viewport.appendChild(track);
    quizScreen.innerHTML = "";
    quizScreen.appendChild(viewport);

    // ── Wheel handler (accumulator pattern — ref: carousel temp) ──
    // Registers on the viewport (passive: false to allow preventDefault)
    viewport.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY || e.deltaX;
        wheelAccumulator += delta;

        clearTimeout(wheelResetTimer);
        wheelResetTimer = setTimeout(() => { wheelAccumulator = 0; }, WHEEL_RESET_MS);

        if (Math.abs(wheelAccumulator) >= WHEEL_THRESHOLD) {
            const direction = Math.sign(wheelAccumulator);
            wheelAccumulator = 0;
            // Use targetSlideIdx (not viewSlideIdx) so rapid scroll queues correctly
            scrollToSlide(targetSlideIdx + direction);
        }
    }, { passive: false });

    // ── Touch / Drag engine (Vertical) ──
    let isDragging = false;
    let dragStartY = 0;
    let dragStartScrollY = 0;
    let dragStartTime = 0;

    let isMoveTicking = false;

    const startDrag = (clientY) => {
        if (!currentQuestions || currentQuestions.length <= 1) return;
        isDragging = true;

        window.quizIsDragMoved = false;
        isMoveTicking = false;
        dragStartY = clientY;
        dragStartScrollY = scrollCurrentY;
        dragStartTime = performance.now();
        stopScrollAnim();
    };

    const moveDrag = (clientY) => {
        if (!isDragging) return;
        const deltaY = clientY - dragStartY;

        if (Math.abs(deltaY) > 5) {
            window.quizIsDragMoved = true;
            if (!isFreeScrollMode) {
                isFreeScrollMode = true;
                if (carouselTrack) {
                    applySlideOpacities(getContinuousIdx(scrollCurrentY));
                }
            }
        }

        let newY = dragStartScrollY - deltaY;

        const minY = computeTargetY(0);
        let maxY = computeTargetY(currentQuestionIndex);

        const currentTop = slideTopMap[currentQuestionIndex] || 0;
        const currentH = slideHeightMap[currentQuestionIndex] || 0;
        const maxScrollForBottom = currentTop + currentH - (viewportH - 120);
        if (maxScrollForBottom > maxY) maxY = maxScrollForBottom;

        if (newY < minY) {
            newY = minY - Math.pow(minY - newY, 0.7);
        } else if (newY > maxY) {
            newY = maxY + Math.pow(newY - maxY, 0.7);
        }

        scrollCurrentY = newY;

        if (!isMoveTicking) {
            isMoveTicking = true;
            requestAnimationFrame(() => {
                if (carouselTrack) {
                    carouselTrack.style.transform = `translateY(${-scrollCurrentY}px)`;
                    applySlideOpacities(getContinuousIdx(scrollCurrentY));
                }
                isMoveTicking = false;
            });
        }
    };

    const endDrag = (clientY) => {
        if (!isDragging) return;
        isDragging = false;

        const deltaY = clientY !== undefined ? clientY - dragStartY : 0;
        const duration = performance.now() - dragStartTime;
        let velocity = duration > 0 ? deltaY / Math.max(1, duration) : 0;

        if (velocity > 3.5) velocity = 3.5;
        if (velocity < -3.5) velocity = -3.5;

        const minY = computeTargetY(0);
        let maxY = computeTargetY(currentQuestionIndex);
        const currentTop = slideTopMap[currentQuestionIndex] || 0;
        const currentH = slideHeightMap[currentQuestionIndex] || 0;
        const maxScrollForBottom = currentTop + currentH - (viewportH - 120);
        if (maxScrollForBottom > maxY) maxY = maxScrollForBottom;

        if (scrollCurrentY < minY) {
            snapScrollTo(minY);
        } else if (scrollCurrentY > maxY) {
            snapScrollTo(maxY);
        } else {
            launchInertiaScroll(velocity);
        }

        setTimeout(() => { window.quizIsDragMoved = false; }, 50);
    };

    viewport.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) startDrag(e.touches[0].pageY);
    }, { passive: true });

    viewport.addEventListener("touchmove", (e) => {
        if (isDragging && e.touches.length === 1) moveDrag(e.touches[0].pageY);
    }, { passive: true });

    viewport.addEventListener("touchend", (e) => {
        if (isDragging) endDrag(e.changedTouches[0]?.pageY);
    });

    viewport.addEventListener("touchcancel", () => {
        if (isDragging) endDrag();
    });

    // Desktop (mouse) drag is intentionally disabled — use wheel to navigate.
    // Touch drag (pointerType !== "mouse") remains active for mobile.
    viewport.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse") return;
        if (e.button !== undefined && e.button !== 0) return;
        startDrag(e.pageY);
    });

    const onPointerMove = (e) => { if (isDragging && e.pointerType !== "mouse") moveDrag(e.pageY); };
    const onPointerUp = (e) => { if (isDragging && e.pointerType !== "mouse") endDrag(e.pageY); };
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
            const trackPaddingBottom = Math.max(120, Math.floor((viewportH - lastSlideH) / 2));
            carouselTrack.style.paddingBottom = `${trackPaddingBottom}px`;
        }
        measureSlides(); // Re-measure after padding applied
        snapScrollTo(computeTargetY(currentQuestionIndex), currentQuestionIndex);
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
    const firstEnterDuration = Math.round((0.09 + firstQ.options.length * 0.05) * 1000 + 380 + 40);
    setTimeout(() => {
        quizScreen.querySelectorAll(".quiz-item-enter").forEach(el => {
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
            const trackPaddingBottom = Math.max(120, Math.floor((viewportH - lastSlideH) / 2));
            track.style.paddingBottom = `${trackPaddingBottom}px`;

            // Re-measure after padding is applied (all offsetTop values shift by trackPaddingTop)
            measureSlides();

            // Position at slide 0 center (which is now exactly viewportH/2 due to padding)
            scrollCurrentY = computeTargetY(0);
            scrollTargetY = scrollCurrentY;
            track.style.transform = `translateY(${-scrollCurrentY}px)`;
            applySlideOpacities(0);

            const firstSlide = track.querySelector(".quiz-slide[data-slide-index='0']");
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
    clearTimeout(wheelResetTimer);
    wheelAccumulator = 0;
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
                menuScreen.querySelectorAll(".menu-row, .menu-actions").forEach(r => {
                    r.classList.remove("menu-exit");
                    r.style.animationDelay = "";
                });
            }
        }
    });
}
