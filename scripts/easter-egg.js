/**
 * Module: Quản lý Easter Eggs (scripts/easter-egg.js)
 * Trung tâm điều phối và lưu trữ tất cả các Easter Eggs của ứng dụng.
 * Cung cấp kiến trúc mở rộng (registry) giúp dễ dàng bổ sung thêm Easter Eggs mới trong tương lai.
 */

// =========================================================================
// CÁC TIỆN ÍCH DẢI MÃ UNICODE (Dựa trên unicode_chaos_generator.html)
// =========================================================================
const UNICODE_RANGES = {
    'ascii': { min: 0x0021, max: 0x007E, desc: "Standard ASCII" },
    'latin-ext': { min: 0x0100, max: 0x017F, desc: "Latin mở rộng" },
    'cyrillic': { min: 0x0370, max: 0x04FF, desc: "Cyrillic & Hy Lạp" },
    'arrows': { min: 0x2190, max: 0x25FF, desc: "Mũi tên & Hình học" },
    'math': { min: 0x2200, max: 0x22FF, desc: "Ký hiệu Toán học" },
    'blocks': { min: 0x2580, max: 0x259F, desc: "Khối hộp đồ họa" },
    'runes': { min: 0x16A0, max: 0x16F0, desc: "Chữ cổ Runic" },
    'chaos': { min: 0x00A0, max: 0x0FFF, desc: "Hỗn hợp diện rộng" }
};

// Sinh 1 ký tự ngẫu nhiên trong dải code point
function getRandomUnicodeChar(min, max) {
    const codePoint = Math.floor(Math.random() * (max - min + 1)) + min;
    return String.fromCodePoint(codePoint);
}

// =========================================================================
// 1. EASTER EGG #1: "Dân gay" phóng to khi click chuột (Tỉ lệ 10%)
// =========================================================================
function initDanGayClickEasterEgg() {
    function spawnDanGayPopup(x, y) {
        const popup = document.createElement("div");
        popup.className = "easter-egg-dan-gay";
        popup.textContent = "dân gay";

        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;

        document.body.appendChild(popup);

        // Tự hủy sau khi hiệu ứng 1.5s hoàn tất
        popup.addEventListener("animationend", () => {
            popup.remove();
        });

        // Fallback tự hủy phòng khi animationend bị trình duyệt chặn
        setTimeout(() => {
            if (popup.parentElement) {
                popup.remove();
            }
        }, 1600);
    }

    const clickHandler = (e) => {
        const x = e.clientX ?? (e.pageX - window.scrollX);
        const y = e.clientY ?? (e.pageY - window.scrollY);
        spawnDanGayPopup(x, y);
    };

    document.addEventListener("click", clickHandler, true);

    return () => {
        document.removeEventListener("click", clickHandler, true);
    };
}

// =========================================================================
// 2. EASTER EGG #2: Thẻ Title, Header Brand & Credit bị xáo trộn Mixed Ranges 30 ký tự (Tỉ lệ 5%)
// =========================================================================
function initTitleMixedChaosEasterEgg() {
    const originalTitle = document.title;
    const copyrightEl = document.getElementById("site-copyright");
    const copyrightSpan = copyrightEl ? copyrightEl.querySelector("span") : null;
    const originalCopyright = copyrightSpan ? copyrightSpan.textContent : (copyrightEl ? copyrightEl.textContent : "");

    const brandTitleEl = document.getElementById("brand-title-content");
    const currentVer = typeof getAppVersion === "function" ? getAppVersion() : "v2.2";
    const originalBrandHtml = brandTitleEl ? brandTitleEl.innerHTML : `Ontaptriet <span class="brand-version">${currentVer}</span>`;

    const mixedKeys = Object.keys(UNICODE_RANGES);

    function generateMixedChaosString(length = 30) {
        let res = "";
        for (let i = 0; i < length; i++) {
            const randomKey = mixedKeys[Math.floor(Math.random() * mixedKeys.length)];
            const range = UNICODE_RANGES[randomKey];
            res += getRandomUnicodeChar(range.min, range.max);
        }
        return res;
    }

    // Kiểm tra xem Easter egg mới (title_ascii_cycler) có đang chạy hay không
    function isTitleCyclerActive() {
        if (typeof EasterEggs === "undefined" || !EasterEggs.registry) return false;
        const cycler = EasterEggs.registry.find(e => e.id === "title_ascii_cycler");
        return !!(cycler && cycler.active);
    }

    function applyChaosText() {
        const chaosText = generateMixedChaosString(30);

        // 1. Thẻ title của trang web
        document.title = chaosText;

        // 2. Tiêu đề header ở trên: Ưu tiên Easter Egg mới (title_ascii_cycler)
        // Chỉ ghi đè tiêu đề header nếu Easter Egg mới không chạy
        if (!isTitleCyclerActive()) {
            const chaosBrandHtml = `${chaosText} <span class="brand-version">${currentVer}</span>`;
            if (typeof DEFAULT_BRAND_TITLE !== "undefined") {
                DEFAULT_BRAND_TITLE = chaosBrandHtml;
            }
            if (brandTitleEl && !brandTitleEl.textContent.includes("Cài đặt")) {
                brandTitleEl.innerHTML = chaosBrandHtml;
            }
        }

        // 3. Dòng credit ở góc dưới cùng bên phải: [chuỗi 30 ký tự] design by @phucthanhh
        if (copyrightSpan) {
            copyrightSpan.textContent = `${chaosText} design by @phucthanhh`;
        } else if (copyrightEl) {
            copyrightEl.textContent = `${chaosText} design by @phucthanhh`;
        }
    }

    // Đổi title, brand header và credit ngay lập tức khi kích hoạt (chỉ đổi 1 lần, không lặp lại 5s)
    applyChaosText();

    return () => {
        document.title = originalTitle;

        if (!isTitleCyclerActive()) {
            if (typeof DEFAULT_BRAND_TITLE !== "undefined") {
                DEFAULT_BRAND_TITLE = `Ontaptriet <span class="brand-version">${currentVer}</span>`;
            }
            if (brandTitleEl && !brandTitleEl.textContent.includes("Cài đặt")) {
                brandTitleEl.innerHTML = originalBrandHtml;
            }
        }

        if (copyrightSpan) {
            copyrightSpan.textContent = originalCopyright;
        } else if (copyrightEl) {
            copyrightEl.textContent = originalCopyright;
        }
    };
}

// =========================================================================
// 3. EASTER EGG #3: Title ASCII Animation Cycler (Tỉ lệ 50%)
// Chuyển đổi tiêu đề thành animation xáo trộn Standard ASCII font JetBrains Mono
// Chu kỳ: Giữ 3s -> Co/giãn độ dài về từ mới -> Quét reveal LTR -> Giữ 3s
// =========================================================================
function initTitleAsciiCyclerEasterEgg() {
    const brandTitleEl = document.getElementById("brand-title-content");
    if (!brandTitleEl) return;

    const originalBrandHtml = brandTitleEl.innerHTML;
    const originalFontFamily = brandTitleEl.style.fontFamily;
    const originalLetterSpacing = brandTitleEl.style.letterSpacing;
    const originalFontWeight = brandTitleEl.style.fontWeight;

    // Thiết lập giao diện JetBrains Mono cho Title animation
    brandTitleEl.style.fontFamily = "'JetBrains Mono', monospace";
    brandTitleEl.style.letterSpacing = "0.5px";
    brandTitleEl.style.fontWeight = "500";
    brandTitleEl.style.whiteSpace = "nowrap";

    let isRunning = true;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Fisher-Yates shuffle có chống lặp kề
    function shuffleNoAdjacent(arr, lastItem = null) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        if (lastItem !== null && copy.length > 1 && copy[0] === lastItem) {
            const swapIdx = Math.floor(Math.random() * (copy.length - 1)) + 1;
            [copy[0], copy[swapIdx]] = [copy[swapIdx], copy[0]];
        }
        return copy;
    }

    const ALL_WORDS = [
        "ONTAPTRIET",
        "DAN_GAY",
        "BINH_GAY",
        "BINH_DZ_TOP_1_SERVER",
        "nro",
        "I_Hate_Blue_Archive",
        "DESIGNED_BY_NATELYT",
        "JOIN_OUR_DISCORD",
        "WELCOME",
        "github.com/natelyt12",
        "SYSTEM_INITIALIZED",
        "Check my Yumebako",
        "github.com/natelyt12/Yumebako",
        "NEVER_GONNA_GIVE_YOU_UP"
    ];

    // Lượt 1: Bắt đầu từ ONTAPTRIET, các từ tiếp theo được xáo trộn ngẫu nhiên
    let wordQueue = shuffleNoAdjacent(ALL_WORDS.filter(w => w !== "ONTAPTRIET"), "ONTAPTRIET");
    let queueIdx = 0;

    function getNextTargetWord() {
        if (queueIdx >= wordQueue.length) {
            const lastWord = wordQueue[wordQueue.length - 1];
            wordQueue = shuffleNoAdjacent(ALL_WORDS, lastWord);
            queueIdx = 0;
        }
        const w = wordQueue[queueIdx];
        queueIdx++;
        return w;
    }

    // Chuyển đổi từ fromWord sang toWord:
    // 1. Ký tự lỗi quét qua, co/giãn dần về độ dài ký tự mục tiêu
    // 2. Sau đó mới reveal từ trái qua phải (LTR)
    async function animateTransition(fromWord, toWord) {
        if (!isRunning) return;

        const lenA = fromWord.length;
        const lenB = toWord.length;

        // Giai đoạn 1: Ký tự lỗi co/giãn dần về độ dài của toWord
        if (lenA !== lenB) {
            const stepDir = lenB > lenA ? 1 : -1;
            const diff = Math.abs(lenB - lenA);
            const stepDelay = Math.max(35, Math.min(75, Math.floor(450 / diff)));

            let curLen = lenA;
            while (curLen !== lenB) {
                if (!isRunning) return;
                curLen += stepDir;
                let chaos = "";
                for (let i = 0; i < curLen; i++) {
                    chaos += getRandomUnicodeChar(0x0021, 0x007E);
                }
                brandTitleEl.textContent = chaos;
                await sleep(stepDelay);
            }
        } else {
            // Nếu độ dài bằng nhau, nhấp nháy 3 nhịp chaos
            for (let k = 0; k < 3; k++) {
                if (!isRunning) return;
                let chaos = "";
                for (let i = 0; i < lenB; i++) {
                    chaos += getRandomUnicodeChar(0x0021, 0x007E);
                }
                brandTitleEl.textContent = chaos;
                await sleep(50);
            }
        }

        // Giai đoạn 2: Reveal từ trái qua phải (LTR)
        const revealDelay = Math.max(35, Math.min(65, Math.floor(550 / lenB)));
        for (let step = 0; step <= lenB; step++) {
            if (!isRunning) return;
            let str = "";
            for (let i = 0; i < lenB; i++) {
                if (i < step) {
                    str += toWord[i];
                } else {
                    str += getRandomUnicodeChar(0x0021, 0x007E);
                }
            }
            brandTitleEl.textContent = str;
            await sleep(revealDelay);
        }

        if (!isRunning) return;
        brandTitleEl.textContent = toWord;
    }

    // Bắt đầu vòng lặp
    async function runLoop() {
        let currentWord = "ONTAPTRIET";
        brandTitleEl.textContent = currentWord;

        while (isRunning) {
            // Giữ chữ trong 3 giây (3000ms)
            await sleep(3000);
            if (!isRunning) break;

            // Nếu đang trong màn hình khác (fade-out) thì tạm hoãn nhẹ
            const brandHeader = document.getElementById("brand-header");
            if (brandHeader && brandHeader.classList.contains("fade-out")) {
                await sleep(1000);
                continue;
            }

            const nextWord = getNextTargetWord();
            await animateTransition(currentWord, nextWord);
            currentWord = nextWord;
        }
    }

    runLoop();

    return () => {
        isRunning = false;
        if (brandTitleEl) {
            brandTitleEl.innerHTML = originalBrandHtml;
            brandTitleEl.style.fontFamily = originalFontFamily;
            brandTitleEl.style.letterSpacing = originalLetterSpacing;
            brandTitleEl.style.fontWeight = originalFontWeight;
        }
    };
}

// =========================================================================
// HỆ THỐNG REGISTRY QUẢN LÝ TẬP TRUNG TẤT CẢ EASTER EGGS
// =========================================================================
const EasterEggs = {
    registry: [
        {
            id: "title_ascii_cycler",
            name: "Title ASCII Animation Cycler",
            description: "50% tỉ lệ: Title biến thành animation xáo trộn JetBrains Mono chuyển đổi liên tục qua các thông điệp",
            chance: 0.50,
            active: false,
            cleanup: null,
            init: initTitleAsciiCyclerEasterEgg
        },
        {
            id: "dan_gay_click",
            name: "Dân gay on click",
            description: "10% tỉ lệ: mỗi click của user sẽ có một chữ 'dân gay' phóng to lên rồi biến mất trong 1.5s",
            chance: 0.10,
            active: false,
            cleanup: null,
            init: initDanGayClickEasterEgg
        },
        {
            id: "title_mixed_chaos",
            name: "Title, Brand & Credit Glitch (Mixed Ranges)",
            description: "5% tỉ lệ: thẻ title, tiêu đề header ('[30 ký tự] v2.2') và dòng credit ('[30 ký tự] design by @phucthanhh') bị thay thế bằng chuỗi ký tự Mixed Ranges dài 30 ký tự",
            chance: 0.05,
            active: false,
            cleanup: null,
            init: initTitleMixedChaosEasterEgg
        }
    ],

    /**
     * Kích hoạt thủ công một easter egg bằng ID
     * Ví dụ trong Console: EasterEggs.activate("title_ascii_cycler") hoặc EasterEggs.activate("title_mixed_chaos")
     */
    activate(id) {
        const egg = this.registry.find(e => e.id === id);
        if (egg) {
            if (!egg.active) {
                egg.active = true;
                egg.cleanup = typeof egg.init === "function" ? egg.init() : null;
                console.log(`[EasterEgg] Đã kích hoạt: ${egg.name}`);
            } else {
                console.log(`[EasterEgg] "${egg.name}" đang hoạt động!`);
            }
        } else {
            console.warn(`[EasterEgg] Không tìm thấy easter egg với id: ${id}`);
        }
    },

    /**
     * Dừng thủ công một easter egg bằng ID
     * Ví dụ trong Console: EasterEggs.stop("title_ascii_cycler")
     */
    stop(id) {
        const egg = this.registry.find(e => e.id === id);
        if (egg && egg.active) {
            if (typeof egg.cleanup === "function") {
                egg.cleanup();
                egg.cleanup = null;
            }
            egg.active = false;
            console.log(`[EasterEgg] Đã dừng: ${egg.name}`);
        }
    },

    /**
     * Bật / tắt chuyển đổi trạng thái một easter egg
     * Ví dụ trong Console: EasterEggs.toggle("title_ascii_cycler")
     */
    toggle(id) {
        const egg = this.registry.find(e => e.id === id);
        if (egg) {
            if (egg.active) {
                this.stop(id);
            } else {
                this.activate(id);
            }
        }
    },

    /**
     * Khởi tạo toàn bộ Easter Eggs theo tỉ lệ xác suất khi web load
     */
    initAll() {
        const asciiCycler = this.registry.find(e => e.id === "title_ascii_cycler");
        let isAsciiCyclerActive = false;
        if (asciiCycler && Math.random() < asciiCycler.chance) {
            asciiCycler.active = true;
            asciiCycler.cleanup = asciiCycler.init();
            isAsciiCyclerActive = true;
            console.log(`[EasterEgg] Kích hoạt ngẫu nhiên: "${asciiCycler.name}" (50%)`);
        }

        this.registry.forEach(egg => {
            if (egg.id === "title_ascii_cycler") return;

            if (typeof egg.chance === "number") {
                const roll = Math.random();
                if (roll < egg.chance) {
                    egg.active = true;
                    egg.cleanup = typeof egg.init === "function" ? egg.init() : null;
                    console.log(`[EasterEgg] Kích hoạt ngẫu nhiên: "${egg.name}" (Tỉ lệ ${(egg.chance * 100).toFixed(0)}%)`);
                }
            } else if (typeof egg.init === "function") {
                egg.cleanup = egg.init();
            }
        });
    }
};

// Expose ra window để hỗ trợ debug/test từ DevTools Console
window.EasterEggs = EasterEggs;

/**
 * Hàm khởi chạy gọi từ main.js
 */
function initEasterEggs() {
    EasterEggs.initAll();
}
