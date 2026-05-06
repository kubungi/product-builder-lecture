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

// --- i18n Logic ---
let currentLang = localStorage.getItem('lang') || 'ko';
let translations = {};

async function loadTranslations(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        translations = await response.json();
        applyTranslations();
        document.documentElement.lang = lang;
        
        // Re-render components that rely on translations
        renderKBO();
        fetchWeather();
    } catch (error) {
        console.error("Failed to load translations:", error);
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = getNestedValue(translations, key);
        if (text) el.textContent = text;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const text = getNestedValue(translations, key);
        if (text) el.placeholder = text;
    });

    const savedTheme = localStorage.getItem('theme') || 'dark';
    updateThemeToggleText(savedTheme);
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function updateThemeToggleText(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && translations.common) {
        themeToggle.textContent = theme === 'dark' ? translations.common.light_mode : translations.common.dark_mode;
    }
}

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

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    updateThemeToggleText(newTheme);
    localStorage.setItem('theme', newTheme);
});

// --- Language Toggle Logic ---
function updateLangButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

const langBtns = document.querySelectorAll('.lang-btn');
langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        currentLang = lang;
        localStorage.setItem('lang', currentLang);
        loadTranslations(currentLang);
        updateLangButtons(currentLang);
    });
});

// Initialize active button
updateLangButtons(currentLang);

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
        
        uploadBtn.textContent = translations.animal_test.analyzing || "분석 중...";
        uploadBtn.disabled = true;

        await loadModel();
        await predict(imagePreview);

        uploadBtn.textContent = translations.animal_test.reupload || "다른 사진 업로드하기";
        uploadBtn.disabled = false;
    };
    reader.readAsDataURL(file);
});

async function predict(imageElement) {
    const prediction = await model.predict(imageElement);
    for (let i = 0; i < maxPredictions; i++) {
        const className = prediction[i].className;
        // Translate class names if possible, but TM models usually have fixed names
        const classPrediction =
            className + ": " + (prediction[i].probability * 100).toFixed(0) + "%";
        labelContainer.childNodes[i].innerHTML = classPrediction;
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
            status.innerHTML = translations.inquiry.success || "문의가 성공적으로 전송되었습니다! 곧 연락드리겠습니다.";
            status.style.color = "#4CAF50";
            form.reset();
        } else {
            response.json().then(data => {
                if (Object.hasOwn(data, 'errors')) {
                    status.innerHTML = data["errors"].map(error => error["message"]).join(", ");
                } else {
                    status.innerHTML = translations.inquiry.error || "앗! 전송 중에 문제가 발생했습니다.";
                }
                status.style.color = "#f44336";
            })
        }
    }).catch(error => {
        status.innerHTML = translations.inquiry.error || "앗! 전송 중에 문제가 발생했습니다.";
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
    if (!currentContainer || !forecastContainer) return;
    
    const lat = 37.5145;
    const lon = 127.1062;
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Asia%2FSeoul`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data && data.current_weather) {
            const now = new Date();
            const currentHour = now.getHours();
            const humidity = data.hourly.relativehumidity_2m[currentHour];
            const feelsLike = Math.round(data.hourly.apparent_temperature[currentHour]);
            
            renderCurrentWeather(data.current_weather, humidity, feelsLike, currentContainer);
            renderForecast(data.daily, forecastContainer);
        }
    } catch (error) {
        console.error("Weather fetch failed:", error);
        currentContainer.innerHTML = translations.weather.error || "날씨 정보를 불러오는 데 실패했습니다.";
    }
}

function renderCurrentWeather(current, humidity, feelsLike, container) {
    const temp = Math.round(current.temperature);
    const code = current.weathercode;
    const weatherDesc = getWeatherDescription(code);
    const weatherIcon = getWeatherIcon(code);
    
    const feelsLikeLabel = translations.weather.feels_like || "체감";
    const humidityLabel = translations.weather.humidity || "습도";
    const windLabel = translations.weather.wind || "풍속";

    container.innerHTML = `
        <div class="weather-main-left">
            <div class="weather-main-temp">${temp}°</div>
            <div class="weather-main-desc">${weatherIcon} ${weatherDesc}</div>
        </div>
        <div class="weather-main-right">
            <div class="weather-info-pill">${feelsLikeLabel} ${feelsLike}°</div>
            <div class="weather-info-pill">${humidityLabel} ${humidity}%</div>
            <div class="weather-info-pill">${windLabel} ${current.windspeed}km/h</div>
        </div>
    `;
}

function renderForecast(daily, container) {
    container.innerHTML = '';
    const days = daily.time;
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(days[i]);
        const dayName = i === 0 ? (translations.weather.today || "오늘") : date.toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'short' });
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
    const descriptions = currentLang === 'ko' ? {
        0: "맑음",
        1: "대체로 맑음", 2: "구름 조금", 3: "흐림",
        45: "안개", 48: "침적 안개",
        51: "가벼운 이슬비", 53: "이슬비", 55: "강한 이슬비",
        61: "약한 비", 63: "보통 비", 65: "강한 비",
        71: "약한 눈", 73: "보통 눈", 75: "강한 눈",
        80: "약한 소나기", 81: "보통 소나기", 82: "강한 소나기",
        95: "천둥번개",
    } : {
        0: "Clear sky",
        1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
        95: "Thunderstorm",
    };
    return descriptions[code] || (currentLang === 'ko' ? "정보 없음" : "No info");
}

// --- KBO Stats Logic ---
function renderKBO() {
    const standingsBody = document.getElementById('standings-body');
    const playerStatsGrid = document.getElementById('lg-stats-container');
    if (!standingsBody || !playerStatsGrid) return;

    const standings = [
        { rank: 1, team: 'LG', logo: '⚾', g: 18, w: 12, l: 6, d: 0, pct: '.667', gb: '-', strk: currentLang === 'ko' ? '3승' : '3W' },
        { rank: 2, team: 'KIA', logo: '🐯', g: 17, w: 11, l: 6, d: 0, pct: '.647', gb: '0.5', strk: currentLang === 'ko' ? '1패' : '1L' },
        { rank: 3, team: '두산', logo: '🐻', g: 18, w: 10, l: 8, d: 0, pct: '.556', gb: '2.0', strk: currentLang === 'ko' ? '2승' : '2W' },
        { rank: 4, team: 'NC', logo: '🦖', g: 17, w: 9, l: 8, d: 0, pct: '.529', gb: '2.5', strk: currentLang === 'ko' ? '1승' : '1W' },
        { rank: 5, team: '삼성', logo: '🦁', g: 18, w: 9, l: 9, d: 0, pct: '.500', gb: '3.0', strk: currentLang === 'ko' ? '2패' : '2L' },
        { rank: 6, team: 'SSG', logo: '🚀', g: 17, w: 8, l: 9, d: 0, pct: '.471', gb: '3.5', strk: currentLang === 'ko' ? '1승' : '1W' },
        { rank: 7, team: 'KT', logo: '🧙', g: 18, w: 8, l: 10, d: 0, pct: '.444', gb: '4.0', strk: currentLang === 'ko' ? '3패' : '3L' },
        { rank: 8, team: '한화', logo: '🦅', g: 17, w: 7, l: 10, d: 0, pct: '.412', gb: '4.5', strk: currentLang === 'ko' ? '1패' : '1L' },
        { rank: 9, team: '롯데', logo: '⚓', g: 18, w: 7, l: 11, d: 0, pct: '.389', gb: '5.0', strk: currentLang === 'ko' ? '2승' : '2W' },
        { rank: 10, team: '키움', logo: '🦸', g: 17, w: 6, l: 11, d: 0, pct: '.353', gb: '5.5', strk: currentLang === 'ko' ? '4패' : '4L' }
    ];

    const players = [
        { name: currentLang === 'ko' ? '김현수' : 'Kim Hyun-soo', pos: 'LF', s1: '.324', l1: 'AVG', s2: '3', l2: 'HR' },
        { name: currentLang === 'ko' ? '오지환' : 'Oh Ji-hwan', pos: 'SS', s1: '.295', l1: 'AVG', s2: '12', l2: 'RBI' },
        { name: currentLang === 'ko' ? '박해민' : 'Park Hae-min', pos: 'CF', s1: '.301', l1: 'AVG', s2: '7', l2: 'SB' },
        { name: currentLang === 'ko' ? '켈리' : 'Kelly', pos: 'SP', s1: '2.71', l1: 'ERA', s2: '3', l2: 'W' }
    ];

    standingsBody.innerHTML = standings.map(s => `
        <tr class="${s.team === 'LG' ? 'lg-highlight' : ''}">
            <td class="${s.rank <= 3 ? 'team-rank-high' : ''}">${s.rank}</td>
            <td class="team-name">${s.logo} ${s.team}</td>
            <td>${s.g}</td>
            <td>${s.w}</td>
            <td>${s.l}</td>
            <td>${s.d}</td>
            <td><strong>${s.pct}</strong></td>
            <td>${s.gb}</td>
            <td>${s.strk}</td>
        </tr>
    `).join('');

    playerStatsGrid.innerHTML = players.map(p => `
        <div class="player-stat-row">
            <div class="player-info">
                <strong>${p.name}</strong> <small>${p.pos}</small>
            </div>
            <div class="stat-group">
                <div class="stat-item">
                    <span class="val">${p.s1}</span>
                    <span class="lbl">${p.l1}</span>
                </div>
                <div class="stat-item">
                    <span class="val">${p.s2}</span>
                    <span class="lbl">${p.l2}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    renderHongChangKi();
}

function renderHongChangKi() {
    const container = document.getElementById('player-of-day');
    if (!container) return;

    const data = currentLang === 'ko' ? {
        name: '홍창기 (Hong Chang-ki)',
        record: '5타수 3안타(1홈런) 3타점 2득점',
        highlights: '2026 시즌 초반 엄청난 타격감을 보여주고 있습니다. 오늘 경기에서 시즌 마수걸이 홈런을 포함해 3안타 경기를 완성하며 팀의 단독 1위 수성을 이끌었습니다.',
        date: '2026.04.12 경기 결과 (CRAWLED)'
    } : {
        name: 'Hong Chang-ki',
        record: '3 hits in 5 at-bats (1 HR), 3 RBI, 2 runs',
        highlights: 'He is showing incredible batting form in early 2026. With a 3-hit game including his first HR of the season, he led the team to maintain their solo 1st place.',
        date: '2026.04.12 Game Result (CRAWLED)'
    };

    container.innerHTML = `
        <div class="hong-profile">🏃</div>
        <div class="hong-content">
            <div class="hong-header">
                <span class="hong-name">${data.name}</span>
                <span class="hong-record-pill">TODAY'S BEST</span>
            </div>
            <div class="hong-stats">${data.record}</div>
            <div class="hong-highlight">${data.highlights}</div>
            <div style="font-size: 0.7em; opacity: 0.6; margin-top: 5px;">${data.date}</div>
        </div>
    `;
}

// --- Radio Logic ---
let hls;

function initRadio() {
    const radioPlayer = document.getElementById('radio-player');
    const stationBtns = document.querySelectorAll('.station-btn');
    const currentStationName = document.getElementById('current-station-name');

    stationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            const name = btn.getAttribute('data-name');

            stationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStationName.textContent = name;
            currentStationName.removeAttribute('data-i18n'); // Manual update

            if (hls) {
                hls.destroy();
                hls = null;
            }
            radioPlayer.pause();
            radioPlayer.src = '';

            if (url.endsWith('.m3u8')) {
                if (Hls.isSupported()) {
                    hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(radioPlayer);
                    hls.on(Hls.Events.MANIFEST_PARSED, function() {
                        radioPlayer.play();
                    });
                } else if (radioPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                    radioPlayer.src = url;
                    radioPlayer.addEventListener('loadedmetadata', function() {
                        radioPlayer.play();
                    });
                } else {
                    alert(translations.radio.not_supported || "이 브라우저는 HLS 재생을 지원하지 않습니다.");
                }
            } else {
                radioPlayer.src = url;
                radioPlayer.play().catch(error => {
                    console.error("Radio playback failed:", error);
                    alert("방송을 재생할 수 없습니다.");
                });
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initRadio();
    loadTranslations(currentLang);
});
