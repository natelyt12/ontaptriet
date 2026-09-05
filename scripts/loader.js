/**
 * Module: Loader ban đầu (scripts/loader.js)
 * Hiển thị màn hình ASCII Spinner luân phiên các kiểu cổ điển trong 2 giây
 */

const SPINNER_PRESETS = [
    {
        name: "classic",
        frames: ["|", "/", "-", "\\"],
        interval: 100
    },
    {
        name: "braille",
        frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
        interval: 80
    },
    {
        name: "pong",
        frames: ["[=    ]", "[==   ]", "[===  ]", "[ === ]", "[  ===]", "[   ==]", "[    =]", "[   ==]", "[  ===]", "[ === ]", "[===  ]", "[==   ]"],
        interval: 85
    },
    {
        name: "dots",
        frames: [".  ", ".. ", "...", "   "],
        interval: 220
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

    // Luân phiên kiểu spinner mỗi lần reload
    const STORAGE_KEY = "ontaptriet_last_spinner";
    let lastIdx = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    if (isNaN(lastIdx) || lastIdx < 0 || lastIdx >= SPINNER_PRESETS.length) {
        lastIdx = -1;
    }
    const currentIdx = (lastIdx + 1) % SPINNER_PRESETS.length;
    localStorage.setItem(STORAGE_KEY, currentIdx.toString());

    const preset = SPINNER_PRESETS[currentIdx];
    const frames = preset.frames;
    let frameIndex = 0;
    spinner.textContent = frames[0];

    const intervalId = setInterval(() => {
        frameIndex = (frameIndex + 1) % frames.length;
        spinner.textContent = frames[frameIndex];
    }, preset.interval);

    setTimeout(() => {
        clearInterval(intervalId);
        loader.classList.add("fade-out");
        setTimeout(() => {
            loader.style.display = "none";
        }, 260);
    }, 2000);
}

