let isMurkyModeActive = false;
let swgAudioGlobal = null;
let swgAudioBufferGlobal = null;
const audioCtxGlobal = new (window.AudioContext || window.webkitAudioContext)();

const redBtn = document.getElementById("close-btn");

redBtn.addEventListener("click", () => {
    if (isMurkyModeActive) {
        // Track: Payload tắt cửa sổ lần 2 (Kích hoạt error audio/jumpscare)
        if (typeof gtag === 'function') {
            gtag('event', 'window_close_scare', {
                'mode': 'murky',
                'description': 'User closed window while murky mode was active'
            });
        }
        triggerJumpscare();
    } else {
        let closes = parseInt(localStorage.getItem("easter_egg_closes") || "0");
        closes++;
        localStorage.setItem("easter_egg_closes", closes.toString());

        let remaining = 3 - closes;

        if (remaining <= 0) {
            // Track: Kích hoạt payload 1 (Murky Mode cho lần sau)
            if (typeof gtag === 'function') {
                gtag('event', 'window_close_normal', {
                    'description': 'User closed window normally, unlocking murky mode'
                });
            }
            const expiryTime = Date.now() + 10 * 60 * 1000;
            localStorage.setItem("easter_egg_expiry", expiryTime.toString());
            localStorage.removeItem("easter_egg_closes");

            // Hiện chữ Good Luck
            const goodLuckText = document.createElement("div");
            goodLuckText.innerText = `good luck`;
            goodLuckText.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: rgba(255,255,255,0.9); font-size: 22px; font-family: monospace; z-index: 9999; text-shadow: 0 0 20px rgba(255,255,255,0.5); pointer-events: none;";
            document.body.appendChild(goodLuckText);

            goodLuckText.animate([
                { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
                { opacity: 0, transform: "translate(-50%, -50%) scale(1.1)" }
            ], { duration: 2500, easing: "ease-in", fill: "forwards" });
        } else {
            // Hiện dòng chữ đếm ngược ở giữa màn hình
            const warningText = document.createElement("div");
            warningText.innerText = `payload incoming in ${remaining}`;
            warningText.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: rgba(255,255,255,0.8); font-size: 22px; font-family: monospace; z-index: 9999; text-shadow: 0 0 15px rgba(255,255,255,0.4); pointer-events: none;";
            document.body.appendChild(warningText);

            // Hiệu ứng fade out trễ dần
            warningText.animate([
                { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
                { opacity: 0, transform: "translate(-50%, -50%) scale(0.95)" }
            ], { duration: 2500, easing: "ease-out", fill: "forwards" });
        }

        const appWindow = document.getElementById("app-window");
        if (appWindow) {
            // Sử dụng CSS class 'closing' để kích hoạt transition mặc định (ổn định hơn .animate)
            appWindow.classList.add('closing');
        }

        // Tăng thời gian chờ để thấy hiệu ứng text fade đẹp hơn trước khi tắt hẳn tab
        setTimeout(() => {
            if (appWindow) appWindow.style.display = 'none';
            window.close();
        }, 3000);
    }
});

function triggerJumpscare() {
    const glitchStr = "ŴĜžűĺŮÍŮĮŐŹ¥ŎĔŚîÿÒťďðģÊÍŲŹŃćųŶìñÊÃşøĦ¼·ŴμõŨŠ×łŝŞ";
    document.title = glitchStr;

    const allElements = document.querySelectorAll('h1, h2, h3, p, span, button, div, label');
    allElements.forEach(el => {
        if (el.children.length === 0 && el.innerText.trim() !== "") {
            let scrambled = "";
            for (let i = 0; i < el.innerText.length; i++) {
                scrambled += glitchStr[Math.floor(Math.random() * glitchStr.length)];
            }
            el.innerText = scrambled;
        }
    });

    try {
        const audioCtx = audioCtxGlobal;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const frameCount = Math.floor(audioCtx.sampleRate * 0.04);
        let buffer;

        if (swgAudioBufferGlobal && swgAudioGlobal) {
            const currentTime = swgAudioGlobal.currentTime;
            const startFrame = Math.floor(currentTime * audioCtx.sampleRate);
            buffer = audioCtx.createBuffer(swgAudioBufferGlobal.numberOfChannels, frameCount, audioCtx.sampleRate);

            for (let channel = 0; channel < swgAudioBufferGlobal.numberOfChannels; channel++) {
                const nowBuffering = buffer.getChannelData(channel);
                const originalData = swgAudioBufferGlobal.getChannelData(channel);
                for (let i = 0; i < frameCount; i++) {
                    const idx = startFrame + i;
                    nowBuffering[i] = idx < originalData.length ? originalData[idx] : 0;
                }
            }
        } else {
            buffer = audioCtx.createBuffer(1, frameCount, audioCtx.sampleRate);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = (Math.random() * 2 - 1) * 0.8;
            }
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start();

        document.body.style.cursor = 'none';

        if (swgAudioGlobal) {
            swgAudioGlobal.pause();
        }
        const bgVideo = document.getElementById("bg-video");
        if (bgVideo) {
            bgVideo.pause();
        }

        setTimeout(() => {
            source.stop();

            if (swgAudioGlobal) {
                swgAudioGlobal.currentTime = 0;
            }

            document.body.innerHTML = '';
            document.body.className = '';
            document.body.style.backgroundColor = '#000';
            document.documentElement.style.backgroundColor = '#000';
            localStorage.clear();

            setTimeout(() => {
                const sybauAudio = new Audio("wall/sybau.mp3");
                sybauAudio.play().catch(e => console.log(e));

                const img = document.createElement("img");
                img.src = "wall/danvjppro.jpeg";
                img.style.position = "fixed";
                img.style.top = "50%";
                img.style.left = "50%";
                img.style.transform = "translate(-50%, -50%)";
                img.style.width = "100vw";
                img.style.height = "100vh";
                img.style.objectFit = "cover";
                img.style.opacity = "0";
                img.style.transition = "opacity 40s linear";
                img.style.zIndex = "999999";

                document.body.appendChild(img);

                setTimeout(() => {
                    img.style.opacity = "1";
                }, 100);

                setTimeout(() => {
                    window.close();
                }, 15100);
            }, 3000);
        }, 2500);
    } catch (e) {
        console.error("Audio API lỗi: ", e);
        if (typeof gtag === 'function') {
            gtag('event', 'audio_api_error', {
                'error_message': e.message,
                'is_murky': isMurkyModeActive
            });
        }
    }
}
