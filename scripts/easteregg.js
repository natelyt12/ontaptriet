let isMurkyModeActive = false;
let swgAudioGlobal = null;
let swgAudioBufferGlobal = null;
const audioCtxGlobal = new (window.AudioContext || window.webkitAudioContext)();

const redBtn = document.getElementById("close-btn");

redBtn.addEventListener("click", () => {
    if (isMurkyModeActive) {
        triggerJumpscare();
    } else {
        const expiryTime = Date.now() + 10 * 60 * 1000;
        localStorage.setItem("easter_egg_expiry", expiryTime.toString());

        const appWindow = document.getElementById("app-window");
        const currentTransform = window.getComputedStyle(appWindow).transform;
        appWindow.animate([
            { transform: `${currentTransform} scale(1)`, opacity: 1 },
            { transform: `${currentTransform} scale(0.8)`, opacity: 0 }
        ], { duration: 400, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });

        setTimeout(() => {
            window.close();
        }, 500);
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
                    localStorage.clear();
                    window.close();
                }, 15100);
            }, 3000);
        }, 2500); 
    } catch (e) {
        console.error("Audio API lỗi: ", e);
    }
}
