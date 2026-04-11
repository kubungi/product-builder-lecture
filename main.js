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

generateBtn.addEventListener('click', () => {
    document.querySelector('lotto-numbers').generate();
});

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
});
