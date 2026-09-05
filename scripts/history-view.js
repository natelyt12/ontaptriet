/**
 * Module: Giao diện Lịch sử làm bài (scripts/history-view.js)
 * Chịu trách nhiệm:
 * - Hiển thị 5 lượt làm bài gần nhất từ LocalStorage
 * - Nút "‹ Về menu chính" (Nav Action: Font thường)
 * - Nút "Xóa lịch sử" (Destructive Action: Font italic, cảnh báo đỏ)
 * - Điều hướng về Menu chính
 */

/**
 * Chuyển từ Menu chính sang Màn hình Lịch sử làm bài
 */
function showHistoryScreen() {
    if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;
    if (DropdownAnimationLock) {
        DropdownAnimationLock.lock();
    }

    // Fade out cả cụm menu chính tại chỗ (không trượt)
    const menuScreen = document.getElementById("menu-screen");
    if (menuScreen) {
        menuScreen.classList.add("quiz-fade-out-only");
    }

    setTimeout(() => {
        const historyScreen = document.getElementById("history-screen");

        if (menuScreen) {
            menuScreen.style.display = "none";
            menuScreen.classList.remove("quiz-fade-out-only");
        }

        if (historyScreen) {
            historyScreen.style.display = "block";
            renderHistoryScreen();
        }

        if (DropdownAnimationLock) {
            DropdownAnimationLock.unlock();
        }
    }, 220);
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
            <div class="history-header quiz-item-enter" style="animation-delay: 0.04s;">
                <strong class="history-title">Lịch sử ôn tập (5 lượt gần nhất)</strong>
            </div>

            <div class="history-list">
                ${list.length === 0 ? `
                    <div class="history-empty quiz-item-enter" style="animation-delay: 0.08s;">
                        Chưa có lượt làm bài nào được lưu.
                    </div>
                ` : list.map((item, idx) => `
                    <div class="history-item quiz-item-enter" style="animation-delay: ${0.08 + idx * 0.05}s;">
                        <div class="history-item-main">
                            <span class="history-index">${idx + 1}.</span>
                            <span class="history-subject">${item.subject}</span>
                            <span class="history-chapter">(${item.chapter})</span>
                            <span class="history-separator">·</span>
                            <strong class="history-score">${item.score} đ</strong>
                            <span class="history-counts">(${item.correct}/${item.total} câu)</span>
                        </div>
                        <div class="history-item-date">${item.date}</div>
                    </div>
                `).join("")}
            </div>

            <div class="menu-actions quiz-item-enter" style="animation-delay: ${0.08 + Math.max(1, list.length) * 0.05}s; margin-top: 28px;">
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
 * Quay lại Menu chính từ Màn hình Lịch sử
 */
function returnFromHistoryToMenu() {
    const menuScreen = document.getElementById("menu-screen");
    const historyScreen = document.getElementById("history-screen");

    if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;
    if (DropdownAnimationLock) {
        DropdownAnimationLock.lock();
    }

    if (historyScreen) {
        historyScreen.classList.add("quiz-fade-out-only");
    }

    setTimeout(() => {
        if (historyScreen) {
            historyScreen.style.display = "none";
            historyScreen.innerHTML = "";
            historyScreen.classList.remove("quiz-fade-out-only");
        }

        if (menuScreen) {
            menuScreen.style.display = "block";
            menuScreen.classList.add("menu-fade-in-only");
            const rows = document.querySelectorAll("#menu-screen .menu-row, #menu-screen .menu-actions");
            rows.forEach(r => {
                r.classList.remove("menu-exit");
                r.style.animationDelay = "";
            });

            setTimeout(() => {
                menuScreen.classList.remove("menu-fade-in-only");
                if (DropdownAnimationLock) {
                    DropdownAnimationLock.unlock();
                }
            }, 260);
        } else {
            if (DropdownAnimationLock) {
                DropdownAnimationLock.unlock();
            }
        }
    }, 220);
}

