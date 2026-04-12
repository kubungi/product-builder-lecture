class LottoNumbers extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.renderStyles();
        this.generate();
    }

    renderStyles() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 30px;
            }

            div {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: var(--ball-bg, linear-gradient(145deg, #e6e6e6, #ffffff));
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 1.5em;
                font-weight: bold;
                color: var(--ball-text, #333);
                box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);
                animation: pop-in 0.5s ease-out forwards;
                margin: 0 5px;
                transform: scale(0);
                animation-fill-mode: forwards;
                transition: background 0.3s, color 0.3s;
            }

            @keyframes pop-in {
                0% {
                    transform: scale(0);
                }
                100% {
                    transform: scale(1);
                }
            }
        `;
        this.shadowRoot.appendChild(style);
    }

    generate() {
        // Clear previous balls (but keep style)
        const balls = this.shadowRoot.querySelectorAll('div');
        balls.forEach(ball => ball.remove());

        const numbers = new Set();
        while (numbers.size < 6) {
            numbers.add(Math.floor(Math.random() * 45) + 1);
        }

        const sortedNumbers = Array.from(numbers).sort((a, b) => a - b);

        sortedNumbers.forEach((number, index) => {
            setTimeout(() => {
                const ball = document.createElement('div');
                ball.textContent = number;
                this.shadowRoot.appendChild(ball);
            }, index * 200);
        });
    }
}

customElements.define('lotto-numbers', LottoNumbers);

const generateBtn = document.getElementById('generate-btn');
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const form = document.querySelector('form');

generateBtn.addEventListener('click', () => {
    document.querySelector('lotto-numbers').generate();
});

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
});

// --- Teachable Machine Logic (File Upload) ---
const URL = "https://teachablemachine.withgoogle.com/models/GL9c80bVi/";
let model, labelContainer, maxPredictions;

const uploadBtn = document.getElementById('upload-btn');
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const imagePreviewContainer = document.getElementById('image-preview-container');

async function loadModel() {
    if (!model) {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        
        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = '';
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }
    }
}

uploadBtn.addEventListener('click', () => imageUpload.click());

imageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = async (event) => {
        imagePreview.src = event.target.result;
        imagePreviewContainer.style.display = 'block';
        
        uploadBtn.textContent = "분석 중...";
        uploadBtn.disabled = true;

        await loadModel();
        await predict(imagePreview);

        uploadBtn.textContent = "다른 사진 업로드하기";
        uploadBtn.disabled = false;
    };
    reader.readAsDataURL(file);
});

async function predict(imageElement) {
    const prediction = await model.predict(imageElement);
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + (prediction[i].probability * 100).toFixed(0) + "%";
        labelContainer.childNodes[i].innerHTML = classPrediction;
        
        // Add some styling based on probability
        labelContainer.childNodes[i].style.background = `rgba(76, 175, 80, ${prediction[i].probability * 0.3})`;
    }
}

// --- Form Submission Logic ---
async function handleSubmit(event) {
    event.preventDefault();
    const status = document.createElement('p');
    status.style.marginTop = "15px";
    status.style.fontWeight = "bold";
    
    const data = new FormData(event.target);
    fetch(event.target.action, {
        method: form.method,
        body: data,
        headers: {
            'Accept': 'application/json'
        }
    }).then(response => {
        if (response.ok) {
            status.innerHTML = "문의가 성공적으로 전송되었습니다! 곧 연락드리겠습니다.";
            status.style.color = "#4CAF50";
            form.reset();
        } else {
            response.json().then(data => {
                if (Object.hasOwn(data, 'errors')) {
                    status.innerHTML = data["errors"].map(error => error["message"]).join(", ");
                } else {
                    status.innerHTML = "앗! 전송 중에 문제가 발생했습니다.";
                }
                status.style.color = "#f44336";
            })
        }
    }).catch(error => {
        status.innerHTML = "앗! 전송 중에 문제가 발생했습니다.";
        status.style.color = "#f44336";
    });
    
    const existingStatus = form.querySelector('p');
    if (existingStatus) existingStatus.remove();
    form.appendChild(status);
}

form.addEventListener("submit", handleSubmit);
