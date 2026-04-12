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

// --- Global Elements ---
const generateBtn = document.getElementById('generate-btn');
const form = document.querySelector('form');

if (generateBtn) {
    generateBtn.addEventListener('click', () => {
        const lottoComp = document.querySelector('lotto-numbers');
        if (lottoComp) lottoComp.generate();
    });
}

// --- Theme Toggle Logic ---
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Initialize theme
const savedTheme = localStorage.getItem('theme') || 'dark';
body.setAttribute('data-theme', savedTheme);
if (themeToggle) {
    themeToggle.textContent = savedTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('theme', newTheme);
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

// --- Weather Logic (Songpa-gu, Seoul) ---
async function fetchWeather() {
    const currentContainer = document.getElementById('current-weather');
    const forecastContainer = document.getElementById('weather-forecast');
    
    const lat = 37.5145;
    const lon = 127.1062;
    // Added more fields for KMA-like details: apparent_temperature, relativehumidity_2m
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Asia%2FSeoul`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data && data.current_weather) {
            // Get current humidity and feels-like from hourly data
            const now = new Date();
            const currentHour = now.getHours();
            const humidity = data.hourly.relativehumidity_2m[currentHour];
            const feelsLike = Math.round(data.hourly.apparent_temperature[currentHour]);
            
            renderCurrentWeather(data.current_weather, humidity, feelsLike, currentContainer);
            renderForecast(data.daily, forecastContainer);
        }
    } catch (error) {
        console.error("Weather fetch failed:", error);
        currentContainer.innerHTML = "날씨 정보를 불러오는 데 실패했습니다.";
    }
}

function renderCurrentWeather(current, humidity, feelsLike, container) {
    const temp = Math.round(current.temperature);
    const code = current.weathercode;
    const weatherDesc = getWeatherDescription(code);
    const weatherIcon = getWeatherIcon(code);
    
    container.innerHTML = `
        <div class="weather-main-left">
            <div class="weather-main-temp">${temp}°</div>
            <div class="weather-main-desc">${weatherIcon} ${weatherDesc}</div>
        </div>
        <div class="weather-main-right">
            <div class="weather-info-pill">체감 ${feelsLike}°</div>
            <div class="weather-info-pill">습도 ${humidity}%</div>
            <div class="weather-info-pill">풍속 ${current.windspeed}km/h</div>
        </div>
    `;
}

function renderForecast(daily, container) {
    container.innerHTML = '';
    const days = daily.time;
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(days[i]);
        const dayName = i === 0 ? "오늘" : date.toLocaleDateString('ko-KR', { weekday: 'short' });
        const monthDay = `${date.getMonth() + 1}/${date.getDate()}`;
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const precip = daily.precipitation_probability_max[i];
        const code = daily.weathercode[i];
        const icon = getWeatherIcon(code);

        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="date">${monthDay}(${dayName})</div>
            <div class="icon">${icon}</div>
            <div class="temp">${maxTemp}°/${minTemp}°</div>
            <div class="pop">💧${precip}%</div>
        `;
        container.appendChild(forecastCard);
    }
}

function getWeatherIcon(code) {
    if (code === 0) return "☀️";
    if (code <= 3) return "🌤️";
    if (code <= 48) return "☁️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "❄️";
    if (code <= 82) return "🌦️";
    if (code <= 99) return "⚡";
    return "🌡️";
}

function getWeatherDescription(code) {
    const codes = {
        0: "맑음",
        1: "대체로 맑음", 2: "구름 조금", 3: "흐림",
        45: "안개", 48: "침적 안개",
        51: "가벼운 이슬비", 53: "이슬비", 55: "강한 이슬비",
        61: "약한 비", 63: "보통 비", 65: "강한 비",
        71: "약한 눈", 73: "보통 눈", 75: "강한 눈",
        80: "약한 소나기", 81: "보통 소나기", 82: "강한 소나기",
        95: "천둥번개",
    };
    return codes[code] || "정보 없음";
}

fetchWeather();
