/**
 * Module: Sảnh Chat Realtime với Firebase (scripts/chat.js)
 * Tính năng chính:
 * 1. Đăng nhập Google xác thực nghiêm ngặt đuôi @eaut.edu.vn
 * 2. Khởi tạo biệt danh sinh viên lần đầu, cho phép đổi lại mỗi 24 giờ
 * 3. Đồng bộ Realtime Cloud Firestore, lưu trữ và hiển thị tối đa 20 tin nhắn mới nhất
 * 4. Cooldown 5 phút (300s) giữa mỗi lần gửi tin nhắn
 * 5. Tuân thủ 100% Design System: Font người dùng chọn, chữ đen trên giấy A4, không viền hộp nổi
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    getDocs,
    deleteDoc,
    writeBatch,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1. Cấu hình Firebase dự án
const firebaseConfig = {
    apiKey: "AIzaSyDdiH09CLO29a_VxorSamX54B36_pbiIcc",
    authDomain: "ontaptriet-9ffd9.firebaseapp.com",
    projectId: "ontaptriet-9ffd9",
    storageBucket: "ontaptriet-9ffd9.firebasestorage.app",
    messagingSenderId: "985351409842",
    appId: "1:985351409842:web:fa8305abccd623e2cef9ab"
};

// Khởi tạo Firebase App & Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Provider Google với gợi ý tên miền eaut.edu.vn
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    hd: "eaut.edu.vn",
    prompt: "select_account"
});

// Các hằng số quản lý
const COOLDOWN_SECONDS = 60; // 1 phút = 60 giây
const NICKNAME_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 giờ = 86.400.000 ms
const MAX_MESSAGES_LIMIT = 50; // Giới hạn tối đa 50 tin nhắn trong sảnh
const GOD_MODE_EMAIL = "25002894@eaut.edu.vn";
const PRESENCE_COLLECTION = "presence";
const HEARTBEAT_INTERVAL_MS = 25000; // 25 giây gửi heartbeat 1 lần
const PRESENCE_TIMEOUT_MS = 60000;   // 60 giây không có heartbeat coi như offline

// Trạng thái cục bộ
let currentUser = null;
let currentProfile = null;
let cooldownTimer = null;
let cooldownRemaining = 0;
let unsubscribeMessages = null;
let unsubscribeUserProfile = null;
let mySessionId = null;
let heartbeatTimer = null;
let unsubscribePresence = null;

/**
 * Kiểm tra xem người dùng hiện tại có đang kích hoạt chế độ Bỏ qua Cooldown (Bypass / God Mode) không
 */
function isGodModeActive() {
    if (!currentUser) return false;
    return Boolean(currentProfile && (currentProfile.godMode === true || currentProfile.bypassCooldown === true));
}

/**
 * Lấy khóa lưu trữ cooldown theo UID
 */
function getCooldownStorageKey(uid) {
    return `ontaptriet_chat_cooldown_${uid || "guest"}`;
}

/**
 * Định dạng thời gian hiển thị [hh:mm - dd/mm/yy]
 */
function formatTime(timestamp) {
    const d = (!timestamp)
        ? new Date()
        : (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));

    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);

    return `${hh}:${mm} - ${dd}/${MM}/${yy}`;
}

/**
 * Cập nhật giao diện thanh tài khoản người dùng và khung nhập
 */
function updateAuthUI() {
    const userBar = document.getElementById("chat-user-bar");
    const userDisplay = document.getElementById("chat-user-display");
    const setNameBtn = document.getElementById("btn-chat-set-name");
    const loginPrompt = document.getElementById("chat-login-prompt-wrapper");
    const inputControls = document.getElementById("chat-input-controls");
    const bannedAlert = document.getElementById("chat-banned-alert");
    const infoGroup = document.getElementById("chat-user-info-group");
    const isBanned = Boolean(currentProfile && currentProfile.bannedChat === true);

    if (currentUser && currentProfile) {
        if (userBar) userBar.style.display = "flex";
        if (loginPrompt) loginPrompt.style.display = "none";

        if (isBanned) {
            if (inputControls) inputControls.style.display = "none";
            if (bannedAlert) bannedAlert.style.display = "block";
            if (infoGroup) infoGroup.style.display = "none";
        } else {
            if (inputControls) inputControls.style.display = "block";
            if (bannedAlert) bannedAlert.style.display = "none";
            if (infoGroup) infoGroup.style.display = "inline-flex";
        }

        if (userDisplay) {
            const nick = currentProfile.nickname || currentUser.displayName || currentUser.email;
            userDisplay.textContent = nick;
        }
    } else {
        if (userBar) userBar.style.display = "none";
        if (loginPrompt) loginPrompt.style.display = "block";
        if (inputControls) inputControls.style.display = "none";
        if (bannedAlert) bannedAlert.style.display = "none";
        if (typeof resetLogoutBtnState === "function") {
            resetLogoutBtnState();
        }
    }
}

/**
 * Quản lý bộ đếm Cooldown 5 phút giữa các lần gửi tin
 */
function updateSendButtonUI() {
    const sendBtn = document.getElementById("chat-send-btn");
    const label = document.getElementById("chat-send-label");
    const arrow = document.getElementById("chat-send-arrow");
    if (!sendBtn || !label) return;

    if (cooldownRemaining > 0) {
        const m = Math.floor(cooldownRemaining / 60);
        const s = cooldownRemaining % 60;
        const timeStr = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        sendBtn.classList.add("btn-disabled");
        label.textContent = `Gửi tin nhắn (${timeStr})`;
        if (arrow) arrow.style.display = "none";
    } else {
        sendBtn.classList.remove("btn-disabled");
        label.textContent = "Gửi tin nhắn";
        if (arrow) arrow.style.display = "inline-block";
    }
}

function startCooldown(seconds) {
    if (seconds <= 0) {
        cooldownRemaining = 0;
        updateSendButtonUI();
        return;
    }

    const expireAt = Date.now() + seconds * 1000;
    const storageKey = getCooldownStorageKey(currentUser ? currentUser.uid : null);
    localStorage.setItem(storageKey, expireAt.toString());

    clearInterval(cooldownTimer);

    function tick() {
        const remaining = Math.max(0, Math.ceil((expireAt - Date.now()) / 1000));
        cooldownRemaining = remaining;
        if (cooldownRemaining <= 0) {
            clearInterval(cooldownTimer);
            cooldownRemaining = 0;
            localStorage.removeItem(storageKey);
        }
        updateSendButtonUI();
    }

    tick();
    cooldownTimer = setInterval(tick, 1000);
}

function checkCooldown() {
    if (isGodModeActive()) {
        clearInterval(cooldownTimer);
        cooldownRemaining = 0;
        updateSendButtonUI();
        return;
    }

    const storageKey = getCooldownStorageKey(currentUser ? currentUser.uid : null);
    try {
        const expireAt = parseInt(localStorage.getItem(storageKey), 10);
        if (expireAt && !isNaN(expireAt)) {
            const diff = Math.ceil((expireAt - Date.now()) / 1000);
            if (diff > 0) {
                startCooldown(diff);
                return;
            }
        }
    } catch (e) { }
    localStorage.removeItem(storageKey);
    cooldownRemaining = 0;
    updateSendButtonUI();
}

/**
 * Xử lý tải và cập nhật hồ sơ người dùng trong Firestore
 */
async function loadOrCreateUserProfile(user) {
    const userRef = doc(db, "users", user.uid);

    // Hủy listener cũ nếu có
    if (typeof unsubscribeUserProfile === "function") {
        unsubscribeUserProfile();
        unsubscribeUserProfile = null;
    }

    // Lắng nghe hồ sơ người dùng realtime (nhận tín hiệu bật/tắt God Mode từ CLI tức thì)
    unsubscribeUserProfile = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            currentProfile = docSnap.data();
            updateAuthUI();
            if (isGodModeActive()) {
                clearInterval(cooldownTimer);
                cooldownRemaining = 0;
                updateSendButtonUI();
            }
        }
    });

    try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            currentProfile = snap.data();

            // Đồng bộ cooldown chính xác từ thời điểm gửi tin gần nhất trên Firestore (nếu không bật God Mode)
            if (!isGodModeActive() && currentProfile.lastMessageAt) {
                const lastMsgTime = currentProfile.lastMessageAt.toDate
                    ? currentProfile.lastMessageAt.toDate().getTime()
                    : (currentProfile.lastMessageAt.toMillis ? currentProfile.lastMessageAt.toMillis() : new Date(currentProfile.lastMessageAt).getTime());
                const elapsedSec = Math.floor((Date.now() - lastMsgTime) / 1000);
                if (elapsedSec < COOLDOWN_SECONDS) {
                    startCooldown(COOLDOWN_SECONDS - elapsedSec);
                }
            }
        } else {
            // Lần đầu đăng nhập: gợi ý biệt danh từ email hoặc tên Google
            let defaultName = (user.displayName || user.email.split("@")[0]).trim().slice(0, 24);
            const inputName = window.prompt(
                "Chào mừng bạn đến với Sảnh Ôn Tập EAUT!\nHãy đặt biệt danh hiển thị của bạn (cho phép đổi lại sau mỗi 24 giờ):",
                defaultName
            );

            const finalNick = (inputName && inputName.trim().length > 0)
                ? inputName.trim().slice(0, 24)
                : defaultName;

            const newProfile = {
                email: user.email,
                displayName: user.displayName || "",
                nickname: finalNick,
                createdAt: serverTimestamp(),
                nicknameUpdatedAt: serverTimestamp()
            };

            await setDoc(userRef, newProfile);
            currentProfile = {
                ...newProfile,
                nicknameUpdatedAt: new Date()
            };
        }
    } catch (err) {
        console.error("Lỗi tải thông tin người dùng:", err);
        currentProfile = {
            email: user.email,
            nickname: user.displayName || user.email.split("@")[0],
            nicknameUpdatedAt: new Date()
        };
    }

    updateAuthUI();
}

let nicknameRollTimer = null;

/**
 * Hiệu ứng cuộn chữ mượt mà cho nhãn nút Thay tên (giống nút Copy trong Quiz-view)
 */
function showNicknameRoll(text, duration = 2400) {
    const viewport = document.getElementById("chat-set-name-viewport");
    if (!viewport) return;

    clearTimeout(nicknameRollTimer);
    if (typeof animateLabelRoll === "function") {
        animateLabelRoll(viewport, text);
    } else {
        viewport.innerHTML = `<span class="label-text-current">${text}</span>`;
    }

    nicknameRollTimer = setTimeout(() => {
        if (typeof animateLabelRoll === "function") {
            animateLabelRoll(viewport, "Thay tên");
        } else {
            viewport.innerHTML = `<span class="label-text-current">Thay tên</span>`;
        }
    }, duration);
}

/**
 * Xử lý đổi biệt danh (Giới hạn 1 lần mỗi 24 giờ)
 */
async function handleChangeNickname() {
    if (!currentUser || !currentProfile) return;

    if (currentProfile && currentProfile.bannedChat === true) {
        alert("Tài khoản của bạn đang bị cấm chat, không thể đổi biệt danh.");
        return;
    }

    // Nếu không bật God Mode thì kiểm tra giới hạn 24 giờ
    if (!isGodModeActive() && currentProfile.nicknameUpdatedAt) {
        const lastUpdated = currentProfile.nicknameUpdatedAt.toDate
            ? currentProfile.nicknameUpdatedAt.toDate().getTime()
            : new Date(currentProfile.nicknameUpdatedAt).getTime();

        const elapsed = Date.now() - lastUpdated;
        if (elapsed < NICKNAME_COOLDOWN_MS) {
            const remainingMs = NICKNAME_COOLDOWN_MS - elapsed;
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            let waitText = "";
            if (hours > 0) {
                waitText = mins > 0 ? `Chờ ${hours}h${mins}p` : `Chờ ${hours}h`;
            } else {
                waitText = mins > 0 ? `Chờ ${mins}p` : `Chờ < 1p`;
            }

            showNicknameRoll(waitText, 2500);
            return;
        }
    }

    const inputName = window.prompt("Nhập biệt danh mới của bạn (tối đa 24 ký tự):", currentProfile.nickname);
    if (!inputName || !inputName.trim()) return;

    const newNick = inputName.trim().slice(0, 24);
    if (newNick === currentProfile.nickname) return;

    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            nickname: newNick,
            nicknameUpdatedAt: serverTimestamp()
        });

        currentProfile.nickname = newNick;
        currentProfile.nicknameUpdatedAt = new Date();
        updateAuthUI();

        // Cập nhật lại giao diện tin nhắn ngay lập tức trên máy hiện tại
        if (Array.isArray(lastRenderedMessages) && lastRenderedMessages.length > 0) {
            renderMessages(lastRenderedMessages);
        }

        showNicknameRoll("Đã đổi!", 2200);

        // Đồng bộ cập nhật trường author trong tất cả tin nhắn cũ của người này trên Firestore
        try {
            const qUserMsgs = query(collection(db, "messages"), where("uid", "==", currentUser.uid));
            const userMsgsSnap = await getDocs(qUserMsgs);
            if (!userMsgsSnap.empty) {
                const batch = writeBatch(db);
                userMsgsSnap.forEach(d => {
                    batch.update(d.ref, { author: newNick });
                });
                await batch.commit();
            }
        } catch (syncErr) {
            console.warn("Không thể batch update tin nhắn cũ trên Firestore:", syncErr);
        }
    } catch (err) {
        console.error("Lỗi cập nhật biệt danh:", err);
        alert("Không thể cập nhật biệt danh lúc này. Vui lòng thử lại sau.");
    }
}

/**
 * Đăng nhập qua Google (bắt buộc @eaut.edu.vn)
 */
async function handleLogin() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        if (!user.email || !user.email.toLowerCase().endsWith("@eaut.edu.vn")) {
            await signOut(auth);
            alert("Đăng nhập thất bại: Sảnh ôn tập chỉ chấp nhận tài khoản Google do trường cấp (đuôi @eaut.edu.vn)!");
            return;
        }
    } catch (err) {
        if (err.code === "auth/popup-closed-by-user") return;
        console.error("Lỗi đăng nhập Google:", err);
        alert("Không thể đăng nhập Google: " + (err.message || err.code));
    }
}

let isLogoutConfirming = false;
let logoutResetTimer = null;

function resetLogoutBtnState() {
    isLogoutConfirming = false;
    clearTimeout(logoutResetTimer);
    const logoutBtn = document.getElementById("btn-chat-logout");
    const viewport = document.getElementById("chat-logout-viewport");
    if (logoutBtn) logoutBtn.classList.remove("confirming");
    if (viewport) {
        const currentSpan = viewport.querySelector(".label-text-current");
        const currentText = currentSpan ? currentSpan.textContent.trim() : viewport.textContent.trim();
        if (currentText !== "Đăng xuất") {
            if (typeof animateLabelRoll === "function") {
                animateLabelRoll(viewport, "Đăng xuất");
            } else {
                viewport.innerHTML = `<span class="label-text-current">Đăng xuất</span>`;
            }
        }
    }
}

/**
 * Đăng xuất với xác nhận 2 bước dạng cuộn chữ mượt mà (không dùng popup browser)
 */
async function handleLogout() {
    const logoutBtn = document.getElementById("btn-chat-logout");
    const viewport = document.getElementById("chat-logout-viewport");

    if (!isLogoutConfirming) {
        isLogoutConfirming = true;
        if (logoutBtn) logoutBtn.classList.add("confirming");
        if (viewport) {
            if (typeof animateLabelRoll === "function") {
                animateLabelRoll(viewport, "Xác nhận");
            } else {
                viewport.innerHTML = `<span class="label-text-current">Xác nhận</span>`;
            }
        }

        clearTimeout(logoutResetTimer);
        logoutResetTimer = setTimeout(resetLogoutBtnState, 3500);
    } else {
        resetLogoutBtnState();
        try {
            await signOut(auth);
        } catch (e) {
            console.error("Lỗi đăng xuất:", e);
        }
    }
}

/**
 * Render danh sách tin nhắn nhận được từ Firestore
 */
let lastRenderedMessages = [];

function renderMessages(messagesList) {
    lastRenderedMessages = messagesList || [];
    const container = document.getElementById("chat-messages-list");
    if (!container) return;

    container.innerHTML = "";

    if (!messagesList || messagesList.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "chat-msg-item";
        emptyDiv.style.fontStyle = "italic";
        emptyDiv.style.opacity = "0.5";
        emptyDiv.textContent = "Sảnh chưa có tin nhắn nào. Hãy là người đầu tiên gửi tin nhắn!";
        container.appendChild(emptyDiv);
        return;
    }

    messagesList.forEach(msg => {
        const item = document.createElement("div");
        item.className = "chat-msg-item";

        const isSelf = currentUser && (msg.uid === currentUser.uid);
        if (isSelf) {
            item.classList.add("chat-msg-self");
        }

        const authorName = (isSelf && currentProfile && currentProfile.nickname)
            ? currentProfile.nickname
            : (msg.author || "Sinh viên");

        const meta = document.createElement("div");
        meta.className = "chat-msg-meta";

        const timeSpan = document.createElement("span");
        timeSpan.className = "chat-msg-time";
        timeSpan.textContent = `[${formatTime(msg.createdAt)}]`;

        const authorSpan = document.createElement("span");
        authorSpan.className = "chat-msg-author";
        authorSpan.textContent = `${authorName}:`;

        meta.appendChild(timeSpan);
        meta.appendChild(authorSpan);

        const textDiv = document.createElement("div");
        textDiv.className = "chat-msg-text";
        textDiv.textContent = msg.text;

        item.appendChild(meta);
        item.appendChild(textDiv);
        container.appendChild(item);
    });

    // Cuộn mượt mà xuống cuối danh sách tin nhắn
    container.scrollTop = container.scrollHeight;

    // Cập nhật dòng preview tin nhắn mới nhất trên Menu chính (dành cho Mobile)
    updateMobileChatPreview(messagesList);
}

/**
 * Cập nhật dòng preview tin nhắn mới nhất trên Menu chính (dành cho Mobile)
 */
function updateMobileChatPreview(messagesList) {
    const previewEl = document.getElementById("mobile-chat-latest-content");
    if (!previewEl) return;

    if (!messagesList || messagesList.length === 0) {
        previewEl.innerHTML = `<span class="mobile-chat-empty">Chưa có tin nhắn nào trong sảnh...</span>`;
        return;
    }

    // Lấy tối đa 2 tin nhắn mới nhất
    const recentMsgs = messagesList.slice(-2);
    previewEl.innerHTML = recentMsgs.map(msg => {
        const timeStr = formatTime(msg.createdAt);
        const isSelf = currentUser && (msg.uid === currentUser.uid);
        const author = (isSelf && currentProfile && currentProfile.nickname)
            ? currentProfile.nickname
            : (msg.author || "Sinh viên");
        const rawText = msg.text || "";
        const text = rawText.replace(/\r?\n+/g, " ");
        return `<div class="mobile-chat-preview-item"><span class="mobile-chat-time">[${timeStr}]</span> <span class="mobile-chat-author">${author}:</span> <span class="mobile-chat-msg">${text}</span></div>`;
    }).join("");
}

/**
 * Điều phối gắn phần tử khung chat (#lobby-chat-panel) vào đúng vị trí theo chế độ hiển thị
 */
function ensureChatMounted(target) {
    const chatPanel = document.getElementById("lobby-chat-panel");
    const lobbyLayout = document.getElementById("lobby-layout");
    const mobileMount = document.getElementById("mobile-chat-mount");

    if (!chatPanel) return;

    if (target === "mobile" && mobileMount) {
        if (chatPanel.parentElement !== mobileMount) {
            mobileMount.appendChild(chatPanel);
        }
    } else if (target === "desktop" && lobbyLayout) {
        if (chatPanel.parentElement !== lobbyLayout) {
            lobbyLayout.appendChild(chatPanel);
        }
    }
}

/**
 * Mở màn hình Sảnh Chat riêng biệt trên mobile qua ScreenSwitcher
 */
function openMobileChatScreen() {
    ensureChatMounted("mobile");
    if (typeof ScreenSwitcher !== "undefined" && typeof ScreenSwitcher.to === "function") {
        ScreenSwitcher.to("chat-screen", {
            fadeIn: true,
            autoUnlock: true,
            onShow: () => {
                const container = document.getElementById("chat-messages-list");
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }
        });
    }
}

/**
 * Trở về Menu chính từ màn hình Chat Mobile qua ScreenSwitcher
 */
function returnToMenuFromChat() {
    if (typeof ScreenSwitcher !== "undefined" && typeof ScreenSwitcher.to === "function") {
        ScreenSwitcher.to("menu-screen", {
            fadeIn: true,
            autoUnlock: true
        });
    }
}

/**
 * Dọn dẹp tin nhắn cũ hơn 20 tin (Auto-Prune)
 */
async function pruneOldMessages() {
    try {
        const qAll = query(collection(db, "messages"), orderBy("createdAt", "desc"));
        const snap = await getDocs(qAll);
        if (snap.size > MAX_MESSAGES_LIMIT) {
            const docsToDelete = snap.docs.slice(MAX_MESSAGES_LIMIT);
            for (const d of docsToDelete) {
                await deleteDoc(d.ref).catch(() => { });
            }
        }
    } catch (e) {
        // Không block trải nghiệm nếu rules không cho xóa
    }
}

/**
 * Đếm số từ trong chuỗi văn bản (phân tách bởi khoảng trắng / ký tự xuống dòng)
 */
function getChatWordCount(str) {
    const trimmed = (str || "").trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

/**
 * Tự động co giãn chiều cao của textarea theo nội dung (tối đa 120px)
 */
function autoResizeChatInput(el) {
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(Math.max(el.scrollHeight, 32), 120);
    el.style.height = newHeight + "px";
}

/**
 * Gửi tin nhắn mới lên Firestore
 */
async function handleSendMessage() {
    if (!currentUser) {
        alert("Vui lòng đăng nhập tài khoản trường (@eaut.edu.vn) để gửi tin nhắn!");
        handleLogin();
        return;
    }

    if (currentProfile && currentProfile.bannedChat === true) {
        alert("Tài khoản của bạn đã bị cấm chat do vi phạm tiêu chuẩn cộng đồng!");
        return;
    }

    if (!isGodModeActive() && cooldownRemaining > 0) {
        return;
    }

    const input = document.getElementById("chat-input-field");
    if (!input) return;

    const text = input.value.trim();
    if (!text) {
        input.focus();
        return;
    }

    const wordCount = getChatWordCount(text);
    if (wordCount > 300) {
        alert(`Tin nhắn quá dài (${wordCount}/300 từ). Vui lòng rút gọn lại dưới 300 từ!`);
        input.focus();
        return;
    }

    const authorName = (currentProfile && currentProfile.nickname)
        ? currentProfile.nickname
        : (currentUser.displayName || currentUser.email.split("@")[0]);

    try {
        // Thêm tin nhắn vào collection "messages" (hỗ trợ xuống dòng và tối đa 300 từ)
        await addDoc(collection(db, "messages"), {
            uid: currentUser.uid,
            author: authorName.slice(0, 24),
            email: currentUser.email,
            text: text,
            createdAt: serverTimestamp()
        });

        // Lưu thời điểm gửi tin lên Firestore để đồng bộ cooldown xuyên thiết bị/phiên
        if (!isGodModeActive()) {
            await updateDoc(doc(db, "users", currentUser.uid), {
                lastMessageAt: serverTimestamp()
            }).catch(() => { });
        }

        input.value = "";
        autoResizeChatInput(input);
        const charCount = document.getElementById("chat-char-count");
        if (charCount) {
            charCount.textContent = "0/300 từ";
            charCount.classList.remove("over-limit");
        }

        // Bắt đầu đếm ngược cooldown 5 phút (nếu không có God Mode)
        if (!isGodModeActive()) {
            startCooldown(COOLDOWN_SECONDS);
        }

        // Tự động dọn dẹp các tin nhắn vượt quá mốc 20
        pruneOldMessages();
    } catch (err) {
        console.error("Lỗi khi gửi tin nhắn:", err);
        alert("Không thể gửi tin nhắn lúc này: " + (err.message || "Lỗi quyền truy cập"));
    }
}

/**
 * Lắng nghe Realtime đúng 20 tin nhắn mới nhất từ Firestore
 */
function listenToMessages() {
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    const q = query(
        collection(db, "messages"),
        orderBy("createdAt", "desc"),
        limit(MAX_MESSAGES_LIMIT)
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const msgs = [];
        snapshot.forEach(docSnap => {
            msgs.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Đảo ngược để tin cũ hơn ở trên, tin mới nhất ở dưới
        msgs.reverse();
        renderMessages(msgs);
    }, (error) => {
        console.error("Lỗi kết nối Sảnh Chat:", error);
    });
}

/**
 * Lấy hoặc khởi tạo ID phiên trực tuyến cho tab hiện tại
 */
function getPresenceSessionId() {
    if (!mySessionId) {
        mySessionId = sessionStorage.getItem("ontaptriet_presence_session");
        if (!mySessionId) {
            mySessionId = "s_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
            sessionStorage.setItem("ontaptriet_presence_session", mySessionId);
        }
    }
    return mySessionId;
}

/**
 * Gửi tín hiệu nhịp tim (heartbeat) để duy trì trạng thái trực tuyến
 */
async function sendPresenceHeartbeat() {
    try {
        const sid = getPresenceSessionId();
        const docRef = doc(db, PRESENCE_COLLECTION, sid);
        await setDoc(docRef, {
            updatedAt: serverTimestamp(),
            updatedAtMs: Date.now(),
            uid: currentUser ? currentUser.uid : null
        }, { merge: true });
    } catch (e) {
        // Bỏ qua nếu lỗi mạng hoặc rules chưa cập nhật
    }
}

/**
 * Lắng nghe Realtime số lượng người dùng đang trực tuyến
 */
function listenToPresence() {
    if (unsubscribePresence) {
        unsubscribePresence();
    }

    try {
        const presenceCol = collection(db, PRESENCE_COLLECTION);
        unsubscribePresence = onSnapshot(presenceCol, (snapshot) => {
            const now = Date.now();
            let count = 0;
            const staleDocs = [];

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                let lastSeenMs = 0;
                if (data.updatedAt && data.updatedAt.toDate) {
                    lastSeenMs = data.updatedAt.toDate().getTime();
                } else if (data.updatedAtMs) {
                    lastSeenMs = data.updatedAtMs;
                }

                if (now - lastSeenMs <= PRESENCE_TIMEOUT_MS) {
                    count++;
                } else if (now - lastSeenMs > PRESENCE_TIMEOUT_MS * 3) {
                    staleDocs.push(docSnap.ref);
                }
            });

            // Tối thiểu là 1 (chính người dùng đang xem trang)
            const finalCount = Math.max(1, count);
            const onlineEl = document.getElementById("chat-online-count");
            if (onlineEl) {
                onlineEl.textContent = finalCount.toString();
            }

            // Dọn bớt session rác định kỳ (tối đa 3 doc mỗi lần)
            if (staleDocs.length > 0) {
                staleDocs.slice(0, 3).forEach((ref) => deleteDoc(ref).catch(() => { }));
            }
        }, () => {
            // Fallback khi chưa cấu hình Rules trên Firebase Console
            const onlineEl = document.getElementById("chat-online-count");
            if (onlineEl && (onlineEl.textContent === "" || onlineEl.textContent === "0")) {
                onlineEl.textContent = "1";
            }
        });
    } catch (err) {
        console.warn("Lỗi khởi tạo lắng nghe presence:", err);
    }
}

/**
 * Khởi tạo toàn bộ hệ thống trạng thái trực tuyến
 */
function initPresenceSystem() {
    sendPresenceHeartbeat();

    clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(sendPresenceHeartbeat, HEARTBEAT_INTERVAL_MS);

    listenToPresence();

    window.addEventListener("beforeunload", () => {
        try {
            const sid = getPresenceSessionId();
            deleteDoc(doc(db, PRESENCE_COLLECTION, sid)).catch(() => { });
        } catch (e) { }
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            sendPresenceHeartbeat();
        }
    });
}

/**
 * Khởi tạo Sảnh Chat
 */
function initChatApp() {
    // Kiểm tra cooldown ngay lập tức khi vừa vào trang
    checkCooldown();

    // Khởi động hệ thống Realtime Online Presence
    initPresenceSystem();

    // 1. Lắng nghe trạng thái đăng nhập Firebase Auth
    onAuthStateChanged(auth, async (user) => {
        if (user && user.email && user.email.toLowerCase().endsWith("@eaut.edu.vn")) {
            currentUser = user;
            await loadOrCreateUserProfile(user);
        } else {
            currentUser = null;
            currentProfile = null;
            updateAuthUI();
        }
        checkCooldown();
        sendPresenceHeartbeat();
    });

    // 2. Bắt đầu lắng nghe tin nhắn Realtime
    listenToMessages();

    // 3. Gán sự kiện cho các nút điều khiển
    const loginPromptBtn = document.getElementById("btn-chat-login-prompt");
    if (loginPromptBtn) {
        loginPromptBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            handleLogin();
        };
    }

    const loginBtn = document.getElementById("btn-chat-login");
    if (loginBtn) {
        loginBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            handleLogin();
        };
    }

    const logoutBtn = document.getElementById("btn-chat-logout");
    if (logoutBtn) {
        logoutBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            handleLogout();
        };
    }

    const setNameBtn = document.getElementById("btn-chat-set-name");
    if (setNameBtn) {
        setNameBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            handleChangeNickname();
        };
    }

    const sendBtn = document.getElementById("chat-send-btn");
    if (sendBtn) {
        sendBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            handleSendMessage();
        };
    }

    const clearBtn = document.getElementById("chat-clear-btn");
    const clearViewport = document.getElementById("chat-clear-viewport");
    const inputField = document.getElementById("chat-input-field");
    const charCount = document.getElementById("chat-char-count");

    let isClearConfirming = false;
    let clearResetTimer = null;

    function resetClearBtnState() {
        isClearConfirming = false;
        clearTimeout(clearResetTimer);
        if (clearBtn) clearBtn.classList.remove("confirming");
        if (clearViewport) {
            const currentSpan = clearViewport.querySelector(".label-text-current");
            const currentText = currentSpan ? currentSpan.textContent.trim() : clearViewport.textContent.trim();
            if (currentText !== "Xóa") {
                if (typeof animateLabelRoll === "function") {
                    animateLabelRoll(clearViewport, "Xóa");
                } else {
                    clearViewport.innerHTML = `<span class="label-text-current">Xóa</span>`;
                }
            }
        }
    }

    if (clearBtn && inputField) {
        clearBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            // Nếu ô nhập rỗng, chỉ cần focus ô nhập
            if (!inputField.value.trim()) {
                inputField.focus();
                return;
            }

            if (!isClearConfirming) {
                isClearConfirming = true;
                clearBtn.classList.add("confirming");
                if (clearViewport) {
                    if (typeof animateLabelRoll === "function") {
                        animateLabelRoll(clearViewport, "Xác nhận");
                    } else {
                        clearViewport.innerHTML = `<span class="label-text-current">Xác nhận</span>`;
                    }
                }
                clearTimeout(clearResetTimer);
                clearResetTimer = setTimeout(resetClearBtnState, 3500);
            } else {
                resetClearBtnState();
                inputField.value = "";
                autoResizeChatInput(inputField);
                if (charCount) {
                    charCount.textContent = "0/300 từ";
                    charCount.classList.remove("over-limit");
                }
                inputField.focus();
            }
        };
    }

    if (inputField) {
        inputField.addEventListener("input", () => {
            if (isClearConfirming) {
                resetClearBtnState();
            }
            autoResizeChatInput(inputField);
            const words = getChatWordCount(inputField.value);
            if (charCount) {
                charCount.textContent = `${words}/300 từ`;
                if (words > 300) {
                    charCount.classList.add("over-limit");
                } else {
                    charCount.classList.remove("over-limit");
                }
            }
        });

        inputField.addEventListener("keydown", (e) => {
            const isMobile = window.innerWidth <= 768;
            if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !isMobile) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    // Số người dùng trực tuyến được quản lý tự động bởi hệ thống Realtime Presence (listenToPresence)

    // 4. Giao diện Sảnh Chat riêng biệt trên Mobile (<= 768px)
    const openMobileBtn = document.getElementById("btn-open-mobile-chat");
    if (openMobileBtn) {
        openMobileBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            openMobileChatScreen();
        };
    }

    const mobileBackBtn = document.getElementById("mobile-chat-back-btn");
    if (mobileBackBtn) {
        mobileBackBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            returnToMenuFromChat();
        };
    }

    // Lắng nghe thay đổi kích thước màn hình: nếu quay về Desktop (> 768px), trả Chat về vị trí gốc
    const mql = window.matchMedia("(max-width: 768px)");
    const handleMediaChange = (e) => {
        if (!e.matches) {
            ensureChatMounted("desktop");
            const chatScreen = document.getElementById("chat-screen");
            if (chatScreen && chatScreen.style.display !== "none") {
                returnToMenuFromChat();
            }
        }
    };
    if (mql.addEventListener) {
        mql.addEventListener("change", handleMediaChange);
    } else if (mql.addListener) {
        mql.addListener(handleMediaChange);
    }
}

// Tự động khởi chạy khi tài liệu sẵn sàng
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChatApp);
} else {
    initChatApp();
}

