// --- HÀM KHỞI TẠO MENU ---
function initMenu() {
    setTimeout(() => {
        document.getElementById("app-window").classList.remove("closing");
    }, 500);

    setTimeout(() => {
        document.querySelector(".wallpaper").style.opacity = "1";
    }, 2000);
    // 1. Render danh sách môn
    for (const key in appConfig) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = appConfig[key].name;
        subjectSelect.appendChild(option);
    }

    // 2. Bắt sự kiện thay đổi môn để load chương
    subjectSelect.addEventListener("change", loadChapters);

    // Load chương cho môn mặc định ban đầu
    loadChapters();

    // Khởi tạo Custom Select cho môn học
    updateCustomSelect(subjectSelect);

    // Bắt sự kiện cho nút Thông tin
    const infoBtn = document.getElementById("info-btn");
    if (infoBtn) {
        infoBtn.addEventListener("click", showAppInfo);
    }

    // Nút Thông tin cho bản Mobile
    const mobileInfoBtn = document.getElementById("mobile-info-toggle");
    if (mobileInfoBtn) {
        mobileInfoBtn.addEventListener("click", showAppInfo);
    }
}

function showAppInfo() {
    const infoHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <p style="font-size: 40px; margin: 0; line-height: 1;">🎓</p>
            <h2 style="margin: 10px 0 5px; color: var(--text-main);">Ôn Tập Trắc Nghiệm</h2>
            <p style="color: var(--text-sub); margin: 0; font-size: 13px;">Phiên bản 1.4.3</p>
        </div>
        <div style="font-size: 13px; line-height: 1.6; color: var(--text-main); margin-bottom: 20px; background: rgba(0,0,0,0.1); padding: 15px; border-radius: 8px; border: 1px solid var(--border-subtle);">
            <p style="margin: 0 0 10px;"><strong>Tác giả:</strong> Phúc Thanh tại DCCNTT-16.3</p>
            <p style="margin: 0 0 10px;">Ứng dụng giúp bạn ôn luyện trắc nghiệm các môn học lý thuyết trên trường một cách hiệu quả nhất.</p>
            <p style="margin: 0;"><strong>Tính năng nổi bật:</strong></p>
            <ul style="margin: 5px 0 10px; padding-left: 20px;">
                <li>Chế độ Tập trung chống xao nhãng.</li>
                <li>Lưu trữ lịch sử, theo dõi tiến độ.</li>
                <li>Giao diện tối ưu có cả Sáng và Tối.</li>
            </ul>
            <div style="width: 100%; box-sizing: border-box;">
                <a href="https://discord.gg/axTMHhXR" target="_blank" class="discord-btn">
                    <div class="discord-logo-wrapper">
                        <svg width="32" height="32" viewBox="0 0 127.14 96.36" fill="#5865F2" xmlns="http://www.w3.org/2000/svg"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.7,77.7,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c0,0,.04-.06.09-.09C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
                    </div>
                    <div class="discord-text-wrapper">
                        <span class="discord-title">Gia nhập Giáo Phái Dân Con</span>
                        <span class="discord-subtitle">giao lưu cùng bọn tôi</span>
                    </div>
                </a>
                <a href="https://github.com/natelyt12/ontaptriet" target="_blank" class="github-btn">
                    <div class="github-logo-wrapper">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </div>
                    <div class="github-text-wrapper">
                        <span class="github-title">Mã nguồn ứng dụng</span>
                        <span class="github-subtitle">xem trên GitHub</span>
                    </div>
                </a>
            </div>
        </div>
        <div class="modal-buttons" style="border-top: none; padding-bottom: 0;">
            <button class="mac-btn-primary small" id="info-ok-btn" style="width: 100%;">Đã Hiểu</button>
        </div>
    `;

    const infoWin = createAppWindow("Thông tin Ứng dụng", infoHTML, 380, "auto");
    const okBtn = infoWin.querySelector("#info-ok-btn");
    okBtn.onclick = () => {
        const currentTransform = window.getComputedStyle(infoWin).transform;
        const isMobile = window.innerWidth <= 720;
        const outTransform = isMobile ? "scale(0.95)" : `${currentTransform} scale(0.95)`;
        infoWin.animate([
            { transform: isMobile ? "scale(1)" : `${currentTransform} scale(1)`, opacity: 1 },
            { transform: outTransform, opacity: 0 }
        ], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
        setTimeout(() => infoWin.remove(), 300);
    };
}

function loadChapters() {
    const subjectKey = subjectSelect.value;
    const chapters = appConfig[subjectKey].files;

    chapterSelect.innerHTML = '<option value="all">Ôn tập tất cả các chương</option>';

    chapters.forEach((chap, index) => {
        const option = document.createElement("option");
        option.value = index; // Lưu index trong mảng files
        option.textContent = chap.name;
        chapterSelect.appendChild(option);
    });

    // Cập nhật Custom Select cho chương
    updateCustomSelect(chapterSelect);
}

// --- HỆ THỐNG CUSTOM SELECT (DROPDOWN) GIAO DIỆN TECH ---
function updateCustomSelect(selectEl) {
    let wrapper = selectEl.parentElement;
    if (!wrapper.classList.contains('custom-select-wrapper')) {
        const newWrapper = document.createElement('div');
        newWrapper.className = 'custom-select-wrapper';
        wrapper.insertBefore(newWrapper, selectEl);
        newWrapper.appendChild(selectEl);
        wrapper = newWrapper;
    }

    const oldDisplay = wrapper.querySelector('.custom-select-display');
    if (oldDisplay) oldDisplay.remove();
    const oldDropdown = wrapper.querySelector('.custom-select-dropdown');
    if (oldDropdown) oldDropdown.remove();

    selectEl.style.display = 'none';

    const display = document.createElement('div');
    display.className = 'custom-select-display';
    display.innerHTML = `<span>${selectEl.options[selectEl.selectedIndex]?.text || ''}</span> <div class="arrow-down"></div>`;

    display.addEventListener('mouseover', () => display.classList.add('tech-hover'));
    display.addEventListener('mouseout', () => display.classList.remove('tech-hover'));

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';

    Array.from(selectEl.options).forEach((opt, index) => {
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        item.textContent = opt.text;

        if (index === selectEl.selectedIndex) item.classList.add('selected');

        item.addEventListener('click', () => {
            selectEl.selectedIndex = index;
            selectEl.dispatchEvent(new Event('change'));

            display.querySelector('span').textContent = opt.text;

            dropdown.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');

            dropdown.classList.remove('show');
            display.classList.remove('active');
        });

        item.addEventListener('mouseover', () => item.classList.add('tech-hover'));
        item.addEventListener('mouseout', () => item.classList.remove('tech-hover'));

        dropdown.appendChild(item);
    });

    display.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select-dropdown.show').forEach(d => {
            if (d !== dropdown) {
                d.classList.remove('show');
                d.previousElementSibling.classList.remove('active');
            }
        });

        dropdown.classList.toggle('show');
        display.classList.toggle('active');
    });

    wrapper.appendChild(display);
    wrapper.appendChild(dropdown);
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-dropdown.show').forEach(d => {
        d.classList.remove('show');
        d.previousElementSibling.classList.remove('active');
    });
});

// --- PHẦN 6: QUẢN LÝ CỬA SỔ (WINDOW MANAGER & DRAGGABLE) ---
let windowZIndexCounter = 100;

function getTranslateValues(element) {
    const style = window.getComputedStyle(element);
    const matrix = new WebKitCSSMatrix(style.transform);
    return { x: matrix.m41, y: matrix.m42 };
}

// Bắt sự kiện kéo thả cho TẤT CẢ các cửa sổ có class .mac-window và .title-bar
let isGlobalDragging = false;
let currentDraggingWindow = null;
let startX, startY, initialTranslateX = 0, initialTranslateY = 0;

document.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const titleBar = e.target.closest(".title-bar");
    if (!titleBar) return;

    // Nếu bấm nhầm nút close hoặc info thì không drag
    if (e.target.closest(".win-close-btn") || e.target.closest(".win-info-btn")) return;

    const win = titleBar.closest(".mac-window");
    if (!win) return;

    // Chỉ kéo được trên PC
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    win.style.zIndex = ++windowZIndexCounter; // Đẩy cửa sổ này lên trên cùng
    isGlobalDragging = true;
    currentDraggingWindow = win;
    startX = e.clientX;
    startY = e.clientY;

    const currentTransform = getTranslateValues(win);
    initialTranslateX = currentTransform.x;
    initialTranslateY = currentTransform.y;
    win.style.transition = "none";
});

document.addEventListener("mousemove", (e) => {
    if (!isGlobalDragging || !currentDraggingWindow) return;
    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    currentDraggingWindow.style.transform = `translate(${initialTranslateX + dx}px, ${initialTranslateY + dy}px)`;
});

document.addEventListener("mouseup", () => {
    if (isGlobalDragging && currentDraggingWindow) {
        isGlobalDragging = false;
        currentDraggingWindow.style.transition = "all 0.3s ease";
        currentDraggingWindow = null;
    }
});

// Hàm tạo cửa sổ động dùng chung
function createAppWindow(title, contentElement, width = 600, height = 680) {
    const win = document.createElement("div");
    win.className = "mac-window";
    win.style.position = "absolute";
    if (window.innerWidth > 720) {
        // Mở lệch ra chút cho đẹp (hiệu ứng xếp chồng) - Chỉ trên PC
        const randomOffset = (Math.random() - 0.5) * 40;
        win.style.left = `calc(50% + ${randomOffset}px)`;
        win.style.top = `calc(50% + ${randomOffset}px)`;
        win.style.transform = "translate(-50%, -50%)";
    } else {
        // Trên di động: Cố định vào vị trí chính giữa hoặc full màn hình
        win.style.left = "0";
        win.style.top = "0";
        win.style.transform = "none";
    }

    // Setup kích thước
    if (window.innerWidth > 720) {
        win.style.width = width === "auto" ? "auto" : width + "px";
        win.style.height = height === "auto" ? "auto" : height + "px";
    }

    win.style.zIndex = ++windowZIndexCounter;

    // Title Bar
    const titleBar = document.createElement("div");
    titleBar.className = "title-bar";

    const controls = document.createElement("div");
    controls.className = "window-controls";
    const closeBtn = document.createElement("div");
    closeBtn.className = "win-close-btn";
    closeBtn.innerHTML = "&#x2715;";
    closeBtn.onclick = () => {
        // Lấy vị trí hiện tại để không bị giật khi tắt
        const currentTransform = window.getComputedStyle(win).transform;
        win.animate([
            { transform: `${currentTransform} scale(1)`, opacity: 1 },
            { transform: `${currentTransform} scale(0.95)`, opacity: 0 }
        ], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
        setTimeout(() => win.remove(), 300);
    };
    controls.appendChild(closeBtn);

    const titleArea = document.createElement("div");
    titleArea.className = "window-title";
    titleArea.innerText = title;

    titleBar.appendChild(controls);
    titleBar.appendChild(titleArea);

    const contentArea = document.createElement("div");
    contentArea.className = "window-content";
    if (typeof contentElement === "string") {
        contentArea.innerHTML = contentElement;
    } else {
        contentArea.appendChild(contentElement);
    }

    win.appendChild(titleBar);
    win.appendChild(contentArea);

    document.body.appendChild(win);

    // Animation mở lên - không dùng fill "forwards" để trả lại inline transform (cho phép kéo)
    const isMobile = window.innerWidth <= 720;
    const startTransform = isMobile ? "scale(0.95)" : "translate(-50%, -50%) scale(0.95)";
    const endTransform = isMobile ? "scale(1)" : "translate(-50%, -50%) scale(1)";

    win.animate([
        { transform: startTransform, opacity: 0 },
        { transform: endTransform, opacity: 1 }
    ], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });

    return win;
}

// Override alert mặc định
window.alert = function (message) {
    const alertBody = document.createElement("div");
    alertBody.innerHTML = `
        <p class="modal-text">${message}</p>
        <div class="modal-buttons">
            <button class="mac-btn-primary small alert-ok-btn">OK</button>
        </div>
    `;

    const alertWin = createAppWindow("Thông báo", alertBody, 400, "auto");

    const okBtn = alertBody.querySelector(".alert-ok-btn");
    okBtn.onclick = () => {
        const currentTransform = window.getComputedStyle(alertWin).transform;
        const isMobile = window.innerWidth <= 720;
        const outTransform = isMobile ? "scale(0.95)" : `${currentTransform} scale(0.95)`;
        alertWin.animate([
            { transform: isMobile ? "scale(1)" : `${currentTransform} scale(1)`, opacity: 1 },
            { transform: outTransform, opacity: 0 }
        ], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
        setTimeout(() => alertWin.remove(), 300);
    };
};

// Hàm confirm bất đồng bộ sử dụng chung cửa sổ UI
window.appConfirm = function (message, onConfirm) {
    const confirmBody = document.createElement("div");
    confirmBody.innerHTML = `
        <p class="modal-text">${message.replace(/\n/g, "<br>")}</p>
        <div class="modal-buttons">
            <button class="mac-btn-secondary small confirm-cancel-btn">Hủy</button>
            <button class="mac-btn-secondary small confirm-ok-btn">Đồng ý</button>
        </div>
    `;

    const confirmWin = createAppWindow("Xác nhận", confirmBody, 400, "auto");

    const cancelBtn = confirmBody.querySelector(".confirm-cancel-btn");
    const okBtn = confirmBody.querySelector(".confirm-ok-btn");

    const closeWin = () => {
        const currentTransform = window.getComputedStyle(confirmWin).transform;
        const isMobile = window.innerWidth <= 720;
        const outTransform = isMobile ? "scale(0.95)" : `${currentTransform} scale(0.95)`;
        confirmWin.animate([
            { transform: isMobile ? "scale(1)" : `${currentTransform} scale(1)`, opacity: 1 },
            { transform: outTransform, opacity: 0 }
        ], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
        setTimeout(() => confirmWin.remove(), 300);
    };

    cancelBtn.onclick = () => { closeWin(); };
    okBtn.onclick = () => { closeWin(); setTimeout(onConfirm, 350); };
};

// BỔ SUNG LOGIC GIAO DIỆN HOVER "TECH-VIBE"
document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('button, select, .option-btn, .review-item, .segmented-control label');
    if (!target) return;
    if (target.classList.contains('tech-hover')) return;

    target.classList.add('tech-hover');

    if (target.classList.contains('option-btn') && !target.disabled) {
        target.style.color = '#fff';
        target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    }
});

document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('button, select, .option-btn, .review-item, .segmented-control label');
    if (!target) return;

    const related = e.relatedTarget;
    if (target?.contains(related)) return;

    target.classList.remove('tech-hover');

    target.style.backgroundColor = '';
    target.style.color = '';
    target.style.borderColor = '';
    target.style.boxShadow = '';
});
