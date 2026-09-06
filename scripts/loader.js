/**
 * Module: Loader ban đầu (scripts/loader.js)
 * Hiển thị màn hình ASCII Spinner luân phiên các kiểu ngầu lòi trong 2 giây
 * Sử dụng phông chữ JetBrains Mono đơn cách đồng bộ
 */

// Hàm sinh ký tự Standard ASCII ngẫu nhiên (Dải loại 1 từ unicode_chaos_generator.html: 0x0021 - 0x007E)
function getRandomAsciiChar() {
    const codePoint = Math.floor(Math.random() * (0x007E - 0x0021 + 1)) + 0x0021;
    return String.fromCharCode(codePoint);
}

// 1. Cấu hình các preset khung hình ASCII
const SPINNER_PRESETS = [
    // --- BỘ 1: Decryptor / Chaos Text (Xáo trộn ASCII loại 1, giải mã dần thành ONTAPTRIET) ---
    {
        name: "decryptor",
        interval: 35,
        render: (elapsed, totalDuration) => {
            const target = "ONTAPTRIET";
            const revealDuration = 1400; // Giải mã xong sau 1.4s, 600ms cuối giữ nguyên chữ chuẩn
            const progress = Math.min(1, elapsed / revealDuration);
            const revealedCount = Math.min(target.length, Math.floor(progress * target.length));

            let res = "";
            for (let i = 0; i < target.length; i++) {
                if (i < revealedCount) {
                    res += target[i];
                } else {
                    res += getRandomAsciiChar();
                }
            }
            return res;
        }
    },

    // --- BỘ 2: Wave Scan (Quét sóng radar lướt qua lại giữa hai mút, không kèm %) ---
    {
        name: "wave-scan",
        interval: 65,
        frames: [
            "< ===-------- >",
            "< -===------- >",
            "< --===------ >",
            "< ---===----- >",
            "< ----===---- >",
            "< -----===--- >",
            "< ------===-- >",
            "< -------===- >",
            "< --------=== >",
            "< -------===- >",
            "< ------===-- >",
            "< -----===--- >",
            "< ----===---- >",
            "< ---===----- >",
            "< --===------ >",
            "< -===------- >"
        ]
    },

    // --- BỘ 3: Audio Spectrum Equalizer (Kim tự tháp lượn sóng qua lại nhịp nhàng) ---
    {
        name: "spectrum-pyramid",
        interval: 70,
        frames: (() => {
            const BARS = [" ", " ", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
            const colCount = 9;
            const peakSequence = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];

            return peakSequence.map(peak => {
                let frame = "";
                for (let i = 0; i < colCount; i++) {
                    const dist = Math.abs(i - peak);
                    const level = Math.max(0, 8 - dist * 2);
                    frame += BARS[level];
                }
                return frame;
            });
        })()
    },

    // --- Các kiểu cổ điển bổ sung ---
    {
        name: "braille",
        frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
        interval: 80
    },
    {
        name: "classic",
        frames: ["|", "/", "-", "\\"],
        interval: 100
    },
    {
        name: "pong",
        frames: ["[=    ]", "[==   ]", "[===  ]", "[ === ]", "[  ===]", "[   ==]", "[    =]", "[   ==]", "[  ===]", "[ === ]", "[===  ]", "[==   ]"],
        interval: 85
    },
    {
        name: "circle",
        frames: ["◐", "◓", "◑", "◒"],
        interval: 120
    },
    {
        name: "arrows",
        frames: ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"],
        interval: 90
    },
    {
        name: "box",
        frames: ["⌜", "⌝", "⌟", "⌞"],
        interval: 120
    }
];

/**
 * Màn hình Loading ban đầu trong 2 giây (mỗi lần reload là một kiểu loading mới)
 */
function startInitialLoader() {
    const loader = document.getElementById("page-loader");
    const spinner = document.getElementById("loader-spinner");
    if (!loader || !spinner) return;

    // Luân phiên kiểu spinner mỗi lần reload bằng thuật toán Cycle Shuffle
    // Hết một lượt thì đảo lại thứ tự mới, đảm bảo kiểu đầu lượt mới != kiểu cuối lượt cũ
    function getNextCycledSpinnerIndex() {
        const STORAGE_ORDER_KEY = "ontaptriet_spinner_order";
        const STORAGE_IDX_KEY = "ontaptriet_spinner_idx";
        const total = SPINNER_PRESETS.length;

        function shuffleArray(arr, lastItem = null) {
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

        let order = null;
        try {
            order = JSON.parse(localStorage.getItem(STORAGE_ORDER_KEY));
        } catch (e) { }

        let idx = parseInt(localStorage.getItem(STORAGE_IDX_KEY), 10);

        if (!Array.isArray(order) || order.length !== total || isNaN(idx)) {
            order = shuffleArray(Array.from({ length: total }, (_, i) => i), null);
            idx = 0;
        } else {
            idx++;
            if (idx >= order.length) {
                const lastItem = order[order.length - 1];
                order = shuffleArray(order, lastItem);
                idx = 0;
            }
        }

        localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(order));
        localStorage.setItem(STORAGE_IDX_KEY, idx.toString());

        return order[idx];
    }

    const currentIdx = getNextCycledSpinnerIndex();
    const preset = SPINNER_PRESETS[currentIdx];
    const totalDuration = 2000;
    const startTime = Date.now();
    let intervalId = null;

    if (typeof preset.render === "function") {
        spinner.textContent = preset.render(0, totalDuration);
        intervalId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            spinner.textContent = preset.render(elapsed, totalDuration);
        }, preset.interval || 35);
    } else if (Array.isArray(preset.frames)) {
        const frames = preset.frames;
        let frameIndex = 0;
        spinner.textContent = frames[0];
        intervalId = setInterval(() => {
            frameIndex = (frameIndex + 1) % frames.length;
            spinner.textContent = frames[frameIndex];
        }, preset.interval || 80);
    }

    setTimeout(() => {
        if (intervalId) clearInterval(intervalId);
        loader.classList.add("fade-out");
        setTimeout(() => {
            loader.style.display = "none";
        }, 260);
    }, totalDuration);
}
