export function createApp() {
  const content = document.createElement("div");
  content.className = "checkers-app";

  const header = document.createElement("div");
  header.className = "checkers-controls";

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

  const forceJumpToggle = document.createElement("label");
  forceJumpToggle.className = "checkers-toggle";
  const forceJumpCheckbox = document.createElement("input");
  forceJumpCheckbox.type = "checkbox";
  forceJumpCheckbox.checked = true;
  const forceJumpLabel = document.createElement("span");
  forceJumpLabel.textContent = "Force Jumps";
  forceJumpToggle.appendChild(forceJumpCheckbox);
  forceJumpToggle.appendChild(forceJumpLabel);

  const restartButton = document.createElement("button");
  restartButton.className = "menu-button";
  restartButton.textContent = "New Game";

  header.appendChild(modeSelect);
  header.appendChild(levelSelect);
  header.appendChild(themeSelect);
  header.appendChild(forceJumpToggle);
  header.appendChild(restartButton);

  const statusBar = document.createElement("div");
  statusBar.className = "checkers-status";

  const board = document.createElement("div");
  board.className = "checkers-board";

  const overlay = document.createElement("div");
  overlay.className = "checkers-overlay";
  overlay.style.display = "none";
  const overlayCard = document.createElement("div");
  overlayCard.className = "checkers-overlay-card";
  overlay.appendChild(overlayCard);

  content.appendChild(header);
  content.appendChild(statusBar);
  content.appendChild(board);
  content.appendChild(overlay);

  const state = {
    board: [],
    turn: "r",
    selected: null,
    legalMoves: [],
    mode: "cpu",
    level: 2,
    theme: "classic",
    gameOver: false,
    mustJump: false,
    forceJumps: true,
    simulating: false,
  };

  const depthMap = [1, 2, 3, 4, 6];

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

  function setStatus(text) {
    statusBar.textContent = text;
  }

  function initBoard() {
    state.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        if ((r + c) % 2 === 1) state.board[r][c] = { color: "b", king: false };
      }
    }
    for (let r = 5; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        if ((r + c) % 2 === 1) state.board[r][c] = { color: "r", king: false };
      }
    }
  }

  function resetGame() {
    initBoard();
    state.turn = "r";
    state.selected = null;
    state.legalMoves = [];
    state.gameOver = false;
    state.mustJump = false;
    overlay.style.display = "none";
    renderBoard();
    updateStatus();
  }

  function updateStatus() {
    if (state.gameOver) return;
    const side = state.turn === "r" ? "Red" : "Black";
    setStatus(`${side} to move`);
  }

  function renderBoard() {
    board.innerHTML = "";
    board.dataset.theme = state.theme;
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "checkers-square";
        cell.classList.add((r + c) % 2 === 0 ? "light" : "dark");
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);

        const piece = state.board[r][c];
        if (piece) {
          const token = document.createElement("div");
          token.className = `checkers-piece ${piece.color === "r" ? "red" : "black"}`;
          if (piece.king) {
            token.classList.add("king");
            const crown = document.createElement("span");
            crown.className = "checkers-king";
            crown.textContent = "K";
            token.appendChild(crown);
          }
          cell.appendChild(token);
        }

        if (state.selected && state.selected.r === r && state.selected.c === c) {
          cell.classList.add("selected");
        }
        if (state.legalMoves.some((m) => m.to.r === r && m.to.c === c)) {
          cell.classList.add("legal");
        }

        cell.addEventListener("click", () => handleSquareClick(r, c));
        board.appendChild(cell);
      }
    }
  }

  function handleSquareClick(r, c) {
    if (state.gameOver) return;
    if (audio.state === "suspended") {
      audio.resume().catch(() => {});
    }

    if (state.selected) {
      const move = state.legalMoves.find((m) => m.to.r === r && m.to.c === c);
      if (move) {
        applyMove(move);
        return;
      }
    }

    const piece = state.board[r][c];
    if (piece && piece.color === state.turn) {
      state.selected = { r, c };
      state.legalMoves = getLegalMovesFor(r, c);
      renderBoard();
      return;
    }

    state.selected = null;
    state.legalMoves = [];
    renderBoard();
  }

  function getLegalMovesFor(r, c) {
    const piece = state.board[r][c];
    if (!piece) return [];
    const moves = generateMoves(piece.color);
    if (state.mustJump && state.forceJumps) {
      return moves.filter((m) => m.from.r === r && m.from.c === c && m.capture);
    }
    return moves.filter((m) => m.from.r === r && m.from.c === c);
  }

  function generateMoves(color) {
    const moves = [];
    const captures = [];
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const piece = state.board[r][c];
        if (!piece || piece.color !== color) continue;
        const dirs = getDirections(piece);
        dirs.forEach(([dr, dc]) => {
          const r1 = r + dr;
          const c1 = c + dc;
          const r2 = r + dr * 2;
          const c2 = c + dc * 2;
          if (inBounds(r1, c1) && !state.board[r1][c1]) {
            moves.push({ from: { r, c }, to: { r: r1, c: c1 }, capture: null });
          }
          if (inBounds(r2, c2) && state.board[r1]?.[c1] && state.board[r1][c1].color !== color && !state.board[r2][c2]) {
            captures.push({
              from: { r, c },
              to: { r: r2, c: c2 },
              capture: { r: r1, c: c1 },
            });
          }
        });
      }
    }
    return state.forceJumps && captures.length ? captures : moves;
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function getDirections(piece) {
    if (piece.king) {
      return [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];
    }
    return piece.color === "r" ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]];
  }

  function applyMove(move) {
    const piece = state.board[move.from.r][move.from.c];
    state.board[move.from.r][move.from.c] = null;
    state.board[move.to.r][move.to.c] = piece;
    if (move.capture) {
      state.board[move.capture.r][move.capture.c] = null;
    }

    if (piece.color === "r" && move.to.r === 0) piece.king = true;
    if (piece.color === "b" && move.to.r === 7) piece.king = true;

    const wasCapture = Boolean(move.capture);
    if (!state.simulating) playTone(wasCapture ? 220 : 520);

    state.selected = null;
    state.legalMoves = [];

    if (wasCapture && state.forceJumps) {
      const followUps = generateMoves(piece.color).filter((m) => m.capture && m.from.r === move.to.r && m.from.c === move.to.c);
      if (followUps.length) {
        state.selected = { r: move.to.r, c: move.to.c };
        state.legalMoves = followUps;
        state.mustJump = true;
        renderBoard();
        if (!state.simulating && state.mode === "cpu" && state.turn === "b") {
          setTimeout(() => cpuContinueJump(), 200);
        }
        return;
      }
    }

    state.mustJump = false;
    state.turn = state.turn === "r" ? "b" : "r";
    checkGameEnd();
    renderBoard();
    updateStatus();

    if (state.mode === "cpu" && state.turn === "b" && !state.gameOver) {
      setTimeout(cpuMove, 120);
    }
  }

  function checkGameEnd() {
    const moves = generateMoves(state.turn);
    if (!moves.length) {
      state.gameOver = true;
      const winner = state.turn === "r" ? "Black" : "Red";
      showOverlay("Game Over", `${winner} wins.`);
    }
  }

  function showOverlay(title, body) {
    overlayCard.innerHTML = `
      <div class="checkers-overlay-title">${title}</div>
      <div class="checkers-overlay-body">${body}</div>
      <button class="menu-button" id="checkers-restart">Start New Game</button>
    `;
    overlay.style.display = "flex";
    overlay.querySelector("#checkers-restart").addEventListener("click", () => {
      overlay.style.display = "none";
      resetGame();
    });
  }

  function evaluateBoard(color) {
    let score = 0;
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const piece = state.board[r][c];
        if (!piece) continue;
        const value = piece.king ? 3 : 1;
        score += piece.color === color ? value : -value;
      }
    }
    return score;
  }

  function cloneState() {
    return state.board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
  }

  function restoreState(snapshot) {
    state.board = snapshot.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
  }

  function minimax(depth, maximizing, color) {
    if (depth === 0) return { score: evaluateBoard(color) };
    const moves = generateMoves(maximizing ? color : color === "r" ? "b" : "r");
    if (!moves.length) return { score: evaluateBoard(color) };
    let bestMove = null;
    let bestScore = maximizing ? -Infinity : Infinity;
    for (const move of moves) {
      const snapshot = cloneState();
      const prevTurn = state.turn;
      const prevMust = state.mustJump;
      state.turn = maximizing ? color : color === "r" ? "b" : "r";
      state.mustJump = false;
      state.simulating = true;
      applyMove({ ...move });
      state.simulating = false;
      const result = minimax(depth - 1, !maximizing, color);
      restoreState(snapshot);
      state.turn = prevTurn;
      state.mustJump = prevMust;
      if (maximizing) {
        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
      } else {
        if (result.score < bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
      }
    }
    return { score: bestScore, move: bestMove };
  }

  function cpuMove() {
    const depth = depthMap[state.level - 1] || 2;
    const result = minimax(depth, true, "b");
    if (result.move) applyMove(result.move);
  }

  function cpuContinueJump() {
    if (!state.mustJump || state.turn !== "b" || !state.legalMoves.length) return;
    const move = state.legalMoves[Math.floor(Math.random() * state.legalMoves.length)];
    applyMove(move);
  }

  modeSelect.addEventListener("change", () => {
    state.mode = modeSelect.value;
    resetGame();
  });

  levelSelect.addEventListener("change", () => {
    state.level = Number(levelSelect.value);
  });

  themeSelect.addEventListener("change", () => {
    state.theme = themeSelect.value;
    renderBoard();
  });

  forceJumpCheckbox.addEventListener("change", () => {
    state.forceJumps = forceJumpCheckbox.checked;
    state.mustJump = false;
    state.selected = null;
    state.legalMoves = [];
    renderBoard();
  });

  restartButton.addEventListener("click", () => {
    resetGame();
  });

  state.mode = modeSelect.value;
  state.level = Number(levelSelect.value);
  state.theme = themeSelect.value;
  state.forceJumps = forceJumpCheckbox.checked;

  resetGame();

  return {
    title: "Checkers",
    width: 720,
    height: 720,
    content,
  };
}
