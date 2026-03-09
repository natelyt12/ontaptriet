// --- QUẢN LÝ HÌNH NỀN (LOGIC MỚI BẰNG VIDEO & EASTER EGG) ---
function initWallpaper() {
    const bgVideo = document.getElementById("bg-video");
    const expiryTime = localStorage.getItem("easter_egg_expiry");
    const currentTime = Date.now();

    // Nếu tồn tại timer và chưa hết hạn 10p
    if (expiryTime && currentTime < parseInt(expiryTime)) {
        document.title = "painful website";
        isMurkyModeActive = true;

        // Thay hình nền video
        if (bgVideo) {
            bgVideo.querySelector('source').src = "wall/murky.mp4";
            bgVideo.load();
        }

        // Bật nhạc nền (cần tương tác người dùng)
        swgAudioGlobal = new Audio("wall/swg.mp3");
        swgAudioGlobal.loop = true;
        swgAudioGlobal.volume = 0.5; // Độ to 0.5

        // Tải dữ liệu thô để dùng cho lúc đơ máy
        fetch("wall/swg.mp3")
            .then(res => res.arrayBuffer())
            .then(data => audioCtxGlobal.decodeAudioData(data))
            .then(buffer => swgAudioBufferGlobal = buffer)
            .catch(e => console.log("Lỗi tải buffer: ", e));

        // Thử play luôn (có thể bị trình duyệt chặn)
        swgAudioGlobal.play().catch(e => {
            console.log("Trình duyệt chặn autoplay âm thanh, đang đợi click:", e);
            const playAudioOnInteraction = () => {
                if (swgAudioGlobal) swgAudioGlobal.play();
                document.removeEventListener('click', playAudioOnInteraction);
            };
            document.addEventListener('click', playAudioOnInteraction);
        });

        // Nút toggle âm thanh
        const muteBtn = document.createElement("button");
        muteBtn.innerHTML = "mute";
        muteBtn.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 1000; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; padding: 5px 10px; font-size: 0.8; cursor: pointer; transition: 0.2s;";

        muteBtn.addEventListener("mouseover", () => muteBtn.style.background = "rgba(255,255,255,0.1)");
        muteBtn.addEventListener("mouseout", () => muteBtn.style.background = "rgba(0,0,0,0.5)");

        muteBtn.addEventListener("click", () => {
            if (swgAudioGlobal.volume > 0) {
                // Tắt tiếng nhưng CỐ TÌNH để nguyên state play() để AudioContext vẫn lấy mẫu đệm được (Fake Mute)
                swgAudioGlobal.volume = 0;
                muteBtn.innerHTML = "unmute";
            } else {
                swgAudioGlobal.volume = 0.5;
                muteBtn.innerHTML = "mute";
            }
        });
        document.body.appendChild(muteBtn);

    } else if (expiryTime) {
        // Đã quá 10p thì dọn dẹp
        localStorage.removeItem("easter_egg_expiry");
    }

    // Tự động play hình nền video trên mọi thiết bị
    if (bgVideo) {
        bgVideo.play().catch(e => console.log("Trình duyệt chặn autoplay video:", e));
    }
}

// Chạy hàm khởi tạo khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
    initWallpaper();
    initMenu();
});
