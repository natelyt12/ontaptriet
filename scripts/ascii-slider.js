class AsciiSlider {
    constructor({ containerId, steps = 10, initialStep = 1, onChange, showPercentage = false, defaultStep = null, defaultText = "Mặc định" }) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.steps = steps;
        this.currentStep = initialStep;
        if (this.currentStep < 1) this.currentStep = 1;
        if (this.currentStep > this.steps) this.currentStep = this.steps;
        this.onChange = onChange;
        this.showPercentage = showPercentage;
        this.defaultStep = defaultStep;
        this.defaultText = defaultText;

        this.initDOM();
        this.bindEvents();
        this.updateDOM();
    }

    initDOM() {
        let html = '[';
        for (let i = 1; i <= this.steps; i++) {
            html += `<span data-idx="${i}" class="ascii-slider-char"></span>`;
        }
        html += ']';

        if (this.showPercentage) {
            html += `<span class="ascii-slider-percent" style="margin-left: 8px"></span>`;
        }

        if (this.defaultStep !== null) {
            html += `<span class="action-separator" style="margin: 0 8px; opacity: 0.3;">/</span><button class="ascii-slider-default btn-action btn-secondary" type="button" style="font-size: 0.9em; padding: 0;">${this.defaultText}</button>`;
        }

        this.container.innerHTML = html;
        this.container.style.userSelect = 'none';
        this.container.style.cursor = 'pointer';
        this.container.style.letterSpacing = '1px';
    }

    updateDOM() {
        const spans = this.container.querySelectorAll(".ascii-slider-char");
        spans.forEach((span, idx) => {
            span.textContent = (idx < this.currentStep) ? "■" : "□";
        });

        if (this.showPercentage) {
            const percentEl = this.container.querySelector(".ascii-slider-percent");
            if (percentEl) {
                const percent = Math.round((this.currentStep / this.steps) * 100);
                percentEl.textContent = `${percent}%`;
            }
        }
    }

    setStep(step) {
        if (step < 1) step = 1;
        if (step > this.steps) step = this.steps;
        if (step !== this.currentStep) {
            this.currentStep = step;
            this.updateDOM();
            if (typeof this.onChange === 'function') {
                this.onChange(this.currentStep);
            }
        }
    }

    bindEvents() {
        const defaultBtn = this.container.querySelector('.ascii-slider-default');
        if (defaultBtn) {
            defaultBtn.onclick = (e) => {
                e.stopPropagation();
                this.setStep(this.defaultStep);
            };
        }

        const updateFromEvent = (el) => {
            if (el && el.tagName === 'SPAN' && el.hasAttribute('data-idx')) {
                const step = parseInt(el.getAttribute('data-idx'), 10);
                this.setStep(step);
            }
        };

        this.container.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            updateFromEvent(e.target);

            const onMouseMove = (moveEvent) => {
                const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                if (el && this.container.contains(el)) {
                    updateFromEvent(el);
                }
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    }
}
