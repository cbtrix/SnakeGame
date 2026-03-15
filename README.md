# 🐍 Snake // Retro

Jogo Snake clássico com estética retrô pixel art e efeito CRT — feito com HTML, CSS e JavaScript puro.

## ✨ Funcionalidades

### Jogo
- Grid 20×20 com renderização em **Canvas**
- Sistema de **níveis**: a cobra acelera a cada 5 frutas comidas
- **Fruta bônus** (losango dourado) que aparece aleatoriamente e some após alguns ticks — vale 5× os pontos normais
- **Partículas de explosão** ao comer qualquer fruta
- **High score** salvo no `localStorage`
- Tela de Game Over com estatísticas: pontuação, nível, frutas comidas e recorde
- Destaque de **"Novo Recorde!"** quando o jogador bate o hi-score

### Dificuldades
| Modo | Velocidade base |
|------|----------------|
| Fácil | 180ms/frame |
| Normal | 120ms/frame |
| Difícil | 70ms/frame |
| Insano | 35ms/frame |

### Visual
- Efeito **CRT** com scanlines e animação de flicker
- Animação de **glitch** no título
- Grade estilo circuito impresso no fundo
- Cobra com olhos que acompanham a direção e padrão de escamas
- Glow verde fósforo em todos os elementos

### Sons (Web Audio API)
- Bip ao comer fruta
- Fanfara ao subir de nível
- Som descendente de derrota
> Sem arquivos externos — tudo gerado sinteticamente.

## 🕹️ Controles

| Ação | Teclado | Mobile |
|------|---------|--------|
| Mover | ↑ ↓ ← → ou WASD | D-pad na tela ou swipe |
| Pausar | `P` | Botão ⏸ |
| Confirmar (game over) | `Enter` ou `Espaço` | — |

## 🛠️ Tecnologias

- **HTML5** — estrutura de múltiplas telas (menu, jogo, game over)
- **CSS3** — animações CRT, glitch, variáveis CSS, fonte pixel art
- **JavaScript** — Canvas 2D, Web Audio API, localStorage, game loop com `setInterval`, detecção de touch/swipe

## 📁 Estrutura

```
snake/
├── index.html   # Telas do jogo (menu, HUD, game over)
├── style.css    # Tema verde fósforo e efeito CRT
└── script.js    # Engine completa do jogo
```

## 🚀 Como usar

1. Clone ou baixe os arquivos
2. Abra o `index.html` no navegador
3. Escolha a dificuldade e clique em **▶ INICIAR**

> Não requer servidor. Funciona 100% offline.

## 🎨 Design

Paleta verde fósforo sobre fundo quase preto, tipografia **Press Start 2P** (pixel art). Inspirado nos terminais de fósforo e arcades dos anos 80.

---

Feito com 👾 — projeto de portfólio frontend
