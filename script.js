// =============================================
// CONFIGURAÇÕES
// =============================================

const GRID_SIZE  = 20;  // células no eixo X e Y
const CELL       = 20;  // pixels por célula

// Velocidade (ms por frame) por dificuldade
const SPEEDS = {
  easy:   180,
  normal: 120,
  hard:   70,
  insane: 35,
};

// Pontos base por fruta por dificuldade
const POINTS = {
  easy:   10,
  normal: 20,
  hard:   40,
  insane: 80,
};

// Cores para o canvas (verde fosforescente retrô)
const COLORS = {
  bg:         '#010b02',
  grid:       '#001a04',
  snakeHead:  '#00ff41',
  snakeBody:  '#00c032',
  snakeDark:  '#008020',
  food:       '#ff2244',
  foodGlow:   '#ff224488',
  bonus:      '#ffb800',
  bonusGlow:  '#ffb80088',
  text:       '#00ff41',
  particle:   '#00ff41',
};


// =============================================
// ESTADO GLOBAL DO JOGO
// =============================================
let canvas, ctx;
let gameLoop   = null;    // referência ao setInterval
let state      = 'menu';  // 'menu' | 'playing' | 'paused' | 'gameover'
let difficulty = 'easy';

// Dados da partida atual
let snake, dir, nextDir, food, bonusFood;
let score, level, eaten, bonusTimer;
let particles = [];       // partículas de explosão

// High score salvo
let hiScore = parseInt(localStorage.getItem('snake_hiscore') || '0');


// =============================================
// INICIALIZAÇÃO
// =============================================
window.addEventListener('load', () => {
  canvas = document.getElementById('game-canvas');
  ctx    = canvas.getContext('2d');

  // Canvas quadrado baseado no grid
  canvas.width  = GRID_SIZE * CELL;
  canvas.height = GRID_SIZE * CELL;

  updateHiScoreDisplay();
  document.getElementById('menu-hiscore').textContent = pad(hiScore, 6);
});

// Atualiza todos os elementos que mostram o hi-score
function updateHiScoreDisplay() {
  ['hud-hiscore', 'go-hiscore', 'menu-hiscore'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = pad(hiScore, 6);
  });
}


// =============================================
// NAVEGAÇÃO ENTRE TELAS
// =============================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById('screen-' + id);
  el.style.display = 'flex';
  // Força reflow para a animação funcionar
  el.offsetHeight;
  el.classList.add('active');
}

function goMenu() {
  clearInterval(gameLoop);
  gameLoop = null;
  state    = 'menu';
  document.getElementById('menu-hiscore').textContent = pad(hiScore, 6);
  showScreen('menu');
}


// =============================================
// SELETOR DE DIFICULDADE
// =============================================
function selectDiff(diff, btn) {
  difficulty = diff;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}


// =============================================
// INICIAR / REINICIAR PARTIDA
// =============================================
function startGame() {
  clearInterval(gameLoop);
  gameLoop = null;

  // Cobra começa no centro, apontando para a direita
  const mid = Math.floor(GRID_SIZE / 2);
  snake    = [
    { x: mid,     y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];

  dir      = { x: 1, y: 0 };  // direita
  nextDir  = { x: 1, y: 0 };
  score    = 0;
  level    = 1;
  eaten    = 0;
  bonusFood  = null;
  bonusTimer = 0;
  particles  = [];

  spawnFood();
  updateHUD();
  showScreen('game');
  document.getElementById('pause-overlay').style.display = 'none';
  state = 'playing';

  gameLoop = setInterval(tick, SPEEDS[difficulty]);
}


// =============================================
// LOOP PRINCIPAL DO JOGO
// =============================================
function tick() {
  if (state !== 'playing') return;

  // Aplica a próxima direção
  dir = { ...nextDir };

  // Nova posição da cabeça
  const head = {
    x: snake[0].x + dir.x,
    y: snake[0].y + dir.y,
  };

  // Verifica colisão com parede
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    return gameOver();
  }

  // Verifica colisão com o próprio corpo (ignora a cauda que vai sair)
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return gameOver();
  }

  // Adiciona nova cabeça
  snake.unshift(head);

  // Verificar se comeu a fruta normal
  if (head.x === food.x && head.y === food.y) {
    eatFood(false);
  }
  // Verificar se comeu a fruta bônus
  else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
    eatFood(true);
  }
  else {
    snake.pop(); // remove a cauda (cobra não cresce)
  }

  // Temporizador da fruta bônus
  if (bonusFood) {
    bonusTimer--;
    if (bonusTimer <= 0) bonusFood = null;
  }

  // Spawn aleatório de fruta bônus (5% de chance por tick se não existir)
  if (!bonusFood && Math.random() < 0.005) {
    spawnBonusFood();
  }

  // Atualiza partículas
  particles = particles
    .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1, vy: p.vy + 0.3 }))
    .filter(p => p.life > 0);

  drawFrame();
  updateHUD();
}


// =============================================
// COMER FRUTA
// =============================================
function eatFood(isBonus) {
  eaten++;

  // Pontos extras por nível e dificuldade
  const pts = isBonus
    ? POINTS[difficulty] * 5
    : POINTS[difficulty] * level;

  score += pts;

  // Sobe de nível a cada 5 frutas
  if (eaten % 5 === 0) {
    level++;
    // Aumenta a velocidade a cada nível (até o limite)
    clearInterval(gameLoop);
    const newSpeed = Math.max(SPEEDS[difficulty] - (level - 1) * 8, 20);
    gameLoop = setInterval(tick, newSpeed);
    playSound('levelup');
  } else {
    playSound('eat');
  }

  // Spawn de partículas no local da fruta
  spawnParticles(
    isBonus ? bonusFood.x : food.x,
    isBonus ? bonusFood.y : food.y,
    isBonus ? COLORS.bonus : COLORS.food
  );

  if (isBonus) {
    bonusFood = null;
  } else {
    spawnFood();
  }

  // Atualiza hi-score em tempo real
  if (score > hiScore) {
    hiScore = score;
    localStorage.setItem('snake_hiscore', hiScore);
    updateHiScoreDisplay();
  }
}


// =============================================
// SPAWN DE FRUTAS
// =============================================
function spawnFood() {
  food = randomEmptyCell();
}

function spawnBonusFood() {
  bonusFood  = randomEmptyCell();
  bonusTimer = 60; // dura 60 ticks
}

// Retorna uma célula aleatória que não está ocupada pela cobra
function randomEmptyCell() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}


// =============================================
// PARTÍCULAS DE EXPLOSÃO
// =============================================
function spawnParticles(gx, gy, color) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * (Math.random() * 3 + 1),
      vy: Math.sin(angle) * (Math.random() * 3 + 1) - 2,
      life: 20 + Math.random() * 10,
      color,
      r: Math.random() * 3 + 1,
    });
  }
}


// =============================================
// RENDERIZAÇÃO
// =============================================
function drawFrame() {
  const W = canvas.width;
  const H = canvas.height;

  // Fundo
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Grid sutil
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth   = 0.5;
  for (let x = 0; x <= GRID_SIZE; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, H);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_SIZE; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(W, y * CELL);
    ctx.stroke();
  }

  // Fruta bônus (piscante)
  if (bonusFood) {
    const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
    ctx.shadowColor = COLORS.bonusGlow;
    ctx.shadowBlur  = 12 + pulse * 8;
    ctx.fillStyle   = COLORS.bonus;
    // Desenhada como losango
    const bx = bonusFood.x * CELL + CELL / 2;
    const by = bonusFood.y * CELL + CELL / 2;
    const r  = CELL / 2 - 2;
    ctx.beginPath();
    ctx.moveTo(bx,     by - r);
    ctx.lineTo(bx + r, by);
    ctx.lineTo(bx,     by + r);
    ctx.lineTo(bx - r, by);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Fruta normal (quadrado com brilho)
  ctx.shadowColor = COLORS.foodGlow;
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = COLORS.food;
  ctx.fillRect(
    food.x * CELL + 2,
    food.y * CELL + 2,
    CELL - 4,
    CELL - 4
  );
  ctx.shadowBlur = 0;

  // Corpo da cobra (do fim para o início, cabeça por cima)
  for (let i = snake.length - 1; i >= 0; i--) {
    const seg = snake[i];
    const isHead = i === 0;

    // Gradiente de cor do corpo (mais escuro na cauda)
    const t = i / snake.length;
    ctx.fillStyle = isHead
      ? COLORS.snakeHead
      : i % 2 === 0 ? COLORS.snakeBody : COLORS.snakeDark;

    if (isHead) {
      ctx.shadowColor = '#00ff41aa';
      ctx.shadowBlur  = 12;
    } else {
      ctx.shadowBlur = 0;
    }

    const margin = isHead ? 1 : 2;
    ctx.fillRect(
      seg.x * CELL + margin,
      seg.y * CELL + margin,
      CELL - margin * 2,
      CELL - margin * 2
    );

    // Detalhe de "escama" no corpo
    if (!isHead && i % 2 === 0) {
      ctx.fillStyle = 'rgba(0,255,65,0.15)';
      ctx.fillRect(
        seg.x * CELL + 5,
        seg.y * CELL + 5,
        CELL - 10,
        CELL - 10
      );
    }

    // Olhos na cabeça
    if (isHead) {
      ctx.shadowBlur = 0;
      ctx.fillStyle  = COLORS.bg;
      const eyeSize  = 3;
      // Posição dos olhos depende da direção
      const ex1 = seg.x * CELL + (dir.x === -1 ? 3 : dir.x === 1 ? CELL - 7 : 4);
      const ey1 = seg.y * CELL + (dir.y === -1 ? 3 : dir.y === 1 ? CELL - 7 : 4);
      const ex2 = seg.x * CELL + (dir.x === -1 ? 3 : dir.x === 1 ? CELL - 7 : CELL - 7);
      const ey2 = seg.y * CELL + (dir.y === -1 ? 3 : dir.y === 1 ? CELL - 7 : dir.y === 0 ? 4 : CELL - 7);
      ctx.fillRect(ex1, ey1, eyeSize, eyeSize);
      ctx.fillRect(ex2, ey2, eyeSize, eyeSize);
    }
  }

  ctx.shadowBlur = 0;

  // Partículas
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
}


// =============================================
// HUD
// =============================================
function updateHUD() {
  document.getElementById('hud-score').textContent   = pad(score, 6);
  document.getElementById('hud-level').textContent   = pad(level, 2);
  document.getElementById('hud-hiscore').textContent = pad(hiScore, 6);
}


// =============================================
// GAME OVER
// =============================================
function gameOver() {
  clearInterval(gameLoop);
  gameLoop = null;
  state    = 'gameover';

  playSound('die');

  const isNewRecord = score >= hiScore && score > 0;
  if (isNewRecord) {
    hiScore = score;
    localStorage.setItem('snake_hiscore', hiScore);
  }

  updateHiScoreDisplay();

  document.getElementById('go-score').textContent  = pad(score, 6);
  document.getElementById('go-level').textContent  = pad(level, 2);
  document.getElementById('go-eaten').textContent  = pad(eaten, 2);
  document.getElementById('go-hiscore').textContent = pad(hiScore, 6);
  document.getElementById('go-title').textContent  = eaten === 0 ? 'MORREU LOGO...' : 'GAME OVER';

  const rec = document.getElementById('new-record-msg');
  rec.style.display = isNewRecord ? 'block' : 'none';

  showScreen('gameover');
}


// =============================================
// PAUSA
// =============================================
function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    clearInterval(gameLoop);
    gameLoop = null;
    document.getElementById('pause-overlay').style.display = 'flex';
  } else if (state === 'paused') {
    state    = 'playing';
    document.getElementById('pause-overlay').style.display = 'none';
    gameLoop = setInterval(tick, Math.max(SPEEDS[difficulty] - (level - 1) * 8, 20));
  }
}


// =============================================
// CONTROLES — TECLADO
// =============================================
document.addEventListener('keydown', e => {
  const key = e.key;

  // Evita scroll da página com as setas
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(key)) {
    e.preventDefault();
  }

  if (state === 'gameover') {
    if (key === 'Enter' || key === ' ') startGame();
    return;
  }

  if (key === 'p' || key === 'P') { togglePause(); return; }

  if (state !== 'playing') return;

  // Muda direção — impede inversão (não pode voltar sobre si)
  if ((key === 'ArrowUp'    || key === 'w' || key === 'W') && dir.y !== 1)
    nextDir = { x: 0, y: -1 };
  if ((key === 'ArrowDown'  || key === 's' || key === 'S') && dir.y !== -1)
    nextDir = { x: 0, y: 1 };
  if ((key === 'ArrowLeft'  || key === 'a' || key === 'A') && dir.x !== 1)
    nextDir = { x: -1, y: 0 };
  if ((key === 'ArrowRight' || key === 'd' || key === 'D') && dir.x !== -1)
    nextDir = { x: 1, y: 0 };
});


// =============================================
// CONTROLES — MOBILE (D-PAD)
// =============================================
function mobileDir(d) {
  if (state !== 'playing') return;
  if (d === 'UP'    && dir.y !== 1)  nextDir = { x: 0,  y: -1 };
  if (d === 'DOWN'  && dir.y !== -1) nextDir = { x: 0,  y: 1  };
  if (d === 'LEFT'  && dir.x !== 1)  nextDir = { x: -1, y: 0  };
  if (d === 'RIGHT' && dir.x !== -1) nextDir = { x: 1,  y: 0  };
}

// Swipe touch para mobile
let touchStart = null;

document.addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

document.addEventListener('touchend', e => {
  if (!touchStart || state !== 'playing') return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && dir.x !== -1) nextDir = { x: 1,  y: 0 };
    if (dx < 0 && dir.x !== 1)  nextDir = { x: -1, y: 0 };
  } else {
    if (dy > 0 && dir.y !== -1) nextDir = { x: 0,  y: 1  };
    if (dy < 0 && dir.y !== 1)  nextDir = { x: 0,  y: -1 };
  }
  touchStart = null;
}, { passive: true });


// =============================================
// SOM SINTÉTICO (Web Audio API)
// =============================================
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  try {
    const ac  = getAudioCtx();
    const osc = ac.createOscillator();
    const gain= ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    const now = ac.currentTime;

    if (type === 'eat') {
      // Bip curto ascendente
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
    }
    else if (type === 'levelup') {
      // Fanfara rápida
      osc.type = 'square';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(440, now + 0.05);
      osc.frequency.setValueAtTime(550, now + 0.1);
      osc.frequency.setValueAtTime(660, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
    }
    else if (type === 'die') {
      // Som descendente de derrota
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.5);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now); osc.stop(now + 0.5);
    }
  } catch(e) {
    // Silencia se áudio não for suportado
  }
}


// =============================================
// HELPER — padding com zeros
// =============================================
function pad(num, len) {
  return String(num).padStart(len, '0');
}