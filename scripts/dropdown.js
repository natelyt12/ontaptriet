// --- MODULE DROPDOWN TÁI SỬ DỤNG (SCRIPTS/DROPDOWN.JS) ---

/**
 * Quản lý trạng thái khóa tương tác click khi đang chạy animation
 */
const DropdownAnimationLock = {
    isLocked: false,
    lock() {
        this.isLocked = true;
        document.body.classList.add("animating-lock");
    },
    unlock() {
        this.isLocked = false;
        document.body.classList.remove("animating-lock");
        document.querySelectorAll(".btn-active-hold").forEach(el => el.classList.remove("btn-active-hold"));
    }
};

// Chặn mọi tương tác chuột khi animation đang chạy qua Capture Phase trên window
// Không cần dùng pointer-events: none, giúp giữ nguyên 100% trạng thái :hover của nút khi bấm
window.addEventListener("mousedown", (e) => {
    if (DropdownAnimationLock.isLocked) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
    }
    const btn = e.target.closest(".btn-action, .btn-quiz-back, .btn-quiz-next, .btn-random-toggle, .limit-choice, .dropdown-trigger, .quiz-option");
    if (btn) {
        btn.classList.add("btn-active-hold");
    }
}, true);

window.addEventListener("click", (e) => {
    if (DropdownAnimationLock.isLocked) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }
}, true);

window.addEventListener("mouseup", () => {
    if (!DropdownAnimationLock.isLocked) {
        setTimeout(() => {
            document.querySelectorAll(".btn-active-hold").forEach(el => el.classList.remove("btn-active-hold"));
        }, 120);
    }
}, true);

/**
 * Hàm hỗ trợ đo kích thước chữ chính xác và cuộn chữ (Vertical Text Roll + Width Transition)
 */
function animateLabelRoll(viewportEl, newText, onDone) {
    if (!viewportEl) {
        if (typeof onDone === "function") onDone();
        return;
    }

    const currentSpan = viewportEl.querySelector(".label-text-current");
    const oldText = currentSpan ? currentSpan.textContent.trim() : viewportEl.textContent.trim();

    if (oldText === newText.trim()) {
        if (typeof onDone === "function") onDone();
        return;
    }

    // 1. Đo chiều rộng hiện tại và gán width dạng px để CSS transition hoạt động
    const oldWidth = viewportEl.offsetWidth;
    viewportEl.style.width = `${oldWidth}px`;

    // 2. Tạo phần tử đo ẩn để tính chính xác chiều rộng của text mới
    const ruler = document.createElement("span");
    ruler.style.visibility = "hidden";
    ruler.style.position = "absolute";
    ruler.style.whiteSpace = "nowrap";
    const compStyle = window.getComputedStyle(viewportEl);
    ruler.style.fontFamily = compStyle.fontFamily;
    ruler.style.fontSize = compStyle.fontSize;
    ruler.style.fontWeight = compStyle.fontWeight;
    ruler.style.fontStyle = compStyle.fontStyle;
    ruler.style.letterSpacing = compStyle.letterSpacing;
    ruler.textContent = newText;
    document.body.appendChild(ruler);
    const newWidth = ruler.offsetWidth;
    document.body.removeChild(ruler);

    // Giai đoạn 1: Chữ cũ bay lên trên và mờ dần trong 160ms với Expo In (chỉ có chữ cũ trong DOM)
    viewportEl.innerHTML = `<span class="label-text-current text-fly-out">${oldText}</span>`;

    // Giai đoạn 2: Đúng 160ms sau, khi chữ cũ đã bay mất, chữ mới trồi từ dưới lên trong 280ms với Expo Out
    setTimeout(() => {
        // Kích hoạt co giãn chiều rộng của viewport (mũi tên đứng kế bên sẽ tự trôi theo mượt mà)
        viewportEl.style.width = `${newWidth}px`;
        // Đưa chữ mới vào DOM để trồi lên
        viewportEl.innerHTML = `<span class="label-text-current text-fly-in">${newText}</span>`;

        // Giai đoạn 3: Khi chữ mới đã trồi lên vị trí chuẩn, dọn dẹp DOM và trả lại width tự do
        setTimeout(() => {
            viewportEl.innerHTML = `<span class="label-text-current">${newText}</span>`;
            viewportEl.style.width = "";
            if (typeof onDone === "function") onDone();
        }, 290);
    }, 160);
}

/**
 * Lớp InlineDropdownComponent
 */
class InlineDropdown {
    constructor({ containerId, initialText, getItems, onSelect }) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`Không tìm thấy container với ID: ${containerId}`);
            return;
        }

        this.trigger = this.container.querySelector(".dropdown-trigger");
        this.viewport = this.container.querySelector(".label-viewport");
        this.arrow = this.container.querySelector(".dropdown-arrow");
        this.menu = this.container.querySelector(".dropdown-menu");
        this.getItems = getItems;
        this.onSelect = onSelect;

        // Đảm bảo mũi tên › luôn hiện diện ở cuối trigger
        if (!this.arrow && this.trigger) {
            this.arrow = document.createElement("span");
            this.arrow.className = "dropdown-arrow";
            this.arrow.textContent = "›";
            this.trigger.appendChild(this.arrow);
        }

        if (initialText) {
            this.setValueText(initialText, false);
        }

        this.bindEvents();
    }

    setValueText(text, animate = false, onDone) {
        if (!this.viewport) return;
        if (animate) {
            animateLabelRoll(this.viewport, text, onDone);
        } else {
            this.viewport.innerHTML = `<span class="label-text-current">${text}</span>`;
            if (typeof onDone === "function") onDone();
        }
    }

    getText() {
        const span = this.viewport ? this.viewport.querySelector(".label-text-current") : null;
        return span ? span.textContent.trim() : (this.viewport ? this.viewport.textContent.trim() : "");
    }

    bindEvents() {
        if (!this.trigger) return;

        this.trigger.addEventListener("mousedown", (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            e.stopPropagation();
            if (DropdownAnimationLock.isLocked) return;

            const isOpen = this.trigger.classList.contains("active");
            if (isOpen) {
                this.close();
            } else {
                InlineDropdown.closeAll(() => this.open());
            }
        });
    }

    open() {
        if (!this.trigger || !this.menu) return;

        this.trigger.classList.add("active");
        this.menu.innerHTML = "";

        const items = typeof this.getItems === "function" ? this.getItems() : [];
        items.forEach((itemData, index) => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            if (itemData.fontFamily) {
                item.style.fontFamily = itemData.fontFamily;
            }
            item.style.setProperty("--item-delay", `${0.18 + index * 0.04}s`);
            item.innerHTML = `<span class="item-text">${itemData.name}</span>`;

            item.addEventListener("mousedown", (e) => {
                if (e.button !== undefined && e.button !== 0) return;
                e.stopPropagation();
                if (DropdownAnimationLock.isLocked) return;

                DropdownAnimationLock.lock();
                const isChanged = (this.getText() !== itemData.name.trim());

                // 1. Đóng menu trước với Expo In
                InlineDropdown.closeAll(() => {
                    this.container.classList.add("has-selection");

                    // 2. Animate cuộn chữ và co giãn chiều rộng label
                    if (isChanged) {
                        this.setValueText(itemData.name, true, () => {
                            if (typeof this.onSelect === "function") {
                                this.onSelect(itemData);
                            }
                            DropdownAnimationLock.unlock();
                        });
                    } else {
                        DropdownAnimationLock.unlock();
                    }
                });
            });

            this.menu.appendChild(item);
        });

        this.menu.classList.remove("closing");
        this.menu.classList.add("show");
    }

    close() {
        if (!this.trigger || !this.menu) return;
        this.trigger.classList.remove("active");

        if (this.menu.classList.contains("show")) {
            this.menu.classList.remove("show");
            this.menu.classList.add("closing");

            setTimeout(() => {
                this.menu.classList.remove("closing");
                this.menu.innerHTML = "";
            }, 220);
        }
    }

    static closeAll(callback) {
        const activeMenus = document.querySelectorAll(".dropdown-menu.show");
        document.querySelectorAll(".dropdown-trigger.active").forEach(t => t.classList.remove("active"));

        if (activeMenus.length > 0) {
            activeMenus.forEach(m => {
                m.classList.remove("show");
                m.classList.add("closing");
            });

            setTimeout(() => {
                document.querySelectorAll(".dropdown-menu.closing").forEach(m => {
                    m.classList.remove("closing");
                    m.innerHTML = "";
                });
                if (typeof callback === "function") callback();
            }, 220);
        } else {
            if (typeof callback === "function") callback();
        }
    }
}

// Bắt sự kiện click ra ngoài để đóng mọi dropdown
document.addEventListener("mousedown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (DropdownAnimationLock.isLocked) return;
    InlineDropdown.closeAll();
});

