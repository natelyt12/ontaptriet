/**
 * Module: Quản lý Giao diện & Phông chữ (scripts/theme.js)
 * Chịu trách nhiệm:
 * - Chuyển đổi Theme Sáng / Tối (Light / Dark) và lưu LocalStorage
 * - Thay đổi Phông chữ toàn trang và lưu LocalStorage
 */

// 1. Quản lý Theme (Sáng / Tối)
const THEME_STORAGE_KEY = "ontaptriet_theme";
let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";

function applyTheme(theme, animate = false, save = true) {
    currentTheme = theme;
    if (save) {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }

    const viewportEl = document.getElementById("theme-label-viewport");
    const targetText = theme === "dark" ? "Tối" : "Giấy A4";

    if (viewportEl) {
        if (animate && typeof animateLabelRoll === "function") {
            animateLabelRoll(viewportEl, targetText);
        } else {
            viewportEl.innerHTML = `<span class="label-text-current">${targetText}</span>`;
        }
    }

    if (typeof syncWallpaperWithTheme === "function") {
        syncWallpaperWithTheme(theme);
    }
}

function toggleTheme() {
    if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true, true);
}

// 2. Quản lý Phông chữ (Font Options)
const FONT_STORAGE_KEY = "ontaptriet_font";

const FONT_OPTIONS = [
    { id: "times", name: "Times New Roman", family: '"Times New Roman", Times, "Nimbus Roman No9 L", serif' },
    { id: "lora", name: "Lora", family: '"Lora", Georgia, serif' },
    { id: "merriweather", name: "Merriweather", family: '"Merriweather", Georgia, serif' },
    { id: "ebgaramond", name: "EB Garamond", family: '"EB Garamond", Garamond, Georgia, serif' },
    { id: "literata", name: "Literata", family: '"Literata", Georgia, serif' },
    { id: "opensans", name: "Open Sans", family: '"Open Sans", system-ui, -apple-system, sans-serif' },
    { id: "crimson", name: "Crimson Pro", family: '"Crimson Pro", "Crimson Text", Garamond, Georgia, serif' },
];

let fontDropdown = null;

function applyFont(fontId, save = true) {
    if (fontId === "spacegrotesk" || fontId === "playfair" || fontId === "lexend") fontId = "opensans";
    let fontConfig = FONT_OPTIONS.find(f => f.id === fontId);
    if (!fontConfig) {
        fontConfig = FONT_OPTIONS[0];
    }
    document.documentElement.style.setProperty("--font-serif", fontConfig.family);
    if (save) {
        localStorage.setItem(FONT_STORAGE_KEY, fontConfig.id);
    }
    return fontConfig;
}

function initFontDropdown() {
    const savedFontId = localStorage.getItem(FONT_STORAGE_KEY) || "times";
    const currentFont = applyFont(savedFontId, false);

    fontDropdown = new InlineDropdown({
        containerId: "dropdown-font",
        initialText: currentFont.name,
        getItems: () => {
            const cur = localStorage.getItem(FONT_STORAGE_KEY) || "times";
            return FONT_OPTIONS.map(font => ({
                id: font.id,
                name: font.name,
                fontFamily: font.family,
                active: font.id === cur
            }));
        },
        onSelect: (itemData) => {
            applyFont(itemData.id, true);
        }
    });
}

