import { Chess } from "./vendor/chess.js";

export function createApp() {
  const content = document.createElement("div");
  content.className = "chess-app";

  const header = document.createElement("div");
  header.className = "chess-controls";

  const modeSelect = document.createElement("select");
  modeSelect.className = "menu-select";
  [
    { value: "cpu", label: "Vs Computer" },
    { value: "pvp", label: "Two Player" },
  ].forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    modeSelect.appendChild(option);
  });

  const levelSelect = document.createElement("select");
  levelSelect.className = "menu-select";
  [1, 2, 3, 4, 5].forEach((lvl) => {
    const option = document.createElement("option");
    option.value = String(lvl);
    option.textContent = `Level ${lvl}`;
    levelSelect.appendChild(option);
  });

  const themeSelect = document.createElement("select");
  themeSelect.className = "menu-select";
  [
    { value: "classic", label: "Classic" },
    { value: "neon", label: "Neon" },
    { value: "mono", label: "Mono" },
  ].forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    themeSelect.appendChild(option);
  });

  const timeToggle = document.createElement("label");
  timeToggle.className = "chess-toggle";
  const timeCheckbox = document.createElement("input");
  timeCheckbox.type = "checkbox";
  const timeLabel = document.createElement("span");
  timeLabel.textContent = "Timed";
  timeToggle.appendChild(timeCheckbox);
  timeToggle.appendChild(timeLabel);

  const timeSelect = document.createElement("select");
  timeSelect.className = "menu-select";
  [5, 10, 15].forEach((mins) => {
    const option = document.createElement("option");
    option.value = String(mins);
    option.textContent = `${mins} min`;
    timeSelect.appendChild(option);
  });

  const restartButton = document.createElement("button");
  restartButton.className = "menu-button";
  restartButton.textContent = "New Game";

  header.appendChild(modeSelect);
  header.appendChild(levelSelect);
  header.appendChild(themeSelect);
  header.appendChild(timeToggle);
  header.appendChild(timeSelect);
  header.appendChild(restartButton);

  const statusBar = document.createElement("div");
  statusBar.className = "chess-status";

  const board = document.createElement("div");
  board.className = "chess-board";

  const overlay = document.createElement("div");
  overlay.className = "chess-overlay";
  overlay.style.display = "none";

  const overlayCard = document.createElement("div");
  overlayCard.className = "chess-overlay-card";
  overlay.appendChild(overlayCard);

  content.appendChild(header);
  content.appendChild(statusBar);
  content.appendChild(board);
  content.appendChild(overlay);

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

  const pieceSvg = {
    p: `
      <circle cx="32" cy="20" r="7"/>
      <path d="M22 46c0-7 5-12 10-12s10 5 10 12v4H22z"/>
      <path d="M26 28l6 4 6-4-2 6H28z"/>
      <rect x="20" y="50" width="24" height="4" rx="2"/>
    `,
    r: `
      <rect x="18" y="12" width="28" height="8" rx="2"/>
      <rect x="22" y="20" width="20" height="6" rx="2"/>
      <rect x="20" y="26" width="24" height="18" rx="3"/>
      <rect x="18" y="44" width="28" height="8" rx="3"/>
      <rect x="22" y="10" width="4" height="6" rx="1"/>
      <rect x="30" y="10" width="4" height="6" rx="1"/>
      <rect x="38" y="10" width="4" height="6" rx="1"/>
    `,
    n: `
      <path d="M20 50h26v-6l-6-10 4-6-6-8-10-6-6 4v6l6 4-4 10 6 10-4 2z"/>
      <path d="M32 18l6 4-6 4-6-4z"/>
      <circle cx="36" cy="20" r="2"/>
      <path d="M28 26l4 6-6 8" />
      <rect x="18" y="50" width="28" height="4" rx="2"/>
    `,
    b: `
      <path d="M32 10l6 8-4 6 6 8-8 8 6 8v4H26v-4l6-8-8-8 6-8-4-6z"/>
      <circle cx="32" cy="18" r="3"/>
      <rect x="22" y="50" width="20" height="4" rx="2"/>
    `,
    q: `
      <circle cx="18" cy="20" r="3"/>
      <circle cx="30" cy="18" r="3"/>
      <circle cx="44" cy="20" r="3"/>
      <path d="M20 24l6-8 6 8 6-8 6 8-6 18H26z"/>
      <rect x="22" y="46" width="20" height="6" rx="3"/>
    `,
    k: `
      <path d="M30 10h4v6h6v4h-6v6h-4v-6h-6v-4h6z"/>
      <rect x="22" y="28" width="20" height="10" rx="3"/>
      <rect x="20" y="38" width="24" height="10" rx="3"/>
      <rect x="18" y="48" width="28" height="4" rx="2"/>
    `,
  };

  const state = {
    game: new Chess(),
    selected: null,
    legalMoves: [],
    mode: "cpu",
    level: 2,
    theme: "classic",
    timed: false,
    clocks: { w: 300, b: 300 },
    clockTimer: null,
    gameOver: false,
    awaitingPromotion: null,
    engine: null,
    engineReady: false,
    engineBusy: false,
  };

  const audio = new (window.AudioContext || window.webkitAudioContext)();
  const playTone = (freq, duration = 0.08) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  };

  const depthMap = [1, 2, 3, 4, 6];
  const eloMap = [600, 900, 1200, 1600, 2000];
  const moveTimeMap = [100, 200, 320, 550, 900];

  function indexToSquare(index) {
    const row = Math.floor(index / 8);
    const col = index % 8;
    return `${files[col]}${8 - row}`;
  }

  function squareToIndex(square) {
    const file = files.indexOf(square[0]);
    const rank = Number(square[1]);
    return (8 - rank) * 8 + file;
  }

  function setStatus(text) {
    statusBar.textContent = text;
  }

  function formatClock(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(0, seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function updateStatus() {
    if (state.gameOver) return;
    const side = state.game.turn() === "w" ? "White" : "Black";
    const check = state.game.isCheck();
    const suffix = check ? " — Check" : "";
    const clockText = state.timed ? ` | ${formatClock(state.clocks.w)} - ${formatClock(state.clocks.b)}` : "";
    setStatus(`${side} to move${suffix}${clockText}`);
  }

  function startClock() {
    stopClock();
    state.clockTimer = setInterval(() => {
      if (state.gameOver || !state.timed) return;
      const turn = state.game.turn();
      state.clocks[turn] = Math.max(0, state.clocks[turn] - 1);
      if (state.clocks[turn] === 0) {
        state.gameOver = true;
        setStatus(`${turn === "w" ? "White" : "Black"} ran out of time.`);
        showOverlay("Time", "Time expired.");
      }
      updateStatus();
    }, 1000);
  }

  function stopClock() {
    if (state.clockTimer) {
      clearInterval(state.clockTimer);
      state.clockTimer = null;
    }
  }

  function renderBoard() {
    board.innerHTML = "";
    board.dataset.theme = state.theme;
    const layout = state.game.board();
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const sq = document.createElement("button");
        sq.type = "button";
        sq.className = "chess-square";
        const index = r * 8 + c;
        const square = indexToSquare(index);
        sq.dataset.square = square;
        sq.classList.add((r + c) % 2 === 0 ? "light" : "dark");
        const piece = layout[r][c];
        if (piece) {
          const glyph = document.createElement("div");
          glyph.className = `chess-piece ${piece.color === "w" ? "white" : "black"}`;
          glyph.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${pieceSvg[piece.type]}</svg>`;
          sq.appendChild(glyph);
        }
        if (state.selected === square) {
          sq.classList.add("selected");
        }
        if (state.legalMoves.some((m) => m.to === square)) {
          sq.classList.add("legal");
        }
        sq.addEventListener("click", () => handleSquareClick(square));
        board.appendChild(sq);
      }
    }
  }

  function handleSquareClick(square) {
    if (state.gameOver || state.engineBusy) return;
    if (audio.state === "suspended") {
      audio.resume().catch(() => {});
    }
    if (state.selected) {
      const move = state.legalMoves.find((m) => m.to === square);
      if (move) {
        if (move.flags.includes("p")) {
          showPromotion(move.from, move.to);
          return;
        }
        applyMove(move.from, move.to);
        return;
      }
    }
    const piece = state.game.get(square);
    if (piece && piece.color === state.game.turn()) {
      state.selected = square;
      state.legalMoves = state.game.moves({ square, verbose: true });
      renderBoard();
      return;
    }
    state.selected = null;
    state.legalMoves = [];
    renderBoard();
  }

  function applyMove(from, to, promotion) {
    const move = state.game.move({ from, to, promotion });
    if (!move) return;
    state.selected = null;
    state.legalMoves = [];
    const capture = Boolean(move.captured);
    playTone(capture ? 220 : 520);
    checkGameEnd();
    renderBoard();
    updateStatus();
    if (state.mode === "cpu" && state.game.turn() === "b" && !state.gameOver) {
      requestEngineMove();
    }
  }

  function showPromotion(from, to) {
    overlayCard.innerHTML = "";
    overlay.style.display = "flex";
    overlayCard.innerHTML = `<div class="chess-overlay-title">Promote to:</div>`;
    const options = ["q", "r", "b", "n"].map((type) => {
      const btn = document.createElement("button");
      btn.className = "menu-button";
      btn.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${pieceSvg[type]}</svg>`;
      btn.addEventListener("click", () => {
        overlay.style.display = "none";
        applyMove(from, to, type);
      });
      return btn;
    });
    const grid = document.createElement("div");
    grid.className = "chess-promo-grid";
    options.forEach((btn) => grid.appendChild(btn));
    overlayCard.appendChild(grid);
  }

  function checkGameEnd() {
    if (!state.game.isGameOver()) return;
    state.gameOver = true;
    stopClock();
    if (state.game.isCheckmate()) {
      const winner = state.game.turn() === "w" ? "Black" : "White";
      showOverlay("Checkmate", `${winner} wins.`);
      return;
    }
    if (state.game.isStalemate()) {
      showOverlay("Stalemate", "Draw.");
      return;
    }
    if (state.game.isDraw()) {
      showOverlay("Draw", "Game drawn.");
    }
  }

  function showOverlay(title, body) {
    overlayCard.innerHTML = `
      <div class="chess-overlay-title">${title}</div>
      <div class="chess-overlay-body">${body}</div>
      <button class="menu-button" id="chess-restart">Start New Game</button>
    `;
    overlay.style.display = "flex";
    overlay.querySelector("#chess-restart").addEventListener("click", () => {
      overlay.style.display = "none";
      resetGame();
    });
  }

  function ensureEngine() {
    if (state.engine) return;
    const worker = new Worker("/apps/games/chess/engine/stockfish.js");
    state.engine = worker;
    worker.onmessage = (event) => {
      const line = String(event.data || "").trim();
      if (line === "uciok") {
        state.engine.postMessage("isready");
      } else if (line === "readyok") {
        state.engineReady = true;
        updateEngineLevel();
      } else if (line.startsWith("bestmove")) {
        state.engineBusy = false;
        const parts = line.split(" ");
        const move = parts[1];
        if (move && move !== "(none)" && !state.gameOver) {
          const from = move.slice(0, 2);
          const to = move.slice(2, 4);
          const promo = move.length > 4 ? move[4] : undefined;
          applyMove(from, to, promo);
        }
      }
    };
    worker.postMessage("uci");
  }

  function updateEngineLevel() {
    if (!state.engineReady || !state.engine) return;
    const levelIndex = Math.max(0, Math.min(4, state.level - 1));
    const skill = levelIndex * 5;
    const elo = eloMap[levelIndex];
    state.engine.postMessage(`setoption name Skill Level value ${skill}`);
    state.engine.postMessage(`setoption name UCI_LimitStrength value true`);
    state.engine.postMessage(`setoption name UCI_Elo value ${elo}`);
  }

  function requestEngineMove() {
    if (state.engineBusy || state.gameOver) return;
    ensureEngine();
    if (!state.engineReady) {
      setTimeout(requestEngineMove, 100);
      return;
    }
    const levelIndex = Math.max(0, Math.min(4, state.level - 1));
    if (levelIndex === 0 && Math.random() < 0.35) {
      const moves = state.game.moves({ verbose: true });
      if (moves.length) {
        const pick = moves[Math.floor(Math.random() * moves.length)];
        applyMove(pick.from, pick.to, pick.promotion);
        return;
      }
    }
    state.engineBusy = true;
    state.engine.postMessage("ucinewgame");
    state.engine.postMessage(`position fen ${state.game.fen()}`);
    const depth = depthMap[levelIndex] || 2;
    const moveTime = moveTimeMap[levelIndex] || 300;
    state.engine.postMessage(`go depth ${depth} movetime ${moveTime}`);
  }

  function resetGame() {
    state.game = new Chess();
    state.selected = null;
    state.legalMoves = [];
    state.gameOver = false;
    state.engineBusy = false;
    const base = Number(timeSelect.value) * 60;
    state.clocks = { w: base, b: base };
    overlay.style.display = "none";
    renderBoard();
    updateStatus();
    stopClock();
    if (state.timed) startClock();
    if (state.mode === "cpu" && state.game.turn() === "b") {
      requestEngineMove();
    }
  }

  modeSelect.addEventListener("change", () => {
    state.mode = modeSelect.value;
    resetGame();
  });

  levelSelect.addEventListener("change", () => {
    state.level = Number(levelSelect.value);
    updateEngineLevel();
  });

  themeSelect.addEventListener("change", () => {
    state.theme = themeSelect.value;
    renderBoard();
  });

  timeCheckbox.addEventListener("change", () => {
    state.timed = timeCheckbox.checked;
    resetGame();
  });

  timeSelect.addEventListener("change", () => {
    if (state.timed) resetGame();
  });

  restartButton.addEventListener("click", () => {
    resetGame();
  });

  state.mode = modeSelect.value;
  state.level = Number(levelSelect.value);
  state.theme = themeSelect.value;
  state.timed = timeCheckbox.checked;

  resetGame();

  return {
    title: "Chess",
    width: 820,
    height: 820,
    content,
  };
}
