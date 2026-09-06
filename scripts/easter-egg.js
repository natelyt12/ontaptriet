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
    const originalBrandHtml = brandTitleEl ? brandTitleEl.innerHTML : 'Ontaptriet <span class="brand-version">v2.1</span>';

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

    function applyChaosText() {
        const chaosText = generateMixedChaosString(30);

        // 1. Thẻ title của trang web
        document.title = chaosText;

        // 2. Tiêu đề header ở trên: [chuỗi 30 ký tự] v2.1
        const chaosBrandHtml = `${chaosText} <span class="brand-version">v2.1</span>`;
        if (typeof DEFAULT_BRAND_TITLE !== "undefined") {
            DEFAULT_BRAND_TITLE = chaosBrandHtml;
        }
        if (brandTitleEl && !brandTitleEl.textContent.includes("Cài đặt")) {
            brandTitleEl.innerHTML = chaosBrandHtml;
        }

        // 3. Dòng credit ở góc dưới cùng bên phải: [chuỗi 30 ký tự] design by @phucthanhh
        if (copyrightSpan) {
            copyrightSpan.textContent = `${chaosText} design by @phucthanhh`;
        } else if (copyrightEl) {
            copyrightEl.textContent = `${chaosText} design by @phucthanhh`;
        }
    }

    // Đổi title, brand header và credit ngay lập tức khi kích hoạt
    applyChaosText();

    // Cập nhật title, brand header và credit mỗi 5 giây (5000ms), tạm dừng khi ẩn tab để tối ưu hiệu năng
    const intervalId = setInterval(() => {
        if (!document.hidden) {
            applyChaosText();
        }
    }, 5000);

    return () => {
        clearInterval(intervalId);
        document.title = originalTitle;

        if (typeof DEFAULT_BRAND_TITLE !== "undefined") {
            DEFAULT_BRAND_TITLE = 'Ontaptriet <span class="brand-version">v2.1</span>';
        }
        if (brandTitleEl && !brandTitleEl.textContent.includes("Cài đặt")) {
            brandTitleEl.innerHTML = originalBrandHtml;
        }

        if (copyrightSpan) {
            copyrightSpan.textContent = originalCopyright;
        } else if (copyrightEl) {
            copyrightEl.textContent = originalCopyright;
        }
    };
}

// =========================================================================
// 3. EASTER EGG #3: Toàn bộ nội dung trang web bị xáo trộn liên tục
//    bằng ASCII standard & Latin mở rộng, giữ nguyên độ dài (Tỉ lệ 2%)
// =========================================================================
function initPageContentChaosEasterEgg() {
    const asciiLatinKeys = ['ascii', 'latin-ext'];
    const IGNORED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

    function getRandomAsciiLatinChar() {
        const key = asciiLatinKeys[Math.floor(Math.random() * asciiLatinKeys.length)];
        const range = UNICODE_RANGES[key];
        return getRandomUnicodeChar(range.min, range.max);
    }

    function scrambleText(text) {
        let out = "";
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
                out += ch;
            } else {
                out += getRandomAsciiLatinChar();
            }
        }
        return out;
    }

    function collectTextNodes(root) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (!node.parentElement) return NodeFilter.FILTER_REJECT;
                    if (IGNORED_TAGS.has(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
                    if (node.parentElement.classList && node.parentElement.classList.contains("easter-egg-dan-gay")) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        let n;
        while ((n = walker.nextNode())) {
            textNodes.push(n);
        }
        return textNodes;
    }

    function updateAllTextNodes() {
        const nodes = collectTextNodes(document.body);
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.__originalText === undefined) {
                node.__originalText = node.nodeValue;
            }
            node.nodeValue = scrambleText(node.__originalText);
        }
    }

    // Xáo trộn liên tục mỗi 50ms
    const intervalId = setInterval(updateAllTextNodes, 50);

    return () => {
        clearInterval(intervalId);
        // Khôi phục văn bản gốc khi tắt easter egg
        const nodes = collectTextNodes(document.body);
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].__originalText !== undefined) {
                nodes[i].nodeValue = nodes[i].__originalText;
                delete nodes[i].__originalText;
            }
        }
    };
}

// =========================================================================
// HỆ THỐNG REGISTRY QUẢN LÝ TẬP TRUNG TẤT CẢ EASTER EGGS
// =========================================================================
const EasterEggs = {
    registry: [
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
            description: "5% tỉ lệ: thẻ title, tiêu đề header ('[30 ký tự] v2.1') và dòng credit ('[30 ký tự] design by @phucthanhh') bị thay thế bằng chuỗi ký tự Mixed Ranges dài 30 ký tự, mỗi 5s đổi một lần",
            chance: 0.05,
            active: false,
            cleanup: null,
            init: initTitleMixedChaosEasterEgg
        },
        {
            id: "page_content_chaos",
            name: "Toàn trang hỗn loạn (ASCII & Latin mở rộng)",
            description: "2% tỉ lệ: tất cả nội dung trên trang web bị xáo trộn liên tục bằng ASCII standard và latin mở rộng, độ dài giữ nguyên",
            chance: 0.02,
            active: false,
            cleanup: null,
            init: initPageContentChaosEasterEgg
        }
    ],

    /**
     * Kích hoạt thủ công một easter egg bằng ID
     * Ví dụ trong Console: EasterEggs.activate("title_mixed_chaos") hoặc EasterEggs.activate("page_content_chaos")
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
     * Ví dụ trong Console: EasterEggs.stop("page_content_chaos")
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
     * Ví dụ trong Console: EasterEggs.toggle("page_content_chaos")
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
        this.registry.forEach(egg => {
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
