class LottoNumbers extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = `
            div {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(145deg, #e6e6e6, #ffffff);
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 1.5em;
                font-weight: bold;
                color: #333;
                box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);
                animation: pop-in 0.5s ease-out forwards;
                margin: 0 5px;
                transform: scale(0);
                animation-fill-mode: forwards;
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

    connectedCallback() {
        this.generate();
    }

    generate() {
        this.shadowRoot.innerHTML = ''; // Clear previous numbers
        const style = document.createElement('style');
        style.textContent = `
            div {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(145deg, #e6e6e6, #ffffff);
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 1.5em;
                font-weight: bold;
                color: #333;
                box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);
                animation: pop-in 0.5s ease-out forwards;
                margin: 0 5px;
                transform: scale(0);
                animation-fill-mode: forwards;
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
            }, index * 200); // Stagger the animation
        });
    }
}

customElements.define('lotto-numbers', LottoNumbers);

document.getElementById('generate-btn').addEventListener('click', () => {
    document.querySelector('lotto-numbers').generate();
});
