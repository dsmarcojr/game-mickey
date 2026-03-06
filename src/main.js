// Engine AntiGravity - Inicialização Básica

const container = document.getElementById('game-container');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;
container.appendChild(canvas);

// Input Setup
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
    // Reiniciar no Game Over com espaço ou enter
    if ((e.code === 'Space' || e.code === 'Enter') && gameOver) {
        resetGame();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// Variáveis Globais de Jogo
let cameraY = 0;
let score = 0;
let startTime = Date.now();
let elapsedTime = 0;
let gameOver = false;
let platforms = [];
let obstacles = [];
let powerups = [];

// --- Sistema de Backgrounds (Cenários Disney a cada 2000m) ---
const disneyBackgrounds = [
    { name: 'Classic Blue Sky', color: '#87CEEB', text: '' },
    // 2000m
    { name: 'Cinderella Castle Dusk', color: '#ff9999', text: 'Chegou no Castelo! (2000m)' },
    // 4000m
    { name: 'Fantasia Starry Night', color: '#000033', text: 'Espaço Sideral! (4000m)' },
    // 6000m
    { name: 'Wonderland Woods', color: '#4d004d', text: 'Floresta Maluca! (6000m)' },
    // 8000m
    { name: 'Olympus Golden Clouds', color: '#ffcc00', text: 'Monte Olimpo! (8000m)' }
];
let currentBgIndex = 0;
let nextBgIndex = 0;
let bgTransitionTimer = 0; // Vai de 0 a 1 (0 a 100%) em 2 segundos
const TRANSITION_DURATION = 2000; // 2 Segundos em milissegundos

// Classe do Jogador (Mickey)
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;

        // AntiGravity Física Base
        this.vx = 0;
        this.vy = 0;
        this.speed = 6;
        this.jumpForce = -15; // Quão alto ele pula
        this.gravity = 0.5;
        this.grounded = false;

        // Controle de Pulo Duplo e Invencibilidade
        this.jumps = 0;
        this.maxJumps = 1;
        this.jumpHeld = false;
        this.invincibleTimer = 0;
        this.doubleJumpTimer = 0; // Novo controle isolado para pulo duplo

        // Um sprite rudimentar do Mickey (estilo GBA overworld 16x16)
        // Valores: 0: Vazio, 1: Preto (Orelhas/Corpo), 2: Pele bege, 3: Vermelho (Shorts), 4: Amarelo (Sapatos/Botões), 5: Branco (Luvas)
        this.spriteData = [
            [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 2, 2, 1, 2, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 5, 5, 1, 2, 2, 2, 2, 2, 1, 5, 5, 0, 0, 0],
            [0, 0, 5, 5, 1, 1, 2, 2, 2, 1, 1, 5, 5, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 3, 4, 3, 4, 3, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 4, 4, 4, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0],
            [0, 0, 0, 4, 4, 4, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0]
        ];
        this.pixelSize = this.width / 16;
    }

    draw(context, camY) {
        const palette = {
            1: '#000000', // Preto
            2: '#ffcc99', // Bege
            3: '#cc0000', // Vermelho short
            4: '#ffcc00', // Amarelo sapato
            5: '#ffffff'  // Branco
        };

        // Efeito de Piscar (Blink) ao estar Invencível
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= 16;
            if (this.invincibleTimer < 0) this.invincibleTimer = 0;
            // Não desenha a cada "tantos" millisegundos pra piscar
            if (Math.floor(this.invincibleTimer / 100) % 2 === 0) return;
        }

        // Lógica de tempo do Pulo Duplo
        if (this.doubleJumpTimer > 0) {
            this.doubleJumpTimer -= 16;
            this.maxJumps = 2;
            if (this.doubleJumpTimer <= 0) {
                this.doubleJumpTimer = 0;
                this.maxJumps = 1; // Perde o pulo duplo
            }
        }

        const drawY = this.y - camY;

        for (let r = 0; r < 16; r++) {
            for (let c = 0; c < 16; c++) {
                const colorCode = this.spriteData[r][c];
                if (colorCode !== 0) {
                    context.fillStyle = palette[colorCode];
                    context.fillRect(
                        this.x + (c * this.pixelSize),
                        drawY + (r * this.pixelSize),
                        this.pixelSize,
                        this.pixelSize
                    );
                }
            }
        }
    }

    update() {
        if (gameOver) return;

        this.grounded = false; // Reseta grounding pra checar dnv

        // Movimento Horizontal
        if (keys.ArrowLeft) {
            this.vx = -this.speed;
        } else if (keys.ArrowRight) {
            this.vx = this.speed;
        } else {
            this.vx *= 0.8; // Fricção
            if (Math.abs(this.vx) < 0.5) this.vx = 0;
        }

        // Aplicar Gravidade
        this.vy += this.gravity;

        // Atualizar Posição
        this.x += this.vx;
        this.y += this.vy;

        // Screen Wrap Horizontal (Sai pela direita, volta pela esquerda)
        if (this.x < -this.width) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -this.width;

        // Colisão Apenas Caindo (vy > 0)
        if (this.vy > 0) {
            for (let i = 0; i < platforms.length; i++) {
                let p = platforms[i];
                if (
                    this.x + this.width - 5 > p.x &&
                    this.x + 5 < p.x + p.width &&
                    this.y + this.height >= p.y &&
                    this.y + this.height <= p.y + this.vy + 2
                ) {
                    this.vy = 0;
                    this.y = p.y - this.height;
                    this.grounded = true;
                    this.jumps = 0; // Resetar contador de pulos ao tocar a plataforma
                }
            }
        }

        // Pulo e Pulo Duplo (Impede de voar se segurar o botão com !this.jumpHeld)
        if (keys.ArrowUp && !this.jumpHeld) {
            if (this.grounded) {
                this.vy = this.jumpForce;
                this.grounded = false;
                this.jumps = 1;
            } else if (this.jumps < this.maxJumps) {
                this.vy = this.jumpForce;
                this.jumps++; // Consome o segundo pulo
            }
        }
        this.jumpHeld = keys.ArrowUp; // Segurando...

        // Movimento da Câmera
        const targetCamY = this.y - canvas.height / 2;
        if (targetCamY < cameraY) {
            cameraY = targetCamY;
        }

        // Atualiza Pontuação
        const currentScore = Math.floor(-cameraY);
        if (currentScore > score) {
            score = currentScore;
        }

        // Dead Zone (Morreu)
        if (this.y > cameraY + canvas.height) {
            gameOver = true;
        }
    }
}

// Classe Plataforma flutuante
class Platform {
    constructor(x, y, width) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 15;
    }
    draw(context, camY) {
        const renderY = this.y - camY;

        // Base da terra (Marrom)
        context.fillStyle = '#8B4513';
        context.fillRect(this.x, renderY, this.width, this.height);

        // Camada de grama e tufinhos pingando (Verdes)
        const gramaH = 5;
        context.fillStyle = '#32CD32'; // Verde vivo
        context.fillRect(this.x, renderY, this.width, gramaH);

        context.fillStyle = '#228B22'; // Verde floresta p/ detalhe inferior
        for (let i = 0; i < this.width; i += 10) {
            context.fillRect(this.x + i + 2, renderY + gramaH, 6, 4);
        }

        // Borda grossa preta/marrom estilo retro envolta de toda a plataforma
        context.lineWidth = 2;
        context.strokeStyle = '#3E1D04';
        context.strokeRect(this.x, renderY, this.width, this.height);
    }
}

// Classe Obstáculo (Cai do céu)
class Obstacle {
    constructor(x, y, vy) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.vy = vy; // Velocidade de queda baseada na altura
        this.active = true;
    }

    draw(context, camY) {
        const renderY = this.y - camY;

        // Forma da Pedra Escura
        context.fillStyle = '#444';
        context.beginPath();
        context.arc(this.x + this.width / 2, renderY + this.height / 2, this.width / 2, 0, Math.PI * 2);
        context.fill();

        // Detalhe de Cratera / Luz
        context.fillStyle = '#666';
        context.beginPath();
        context.arc(this.x + this.width / 3, renderY + this.height / 3, this.width / 4, 0, Math.PI * 2);
        context.fill();
    }

    update() {
        this.y += this.vy;
    }
}

// Classe PowerUp (Estrela e Bola de Basquete)
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type; // 'star' ou 'basketball'

        // Float animation vars
        this.baseY = y;
        this.timer = Math.random() * Math.PI * 2;
    }

    draw(context, camY) {
        const renderY = this.y - camY;

        if (this.type === 'star') {
            context.fillStyle = '#FFD700'; // Dourado
            // Estrela rudimentar usando triângulos
            context.beginPath();
            context.moveTo(this.x + this.width / 2, renderY);
            context.lineTo(this.x + this.width, renderY + this.height);
            context.lineTo(this.x, renderY + this.height / 3);
            context.lineTo(this.x + this.width, renderY + this.height / 3);
            context.lineTo(this.x, renderY + this.height);
            context.closePath();
            context.fill();
        }
        else if (this.type === 'basketball') {
            const centerX = this.x + this.width / 2;
            const centerY = renderY + this.height / 2;
            const radius = this.width / 2;

            // Bola Laranja
            context.fillStyle = '#FF6600';
            context.beginPath();
            context.arc(centerX, centerY, radius, 0, Math.PI * 2);
            context.fill();

            // Linhas da bola
            context.strokeStyle = '#331100';
            context.lineWidth = 1;
            context.beginPath();

            // Meio vertical e horizontal
            context.moveTo(centerX, centerY - radius);
            context.lineTo(centerX, centerY + radius);
            context.moveTo(centerX - radius, centerY);
            context.lineTo(centerX + radius, centerY);
            context.stroke();
        }
    }

    update() {
        this.timer += 0.05;
        this.y = this.baseY + Math.sin(this.timer) * 5; // Simples levitação
    }
}

let mickey;

function generatePlatforms(startY, numPlatforms) {
    let currentY = startY;
    for (let i = 0; i < numPlatforms; i++) {
        // Distância aleatória vertical mais garantida (Pulo max do player na engine atual consegue até ~180px)
        // Setando entre 50px e 120px para ter certeza que é sempre alcançável
        let dist = Math.random() * 70 + 50;
        currentY -= dist;

        // Largura e X aleatórios
        let pWidth = Math.random() * 80 + 60;
        let pX = Math.random() * (canvas.width - pWidth);

        platforms.push(new Platform(pX, currentY, pWidth));

        let rng = Math.random();
        if (rng < 0.05) {
            powerups.push(new PowerUp(pX + pWidth / 2 - 10, currentY - 30, 'star'));
        } else if (rng < 0.13) {
            powerups.push(new PowerUp(pX + pWidth / 2 - 10, currentY - 30, 'basketball'));
        }
    }
}

function resetGame() {
    cameraY = 0;
    score = 0;
    elapsedTime = 0;
    startTime = Date.now();
    gameOver = false;
    platforms = [];
    obstacles = [];
    powerups = [];

    // Resetar Fundo
    currentBgIndex = 0;
    nextBgIndex = 0;
    bgTransitionTimer = 0;

    mickey = new Player(canvas.width / 2, canvas.height / 2);

    // Chão inicial largo para o inicio do jogo
    platforms.push(new Platform(canvas.width / 2 - 100, canvas.height - 50, 200));

    // Gerar as primeiras plataformas subindo
    generatePlatforms(canvas.height - 50, 20);
}

// Game Loop Clássico
let lastTime = 0;

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw(deltaTime);

    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    if (!gameOver) {
        mickey.update();
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);

        // Gerecer mais plataformas se estivermos chegando perto do topo gerado
        const highestPlatform = platforms[platforms.length - 1];
        if (highestPlatform && highestPlatform.y > cameraY - 1000) {
            generatePlatforms(highestPlatform.y, 10);
        }

        // Limpeza de arrays: Remover plataformas e itens que ficaram abaixo da tela
        platforms = platforms.filter(p => p.y < cameraY + canvas.height + 100);
        powerups = powerups.filter(p => p.y < cameraY + canvas.height + 100);

        // Atualização dos Itens e Coleta
        for (let i = powerups.length - 1; i >= 0; i--) {
            let pw = powerups[i];
            pw.update();

            // Interseção entre Mickey e Estrela/Bola
            if (
                mickey.x < pw.x + pw.width &&
                mickey.x + mickey.width > pw.x &&
                mickey.y < pw.y + pw.height &&
                mickey.y + mickey.height > pw.y
            ) {
                // Coletou o Item
                powerups.splice(i, 1);

                if (pw.type === 'star') {
                    mickey.invincibleTimer = 3000; // 3 Segundos piscando
                } else if (pw.type === 'basketball') {
                    mickey.doubleJumpTimer = 5000; // 5 Segundos de pulo duplo (botinha)
                }
            }
        }

        // Checar progressão de cenário (a cada 2000m)
        let intendedBgIndex = Math.min(
            Math.floor(score / 2000),
            disneyBackgrounds.length - 1
        );

        if (intendedBgIndex > currentBgIndex && nextBgIndex !== intendedBgIndex) {
            nextBgIndex = intendedBgIndex;
            bgTransitionTimer = 0.01; // Iniciar transição
        }

        // --- SISTEMA DE OBSTÁCULOS (PÓS 1000 METROS) ---
        if (score >= 1000) {
            const excessScore = score - 1000;
            // Spawn Rate aumenta um pouco mais agressivo agora que começa cedo
            let spawnChance = 0.01 + Math.min(0.05, (excessScore / 1000) * 0.01);
            let dropSpeed = 3 + Math.min(9, (excessScore / 1000));

            if (Math.random() < spawnChance) {
                let randomX = Math.random() * (canvas.width - 24);
                // Spawnam no topo da tela caindo
                obstacles.push(new Obstacle(randomX, cameraY - 50, dropSpeed));
            }

            // Atualização e Lógica de Morte Célere
            for (let i = obstacles.length - 1; i >= 0; i--) {
                let obs = obstacles[i];
                obs.update();

                // Hitbox Básica: Checagem Retangular
                if (
                    mickey.x < obs.x + obs.width &&
                    mickey.x + mickey.width > obs.x &&
                    mickey.y < obs.y + obs.height &&
                    mickey.y + mickey.height > obs.y
                ) {
                    if (mickey.invincibleTimer <= 0) {
                        gameOver = true; // Acertado por meteoro (sem escudo)
                    }
                }

                // Limpa obstáculos que já caíram pra debaixo da tela
                if (obs.y > cameraY + canvas.height + 100) {
                    obstacles.splice(i, 1);
                }
            }
        }
    }
}

// Função de desenho de Civilizações/Backgrounds Disney
function drawScenery(context, index, width, height, camY) {
    context.save();

    // Pequeno Offset Parallax (muito leve para ficar ancorado ao fundo)
    let offsetY = (camY * 0.05) % 100;
    let base = height + offsetY;

    if (index === 0) {
        // [0] Toontown (Céu Azul): Colinas verdes e Casa do Mickey
        context.fillStyle = '#32CD32'; // Colinas Verdes
        context.beginPath();
        context.arc(150, base + 50, 200, Math.PI, 0);
        context.fill();
        context.beginPath();
        context.arc(650, base + 80, 250, Math.PI, 0);
        context.fill();

        // Casa
        context.fillStyle = '#FF4500';
        context.fillRect(80, base - 100, 140, 150);

        // Orelhas da casa (Telhado)
        context.fillStyle = '#111';
        context.beginPath();
        context.arc(80, base - 100, 45, 0, Math.PI * 2);
        context.arc(220, base - 100, 45, 0, Math.PI * 2);
        context.fill();

        // Porta
        context.fillStyle = '#8B4513';
        context.fillRect(125, base - 30, 50, 80);

    } else if (index === 1) {
        // [1] Cinderella Castle (Pôr do Sol): Silhueta do Castelo  
        context.fillStyle = '#b75b5b'; // Tom mais escuro para silhueta avermelhada

        // Base Castelo
        context.fillRect(250, base - 150, 300, 150);
        context.fillRect(325, base - 250, 150, 100);

        // Torre Principal
        context.beginPath();
        context.moveTo(325, base - 250);
        context.lineTo(400, base - 450); // Ponta
        context.lineTo(475, base - 250);
        context.fill();

        // Torres Laterais
        context.fillRect(200, base - 200, 50, 200);
        context.beginPath();
        context.moveTo(190, base - 200);
        context.lineTo(225, base - 350);
        context.lineTo(260, base - 200);
        context.fill();

        context.fillRect(550, base - 200, 50, 200);
        context.beginPath();
        context.moveTo(540, base - 200);
        context.lineTo(575, base - 350);
        context.lineTo(610, base - 200);
        context.fill();

        // Portão iluminado
        context.fillStyle = '#ffff66';
        context.beginPath();
        context.arc(400, base - 20, 40, Math.PI, 0);
        context.fillRect(360, base - 20, 80, 20);
        context.fill();

    } else if (index === 2) {
        // [2] Fantasia (Noite Estrelada): Chapéu Mágico e Luas
        context.fillStyle = '#ffff66';
        const stars = [[100, 50], [250, 120], [400, 80], [600, 150], [750, 90], [50, 200], [300, 250], [550, 220], [700, 300], [450, 180]];
        for (let s of stars) {
            context.fillRect(s[0], s[1] + offsetY * 1.5, 4, 4); // Efeito de Parallax Maior nas estrelas
        }

        // Montanha - Chapéu Mágico
        context.fillStyle = '#000088'; // Azul marinho
        context.beginPath();
        context.moveTo(150, base + 50);
        context.lineTo(350, base - 350); // Vértice que cai
        context.lineTo(450, base - 300);
        context.lineTo(650, base + 50);
        context.fill();

        // Estampa de Lua Crescente no "Chapéu Montanha"
        context.fillStyle = '#ffffcc';
        context.beginPath();
        context.arc(380, base - 150, 40, 0, Math.PI * 2); // Lua
        context.fillStyle = '#000088';
        context.beginPath();
        context.arc(400, base - 160, 35, 0, Math.PI * 2); // Furo da lua
        context.fill();

    } else if (index === 3) {
        // [3] Wonderland (Roxo Escuro): Cogumelos Gigantes
        context.fillStyle = '#660066'; // Caules roxos
        context.fillRect(150, base - 250, 40, 250);
        context.fillRect(600, base - 300, 50, 300);

        // Chapéus do cogumelo
        context.fillStyle = '#ff00ff'; // Rosa choque
        context.beginPath();
        context.arc(170, base - 250, 100, Math.PI, 0);
        context.fill();

        context.fillStyle = '#00ffff'; // Azul claro choque
        context.beginPath();
        context.arc(625, base - 300, 130, Math.PI, 0);
        context.fill();

        // Bolinhas (Sardas) nos cogumelos
        context.fillStyle = '#ffffff';
        // Rosa
        context.beginPath();
        context.arc(110, base - 280, 15, 0, Math.PI * 2);
        context.arc(170, base - 320, 20, 0, Math.PI * 2);
        context.arc(230, base - 270, 12, 0, Math.PI * 2);
        context.fill();
        // Azul
        context.beginPath();
        context.arc(550, base - 340, 25, 0, Math.PI * 2);
        context.arc(630, base - 390, 18, 0, Math.PI * 2);
        context.arc(700, base - 330, 22, 0, Math.PI * 2);
        context.fill();

    } else if (index === 4) {
        // [4] Monte Olimpo (Dourado): Pilares Gregos nas Nuvens
        // Nuvens Base
        context.fillStyle = '#ffeecc';
        context.beginPath();
        context.arc(150, base, 150, Math.PI, 0);
        context.arc(400, base + 50, 200, Math.PI, 0);
        context.arc(680, base, 160, Math.PI, 0);
        context.fill();

        // Pilares do Templo
        context.fillStyle = '#ffffff';
        context.fillRect(280, base - 250, 60, 250);
        context.fillRect(480, base - 250, 60, 250);

        // Ranhuras dos pilares
        context.fillStyle = '#ddccbb';
        context.fillRect(295, base - 250, 10, 250);
        context.fillRect(315, base - 250, 10, 250);
        context.fillRect(495, base - 250, 10, 250);
        context.fillRect(515, base - 250, 10, 250);

        // Telhado Grego
        context.fillStyle = '#cca055';
        context.beginPath();
        context.moveTo(200, base - 250);
        context.lineTo(410, base - 380);
        context.lineTo(620, base - 250);
        context.fill();
    }
    context.restore();
}

function draw(deltaTime) {
    // Processar transição de Fundo de Tela
    if (bgTransitionTimer > 0) {
        bgTransitionTimer += deltaTime / TRANSITION_DURATION;
        if (bgTransitionTimer >= 1) {
            currentBgIndex = nextBgIndex;
            bgTransitionTimer = 0; // Fim da transição
        }
    }

    // Desenhar Fundo Atual
    ctx.fillStyle = disneyBackgrounds[currentBgIndex].color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawScenery(ctx, currentBgIndex, canvas.width, canvas.height, cameraY);

    // Renderizar mistura de Fundo Novo se estivermos transicionando (Opacidade alpha)
    if (bgTransitionTimer > 0) {
        ctx.save();
        ctx.globalAlpha = bgTransitionTimer; // Ex: 0.5 (50% transparente)
        ctx.fillStyle = disneyBackgrounds[nextBgIndex].color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawScenery(ctx, nextBgIndex, canvas.width, canvas.height, cameraY);
        ctx.restore();
    }

    // Alerta de Chegada no Novo Mundo
    if (bgTransitionTimer > 0 || (currentBgIndex > 0 && Math.floor(score % 2000) < 100)) {
        ctx.fillStyle = 'white';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        let alertText = bgTransitionTimer > 0 ? disneyBackgrounds[nextBgIndex].text : disneyBackgrounds[currentBgIndex].text;
        if (alertText) {
            ctx.fillText(alertText, canvas.width / 2, 100);
        }
        ctx.textAlign = 'left';
    }

    // Desenhar Plataformas
    platforms.forEach(p => p.draw(ctx, cameraY));

    // Desenhar Power-ups flutuando
    powerups.forEach(p => p.draw(ctx, cameraY));

    // Desengar Obstáculos
    obstacles.forEach(o => o.draw(ctx, cameraY));

    // Desenhar Mickey se não morreu
    if (!gameOver) {
        mickey.draw(ctx, cameraY);
    }

    // UI: HUD
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, 40);

    ctx.fillStyle = 'white';
    ctx.font = '20px monospace';
    ctx.fillText(`PONTOS: ${score} m`, 15, 27);

    const timeText = `TEMPO: ${elapsedTime}s`;
    let timeTextWidth = ctx.measureText(timeText).width;
    ctx.fillText(timeText, canvas.width - timeTextWidth - 15, 27);

    // Tela Menu de GameOver
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = '40px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("FIM DE JOGO!", canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = '24px monospace';
        ctx.fillText(`Caiu de uma altura de ${score} m`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText(`Sobreviveu por: ${elapsedTime} s`, canvas.width / 2, canvas.height / 2 + 50);

        ctx.fillStyle = '#ffff00';
        ctx.font = '18px monospace';
        ctx.fillText("Pressione ESPAÇO ou ENTER para tentar de novo", canvas.width / 2, canvas.height / 2 + 100);

        ctx.textAlign = 'left'; // resetar pro padrão pra n explodir o HUD
    }
}

// Iniciar o jogo
console.log("AntiGravity Engine iniciada.");
resetGame();
requestAnimationFrame(gameLoop);
