export function createApp() {
  const content = document.createElement("div");
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = "10px";
  content.style.height = "100%";
  content.style.position = "relative";

  const sizes = [
    { label: "8x8", rows: 8, cols: 8, mines: 10 },
    { label: "12x12", rows: 12, cols: 12, mines: 24 },
    { label: "20x25", rows: 25, cols: 20, mines: 75 },
  ];

  let config = sizes[0];
  let cells = [];
  let gameOver = false;
  const explosionAudio = new Audio("/apps/games/minesweeper/explosion.mp3");
  explosionAudio.preload = "auto";
  explosionAudio.volume = 0.8;

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "10px";

  const sizeLabel = document.createElement("label");
  sizeLabel.textContent = "Grid";
  sizeLabel.style.color = "rgba(255,255,255,0.75)";
  sizeLabel.style.fontSize = "12px";

  const sizeSelect = document.createElement("select");
  sizeSelect.style.background = "rgba(15, 20, 30, 0.8)";
  sizeSelect.style.color = "#e6edf6";
  sizeSelect.style.border = "1px solid rgba(255,255,255,0.2)";
  sizeSelect.style.borderRadius = "6px";
  sizeSelect.style.padding = "4px 6px";
  sizes.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.label;
    option.textContent = entry.label;
    sizeSelect.appendChild(option);
  });

  const newButton = document.createElement("button");
  newButton.type = "button";
  newButton.textContent = "New Game";
  newButton.style.border = "none";
  newButton.style.borderRadius = "8px";
  newButton.style.padding = "6px 10px";
  newButton.style.background = "rgba(95, 160, 255, 0.8)";
  newButton.style.color = "#f5faff";
  newButton.style.cursor = "pointer";

  header.appendChild(sizeLabel);
  header.appendChild(sizeSelect);
  header.appendChild(newButton);
  content.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "minesweeper-grid";
  content.appendChild(grid);

  const modal = document.createElement("div");
  modal.style.position = "absolute";
  modal.style.inset = "0";
  modal.style.display = "none";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.background = "rgba(9, 14, 20, 0.55)";
  modal.style.zIndex = "2";

  const modalCard = document.createElement("div");
  modalCard.style.background = "rgba(18, 26, 36, 0.95)";
  modalCard.style.border = "1px solid rgba(255,255,255,0.15)";
  modalCard.style.borderRadius = "12px";
  modalCard.style.padding = "18px 22px";
  modalCard.style.minWidth = "200px";
  modalCard.style.boxShadow = "0 18px 40px rgba(0,0,0,0.45)";
  modalCard.style.textAlign = "center";
  modalCard.style.color = "#e6edf6";
  modalCard.style.fontFamily = "'Avenir Next', sans-serif";

  const modalTitle = document.createElement("div");
  modalTitle.style.fontSize = "18px";
  modalTitle.style.fontWeight = "600";
  modalTitle.style.marginBottom = "10px";

  const modalButton = document.createElement("button");
  modalButton.type = "button";
  modalButton.textContent = "Start New Game";
  modalButton.style.border = "none";
  modalButton.style.borderRadius = "8px";
  modalButton.style.padding = "8px 14px";
  modalButton.style.background = "linear-gradient(180deg,#5ab0ff,#2c78d4)";
  modalButton.style.color = "#f5faff";
  modalButton.style.cursor = "pointer";

  modalCard.appendChild(modalTitle);
  modalCard.appendChild(modalButton);
  modal.appendChild(modalCard);
  content.appendChild(modal);

  const resetBoard = () => {
    grid.innerHTML = "";
    cells = [];
    gameOver = false;

    const { rows, cols, mines } = config;
    const maxGridWidth = 420;
    const cellSize = Math.max(18, Math.floor(maxGridWidth / cols));

    grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    grid.style.gap = "4px";

    const mineSet = new Set();
    while (mineSet.size < mines) {
      mineSet.add(Math.floor(Math.random() * rows * cols));
    }

    for (let i = 0; i < rows * cols; i += 1) {
      const cell = {
        index: i,
        mine: mineSet.has(i),
        revealed: false,
        flagged: false,
        element: document.createElement("button"),
      };
      cell.element.className = "ms-cell";
      cell.element.style.width = `${cellSize}px`;
      cell.element.style.height = `${cellSize}px`;
      cell.element.addEventListener("click", (event) => {
        if (gameOver) return;
        if (event.shiftKey) {
          toggleFlag(cell);
          return;
        }
        reveal(cell);
      });
      cells.push(cell);
      grid.appendChild(cell.element);
    }

    modal.style.display = "none";
  };

  function neighborIndices(index) {
    const { rows, cols } = config;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const neighbors = [];
    for (let r = row - 1; r <= row + 1; r += 1) {
      for (let c = col - 1; c <= col + 1; c += 1) {
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        if (r === row && c === col) continue;
        neighbors.push(r * cols + c);
      }
    }
    return neighbors;
  }

  function toggleFlag(cell) {
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    cell.element.textContent = cell.flagged ? "⚑" : "";
    cell.element.classList.toggle("flagged", cell.flagged);
  }

  function reveal(cell) {
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    cell.element.classList.add("revealed");
    if (cell.mine) {
      cell.element.textContent = "X";
      endGame(false);
      return;
    }
    const neighbors = neighborIndices(cell.index);
    const count = neighbors.filter((idx) => cells[idx].mine).length;
    if (count > 0) {
      cell.element.textContent = String(count);
    } else {
      neighbors.forEach((idx) => reveal(cells[idx]));
    }
    checkWin();
  }

  function endGame(win) {
    gameOver = true;
    cells.forEach((cell) => {
      cell.element.disabled = true;
      if (cell.mine) cell.element.textContent = "X";
    });
    modalTitle.textContent = win ? "Field Cleared!" : "Mine Detonated";
    modal.style.display = "flex";
    if (!win) {
      try {
        explosionAudio.currentTime = 0;
        explosionAudio.play();
      } catch {
        // ignore autoplay restrictions
      }
    }
  }

  function checkWin() {
    const safeCells = cells.filter((cell) => !cell.mine);
    if (safeCells.every((cell) => cell.revealed)) {
      endGame(true);
    }
  }

  sizeSelect.addEventListener("change", () => {
    const selected = sizes.find((entry) => entry.label === sizeSelect.value);
    if (selected) config = selected;
    resetBoard();
  });

  newButton.addEventListener("click", resetBoard);
  modalButton.addEventListener("click", resetBoard);

  resetBoard();

  return {
    title: "Minesweeper",
    width: 520,
    height: 520,
    content,
  };
}
