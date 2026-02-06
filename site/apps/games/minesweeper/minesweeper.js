export function createApp() {
  const content = document.createElement("div");
  const size = 8;
  const mines = 10;

  const grid = document.createElement("div");
  grid.className = "minesweeper-grid";
  grid.style.gridTemplateColumns = `repeat(${size}, 32px)`;

  const cells = [];

  function buildBoard() {
    const mineSet = new Set();
    while (mineSet.size < mines) {
      mineSet.add(Math.floor(Math.random() * size * size));
    }

    for (let i = 0; i < size * size; i += 1) {
      const cell = {
        index: i,
        mine: mineSet.has(i),
        revealed: false,
        element: document.createElement("button"),
      };
      cell.element.className = "ms-cell";
      cell.element.addEventListener("click", () => reveal(cell));
      cells.push(cell);
      grid.appendChild(cell.element);
    }
  }

  function neighborIndices(index) {
    const row = Math.floor(index / size);
    const col = index % size;
    const neighbors = [];
    for (let r = row - 1; r <= row + 1; r += 1) {
      for (let c = col - 1; c <= col + 1; c += 1) {
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        if (r === row && c === col) continue;
        neighbors.push(r * size + c);
      }
    }
    return neighbors;
  }

  function reveal(cell) {
    if (cell.revealed) return;
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
    cells.forEach((cell) => {
      cell.element.disabled = true;
      if (cell.mine) cell.element.textContent = "X";
    });
    const message = document.createElement("div");
    message.textContent = win ? "Field cleared!" : "Mine detonated.";
    message.style.marginTop = "10px";
    message.style.color = win ? "#9be58a" : "#f05f57";
    content.appendChild(message);
  }

  function checkWin() {
    const safeCells = cells.filter((cell) => !cell.mine);
    if (safeCells.every((cell) => cell.revealed)) {
      endGame(true);
    }
  }

  buildBoard();
  content.appendChild(grid);

  return {
    title: "Minesweeper",
    width: 420,
    height: 360,
    content,
  };
}
