import { createGameSurface, startLoop } from "../shared/gameUtils.js";

export function createApp() {
  const controller = new AbortController();
  const { signal } = controller;

  const wrapper = document.createElement("div");
  wrapper.style.display = "grid";
  wrapper.style.gridTemplateRows = "auto 1fr";
  wrapper.style.gap = "10px";
  wrapper.style.height = "100%";

  const toolbar = document.createElement("div");
  toolbar.className = "game-toolbar";

  const modeSelect = document.createElement("select");
  modeSelect.className = "menu-select";
  ["Two Player", "Vs Computer"].forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    modeSelect.appendChild(option);
  });
  modeSelect.value = "Vs Computer";

  const difficultySelect = document.createElement("select");
  difficultySelect.className = "menu-select";
  [
    { label: "Easy", depth: 1 },
    { label: "Normal", depth: 3 },
    { label: "Hard", depth: 5 },
  ].forEach((entry) => {
    const option = document.createElement("option");
    option.value = String(entry.depth);
    option.textContent = entry.label;
    difficultySelect.appendChild(option);
  });

  const resetButton = document.createElement("button");
  resetButton.className = "menu-button";
  resetButton.textContent = "Reset";

  const status = document.createElement("div");
  status.className = "game-status";

  toolbar.append(modeSelect, difficultySelect, resetButton, status);
  wrapper.appendChild(toolbar);

  const { content, canvas, ctx, view, resizeObserver, clear } = createGameSurface({
    baseWidth: 560,
    baseHeight: 420,
  });
  wrapper.appendChild(content);

  const rows = 6;
  const cols = 7;
  let maskCanvas = null;
  let maskCtx = null;
  const board = Array.from({ length: rows }, () => Array(cols).fill(0));
  let currentPlayer = 1;
  let winner = 0;
  let winningCells = [];
  let selectedCol = 3;
  let aiThinking = false;
  let fallingPieces = [];

  const resetGame = () => {
    board.forEach((row) => row.fill(0));
    currentPlayer = 1;
    winner = 0;
    winningCells = [];
    selectedCol = 3;
    aiThinking = false;
    fallingPieces = [];
    updateStatus();
  };

  const updateStatus = () => {
    if (winner) {
      status.textContent = winner === 3 ? "Draw" : `Player ${winner} wins`;
    } else {
      status.textContent = `Player ${currentPlayer}${isCPU() && currentPlayer === 2 ? " (CPU)" : ""}`;
    }
  };

  const isCPU = () => modeSelect.value === "Vs Computer";

  const getValidRow = (col) => {
    for (let r = rows - 1; r >= 0; r -= 1) {
      if (board[r][col] === 0) return r;
    }
    return -1;
  };

  const dropPiece = (col, player, animate = true) => {
    const row = getValidRow(col);
    if (row < 0) return false;
    board[row][col] = player;
    if (animate) {
      fallingPieces.push({
        col,
        row,
        player,
        y: 20,
        targetY: 40 + row * 60 + 30,
        speed: 520,
      });
    }
    return true;
  };

  const detectWinner = () => {
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const player = board[r][c];
        if (!player) continue;
        for (const [dr, dc] of directions) {
          const cells = [[r, c]];
          for (let i = 1; i < 4; i += 1) {
            const nr = r + dr * i;
            const nc = c + dc * i;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break;
            if (board[nr][nc] !== player) break;
            cells.push([nr, nc]);
          }
          if (cells.length === 4) {
            return { winner: player, cells };
          }
        }
      }
    }
    if (board.flat().every((cell) => cell !== 0)) {
      return { winner: 3, cells: [] };
    }
    return { winner: 0, cells: [] };
  };

  const checkWin = () => {
    const result = detectWinner();
    winner = result.winner;
    winningCells = result.cells;
  };

  const evaluateLine = (line, player) => {
    const opponent = player === 1 ? 2 : 1;
    const countPlayer = line.filter((v) => v === player).length;
    const countOpp = line.filter((v) => v === opponent).length;
    if (countOpp > 0 && countPlayer > 0) return 0;
    if (countPlayer === 4) return 1000;
    if (countPlayer === 3) return 50;
    if (countPlayer === 2) return 10;
    if (countOpp === 3) return -40;
    if (countOpp === 4) return -900;
    return 0;
  };

  const scoreBoard = (player) => {
    let score = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const lines = [
          [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]],
          [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]],
          [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]],
          [[r, c], [r + 1, c - 1], [r + 2, c - 2], [r + 3, c - 3]],
        ];
        lines.forEach((line) => {
          if (line.some(([rr, cc]) => rr < 0 || rr >= rows || cc < 0 || cc >= cols)) return;
          const values = line.map(([rr, cc]) => board[rr][cc]);
          score += evaluateLine(values, player);
        });
      }
    }
    return score;
  };

  const getValidCols = () => Array.from({ length: cols }, (_, i) => i).filter((c) => getValidRow(c) >= 0);

  const minimax = (depth, maximizing, player) => {
    const valid = getValidCols();
    const result = detectWinner();
    if (result.winner === player) return { score: 10000 };
    if (result.winner && result.winner !== 3) return { score: -10000 };
    if (result.winner === 3 || depth === 0 || valid.length === 0) {
      return { score: scoreBoard(player) };
    }

    let best = { score: maximizing ? -Infinity : Infinity, col: valid[0] };
    for (const col of valid) {
      const row = getValidRow(col);
      board[row][col] = maximizing ? player : player === 1 ? 2 : 1;
      const result = minimax(depth - 1, !maximizing, player);
      board[row][col] = 0;
      if (maximizing) {
        if (result.score > best.score) best = { score: result.score, col };
      } else if (result.score < best.score) {
        best = { score: result.score, col };
      }
    }
    return best;
  };

  const aiMove = () => {
    if (!isCPU() || winner) return;
    aiThinking = true;
    const depth = Number(difficultySelect.value);
    const easyMode = depth <= 2;
    if (easyMode && Math.random() < 0.35) {
      const valid = getValidCols();
      const choiceCol = valid[Math.floor(Math.random() * valid.length)];
      if (dropPiece(choiceCol, 2)) {
        checkWin();
        currentPlayer = 1;
        updateStatus();
      }
      aiThinking = false;
      return;
    }
    const choice = minimax(depth, true, 2);
    if (dropPiece(choice.col, 2)) {
      checkWin();
      currentPlayer = 1;
      updateStatus();
    }
    aiThinking = false;
  };

  const handleMove = (col) => {
    if (winner || aiThinking) return;
    if (!dropPiece(col, currentPlayer)) return;
    checkWin();
    if (!winner) {
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      updateStatus();
      if (isCPU() && currentPlayer === 2) {
        setTimeout(aiMove, 650);
      }
    } else {
      updateStatus();
    }
  };

  canvas.addEventListener("click", (event) => {
    if (winner || aiThinking) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (view.baseWidth / rect.width);
    const col = Math.floor((x - 40) / 70);
    if (col >= 0 && col < cols) {
      handleMove(col);
    }
  }, { signal });

  document.addEventListener("keydown", (event) => {
    if (winner || aiThinking) return;
    if (event.key === "ArrowLeft") {
      selectedCol = Math.max(0, selectedCol - 1);
    } else if (event.key === "ArrowRight") {
      selectedCol = Math.min(cols - 1, selectedCol + 1);
    } else if (event.key === "Enter" || event.key === " ") {
      handleMove(selectedCol);
    }
  }, { signal });

  resetButton.addEventListener("click", resetGame, { signal });
  modeSelect.addEventListener("change", resetGame, { signal });
  difficultySelect.addEventListener("change", () => {
    if (isCPU() && currentPlayer === 2) aiMove();
  }, { signal });

  const updateFalling = (dt) => {
    fallingPieces.forEach((piece) => {
      piece.y += piece.speed * dt;
      if (piece.y >= piece.targetY) {
        piece.y = piece.targetY;
        piece.done = true;
      }
    });
    fallingPieces = fallingPieces.filter((piece) => !piece.done);
  };

  const draw = () => {
    clear();
    ctx.fillStyle = "#0f1720";
    ctx.fillRect(0, 0, view.baseWidth, view.baseHeight);

    const boardX = 40;
    const boardY = 40;
    const boardW = 7 * 70;
    const boardH = 6 * 60;
    const holeRadius = 22;

    if (!maskCanvas) {
      maskCanvas = document.createElement("canvas");
      maskCtx = maskCanvas.getContext("2d");
    }
    maskCanvas.width = view.baseWidth;
    maskCanvas.height = view.baseHeight;
    maskCtx.setTransform(1, 0, 0, 1, 0, 0);
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.fillStyle = "#223045";
    maskCtx.fillRect(boardX, boardY, boardW, boardH);
    maskCtx.globalCompositeOperation = "destination-out";
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = boardX + c * 70 + 35;
        const y = boardY + r * 60 + 30;
        maskCtx.beginPath();
        maskCtx.arc(x, y, holeRadius, 0, Math.PI * 2);
        maskCtx.fill();
      }
    }
    maskCtx.globalCompositeOperation = "source-over";

    // draw falling and settled pieces behind the board mask
    ctx.save();
    ctx.beginPath();
    ctx.rect(boardX, boardY, boardW, boardH);
    ctx.clip();
    const drawPiece = (x, y, player, glow) => {
      ctx.fillStyle = player === 1 ? "#ff6f91" : "#ffd166";
      ctx.shadowColor = glow ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.4)";
      ctx.shadowBlur = glow ? 24 : 6;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      if (glow) {
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };
    fallingPieces.forEach((piece) => {
      const x = boardX + piece.col * 70 + 35;
      drawPiece(x, piece.y, piece.player, false);
    });
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const fallingHere = fallingPieces.some((piece) => piece.row === r && piece.col === c);
        if (board[r][c] !== 0 && !fallingHere) {
          const x = boardX + c * 70 + 35;
          const y = boardY + r * 60 + 30;
          const isWinning = winningCells.some(([wr, wc]) => wr === r && wc === c);
          drawPiece(x, y, board[r][c], isWinning);
        }
      }
    }
    ctx.restore();

    // draw the board with holes on top
    ctx.drawImage(maskCanvas, 0, 0);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(40 + selectedCol * 70 + 10, 20, 50, 8);
  };

  const stopLoop = startLoop({
    step: (dt) => updateFalling(dt),
    render: draw,
    isActive: () => content.isConnected,
  });

  const observer = new MutationObserver(() => {
    if (!content.isConnected) {
      observer.disconnect();
      controller.abort();
      resizeObserver.disconnect();
      stopLoop();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  updateStatus();

  return {
    title: "Connect 4",
    width: 620,
    height: 520,
    content: wrapper,
  };
}
