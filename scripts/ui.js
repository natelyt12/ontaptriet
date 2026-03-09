// --- HÀM KHỞI TẠO MENU ---
function initMenu() {
    setTimeout(() => {
        document.querySelector(".wallpaper").style.opacity = "1";
    }, 500);
    setTimeout(() => {
        document.getElementById("app-window").classList.remove("closing");
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

    // Nếu bấm nhầm nút close thì không drag
    if (e.target.closest(".win-close-btn")) return;

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
            { transform: `${currentTransform} scale(0.8)`, opacity: 0 }
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
    const startTransform = isMobile ? "scale(0.8)" : "translate(-50%, -50%) scale(0.8)";
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
        <p style="color:#fff; text-align:center; font-size: 14px; line-height: 1.4; margin: 15px 0;">${message}</p>
        <div style="display:flex; justify-content:center; padding-bottom: 15px;">
            <button class="mac-btn-primary small alert-ok-btn" style="width: 100px;">OK</button>
        </div>
    `;

    const alertWin = createAppWindow("Thông báo", alertBody, 400, "auto");

    const okBtn = alertBody.querySelector(".alert-ok-btn");
    okBtn.onclick = () => {
        const currentTransform = window.getComputedStyle(alertWin).transform;
        const isMobile = window.innerWidth <= 720;
        const outTransform = isMobile ? "scale(0.8)" : `${currentTransform} scale(0.8)`;
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
        <p style="color:#fff; text-align:center; font-size: 14px; line-height: 1.4; margin: 15px 10px;">${message.replace(/\n/g, "<br>")}</p>
        <div style="display:flex; justify-content:center; gap: 12px; padding-bottom: 15px;">
            <button class="mac-btn-secondary small confirm-cancel-btn" style="width: 100px; color: #fff; background: rgba(255,255,255,0.1); border: none;">Hủy</button>
            <button class="mac-btn-primary small confirm-ok-btn mac-btn-danger" style="width: 100px;">Đồng ý</button>
        </div>
    `;

    const confirmWin = createAppWindow("Xác nhận", confirmBody, 400, "auto");

    const cancelBtn = confirmBody.querySelector(".confirm-cancel-btn");
    const okBtn = confirmBody.querySelector(".confirm-ok-btn");

    const closeWin = () => {
        const currentTransform = window.getComputedStyle(confirmWin).transform;
        const isMobile = window.innerWidth <= 720;
        const outTransform = isMobile ? "scale(0.8)" : `${currentTransform} scale(0.8)`;
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
