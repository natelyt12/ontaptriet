/**
 * Module: Giao diện Lịch sử làm bài (scripts/history-view.js)
 * Chịu trách nhiệm:
 * - Hiển thị 5 lượt làm bài gần nhất từ LocalStorage
 * - Nút "Xem câu sai ›" cho các lượt làm bài có câu sai (tự động ẩn khi đúng hết)
 * - Màn hình chi tiết xem lại các câu sai của từng lượt làm bài trong lịch sử
 * - Nút "‹ Về menu chính" (Nav Action: Font thường)
 * - Nút "Xóa lịch sử" (Destructive Action: Font italic, cảnh báo đỏ)
 * - Điều hướng về Menu chính và quay lại giữa các màn hình
 */

/**
 * Chuyển từ Menu chính sang Màn hình Lịch sử làm bài
 */
function showHistoryScreen() {
    ScreenSwitcher.to("history-screen", {
        autoUnlock: true,
        onBeforeFade: () => {
            const brandHeader = document.getElementById("brand-header");
            if (brandHeader) {
                brandHeader.classList.add("fade-out");
            }
        },
        onShow: () => {
            renderHistoryScreen();
        }
    });
}

/**
 * Hiển thị nội dung danh sách lịch sử ôn tập (tối đa 5 lượt gần nhất)
 */
function renderHistoryScreen() {
    const historyScreen = document.getElementById("history-screen");
    if (!historyScreen) return;

    const list = (typeof getHistory === "function" ? getHistory() : []).slice(0, 5);

    historyScreen.innerHTML = `
        <div class="history-container">
            <div class="history-list">
                ${list.length === 0 ? `
                    <div class="history-empty quiz-item-enter" style="animation-delay: 0.05s;">
                        Chưa có lượt làm bài nào được lưu.
                    </div>
                ` : list.map((item, idx) => {
                    const hasMistakes = Array.isArray(item.mistakes) && item.mistakes.length > 0;
                    return `
                        <div class="history-item quiz-item-enter" style="animation-delay: ${0.05 + idx * 0.05}s;">
                            <div class="history-item-main">
                                <span class="history-index">${idx + 1}.</span>
                                <span class="history-subject">${item.subject}</span>
                                <span class="history-chapter">(${item.chapter})</span>
                                <span class="history-separator">·</span>
                                <strong class="history-score">${item.score} đ</strong>
                                <span class="history-counts">(${item.correct}/${item.total} câu)</span>
                            </div>
                            <div class="history-item-sub">
                                <div class="history-item-date">${item.date}</div>
                                ${hasMistakes ? `
                                    <button class="btn-action btn-history-mistakes" data-history-idx="${idx}">
                                        <span class="btn-label">Xem câu sai</span> <span class="btn-arrow">›</span>
                                    </button>
                                ` : ""}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>

            <div class="menu-actions quiz-item-enter" style="animation-delay: ${0.05 + Math.max(1, list.length) * 0.05}s; margin-top: 28px;">
                <button id="history-back-btn" class="btn-action btn-nav">
                    <span class="btn-arrow">‹</span> <span class="btn-label">Về menu chính</span>
                </button>
                ${list.length > 0 ? `
                    <button id="history-clear-btn" class="btn-action btn-danger">
                        Xóa lịch sử
                    </button>
                ` : ""}
            </div>
        </div>
    `;

    // Dọn sạch class enter sau khi animation trồi lên hoàn tất
    setTimeout(() => {
        historyScreen.querySelectorAll(".quiz-item-enter").forEach(el => {
            el.classList.remove("quiz-item-enter");
            el.style.animationDelay = "";
        });
    }, 600);

    // Gắn sự kiện xem câu sai cho từng đợt làm bài (nếu có câu sai)
    historyScreen.querySelectorAll(".btn-history-mistakes").forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute("data-history-idx"), 10);
            if (!isNaN(idx) && list[idx]) {
                showHistoryMistakesDetail(list[idx]);
            }
        };
    });

    // Gắn sự kiện nút Quay lại
    const backBtn = document.getElementById("history-back-btn");
    if (backBtn) {
        backBtn.onclick = () => {
            returnFromHistoryToMenu();
        };
    }

    // Gắn sự kiện nút Xóa lịch sử (xác nhận 2 bước)
    const clearBtn = document.getElementById("history-clear-btn");
    let isClearConfirming = false;
    let clearTimer = null;

    if (clearBtn) {
        clearBtn.onclick = () => {
            if (!isClearConfirming) {
                isClearConfirming = true;
                clearBtn.style.color = "#d93025";
                clearBtn.style.borderBottomColor = "#d93025";
                clearBtn.textContent = "Xác nhận xóa?";

                clearTimeout(clearTimer);
                clearTimer = setTimeout(() => {
                    if (isClearConfirming) {
                        isClearConfirming = false;
                        clearBtn.style.color = "";
                        clearBtn.style.borderBottomColor = "";
                        clearBtn.textContent = "Xóa lịch sử";
                    }
                }, 4000);
            } else {
                clearTimeout(clearTimer);
                if (typeof clearHistory === "function") {
                    clearHistory();
                }
                renderHistoryScreen();
            }
        };
    }
}

/**
 * Chuyển sang màn hình xem chi tiết các câu sai của đợt làm bài trong lịch sử
 * @param {Object} record - Bản ghi lịch sử { id, date, subject, chapter, score, correct, total, mistakes }
 */
function showHistoryMistakesDetail(record) {
    ScreenSwitcher.to("history-detail-screen", {
        autoUnlock: false,
        onShow: () => {
            renderHistoryMistakesDetail(record);
        }
    });
}

/**
 * Hiển thị giao diện chi tiết câu sai của một đợt thi trong lịch sử
 * @param {Object} record
 */
function renderHistoryMistakesDetail(record) {
    const detailScreen = document.getElementById("history-detail-screen");
    if (!detailScreen) return;

    if (DropdownAnimationLock) {
        DropdownAnimationLock.lock();
    }

    const mistakes = Array.isArray(record.mistakes) ? record.mistakes : [];
    const prefixes = ["A", "B", "C", "D", "E", "F"];

    let currentDelay = 0.04;
    const stepDelay = 0.05;

    const summaryDelay = currentDelay;
    currentDelay += stepDelay;

    const mistakesHeaderDelay = currentDelay;
    currentDelay += stepDelay;

    let mistakesHtml = "";
    if (mistakes.length === 0) {
        mistakesHtml = `
            <div class="mistakes-empty-congrats quiz-item-enter" style="animation-delay: ${currentDelay.toFixed(2)}s;">
                Lượt làm bài này bạn đã trả lời đúng toàn bộ câu hỏi.
            </div>
        `;
        currentDelay += stepDelay;
    } else {
        const itemsHtml = mistakes.map((item, idx) => {
            const itemDelay = Math.min(0.75, currentDelay + idx * stepDelay);

            let optionsHtml = "";
            if (Array.isArray(item.options) && item.options.length > 0) {
                optionsHtml = item.options.map((opt, optIdx) => {
                    const isWrongSelected = optIdx === item.selectedIndex;
                    const isCorrectAnswer = optIdx === item.correctIndex;
                    let optClass = "mistake-option";
                    if (isWrongSelected) optClass += " answer-wrong";
                    if (isCorrectAnswer) optClass += " answer-correct-revealed";

                    return `
                        <div class="${optClass}">
                            <span class="option-prefix">${prefixes[optIdx] || ""}.</span>
                            <span class="option-text">${opt}</span>
                        </div>
                    `;
                }).join("");
            } else {
                optionsHtml = `
                    <div class="mistake-option answer-wrong">
                        <span class="option-prefix">✕ Đã chọn:</span> <span class="option-text">${item.selected || "(Chưa chọn)"}</span>
                    </div>
                    <div class="mistake-option answer-correct-revealed">
                        <span class="option-prefix">✓ Đáp án đúng:</span> <span class="option-text">${item.correct || ""}</span>
                    </div>
                `;
            }

            const qNum = item.questionNumber || (idx + 1);

            return `
                <div class="mistake-item quiz-item-enter" style="animation-delay: ${itemDelay.toFixed(2)}s;">
                    <div class="mistake-question">
                        <strong class="question-number">Câu ${qNum}:</strong>
                        <span class="question-text">${item.question}</span>
                    </div>
                    <div class="mistake-options">
                        ${optionsHtml}
                    </div>
                </div>
            `;
        }).join("");

        currentDelay += Math.min(mistakes.length, 10) * stepDelay;

        mistakesHtml = `
            <div class="mistakes-list">
                ${itemsHtml}
            </div>
        `;
    }

    const actionsDelay = (currentDelay + 0.04).toFixed(2);

    detailScreen.innerHTML = `
        <div class="history-detail-container">
            <!-- 1. Tóm tắt lượt làm bài -->
            <div class="history-detail-summary quiz-item-enter" style="animation-delay: ${summaryDelay.toFixed(2)}s;">
                <div class="quiz-question">
                    <strong class="question-number">Chi tiết câu sai</strong>
                    <span class="question-text">${record.subject || ""} (${record.chapter || ""})</span>
                </div>
                <div class="history-detail-meta">
                    Thời gian: ${record.date || ""} · Điểm: <strong>${record.score || "0"} đ</strong> (${record.correct || 0}/${record.total || 0} câu đúng)
                </div>
            </div>

            <!-- 2. Danh sách các câu làm sai -->
            <div class="mistakes-section">
                <div class="mistakes-header quiz-item-enter" style="animation-delay: ${mistakesHeaderDelay.toFixed(2)}s;">
                    <span class="mistakes-title">Danh sách câu trả lời sai:</span>
                    <span class="mistakes-count">${mistakes.length} câu</span>
                </div>
                ${mistakesHtml}
            </div>

            <!-- 3. Nút quay lại lịch sử -->
            <div class="menu-actions quiz-item-enter" style="animation-delay: ${actionsDelay}s; margin-top: 20px; padding-top: 14px;">
                <button id="history-detail-back-btn" class="btn-action btn-nav">
                    <span class="btn-arrow">‹</span> <span class="btn-label">Quay lại lịch sử</span>
                </button>
            </div>
        </div>
    `;

    const totalDurationMs = Math.round((parseFloat(actionsDelay) + 0.38) * 1000 + 40);

    setTimeout(() => {
        detailScreen.querySelectorAll(".quiz-item-enter").forEach(el => {
            el.classList.remove("quiz-item-enter");
            el.style.animationDelay = "";
        });
        if (DropdownAnimationLock) {
            DropdownAnimationLock.unlock();
        }
    }, totalDurationMs);

    const backBtn = document.getElementById("history-detail-back-btn");
    if (backBtn) {
        backBtn.onclick = () => {
            returnFromDetailToHistory();
        };
    }
}

/**
 * Quay lại danh sách Lịch sử từ màn hình Chi tiết câu sai
 */
function returnFromDetailToHistory() {
    ScreenSwitcher.to("history-screen", {
        fadeIn: true,
        autoUnlock: true,
        onShow: () => {
            const detailScreen = document.getElementById("history-detail-screen");
            if (detailScreen) {
                detailScreen.innerHTML = "";
            }
            renderHistoryScreen();
        }
    });
}

/**
 * Quay lại Menu chính từ Màn hình Lịch sử
 */
function returnFromHistoryToMenu() {
    ScreenSwitcher.to("menu-screen", {
        fadeIn: true,
        autoUnlock: true,
        onShow: (menuScreen) => {
            const brandHeader = document.getElementById("brand-header");
            if (brandHeader) {
                brandHeader.classList.remove("fade-out");
            }
            const historyScreen = document.getElementById("history-screen");
            if (historyScreen) {
                historyScreen.innerHTML = "";
            }
            const detailScreen = document.getElementById("history-detail-screen");
            if (detailScreen) {
                detailScreen.innerHTML = "";
            }
            if (menuScreen) {
                const rows = menuScreen.querySelectorAll(".menu-row, .menu-actions");
                rows.forEach(r => {
                    r.classList.remove("menu-exit");
                    r.style.animationDelay = "";
                });
            }
        }
    });
}


