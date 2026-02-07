export function createApp() {
  const content = document.createElement("div");
  content.style.height = "100%";
  content.style.display = "flex";
  content.style.justifyContent = "center";
  content.style.alignItems = "center";

  const canvas = document.createElement("canvas");
  canvas.className = "game-canvas";
  canvas.width = 420;
  canvas.height = 560;
  content.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  const palette = [
    "#0b0f14",
    "#1a2330",
    "#2e3a4a",
    "#4b5b6d",
    "#7a8da3",
    "#c7d4e2",
    "#e7f0ff",
    "#ffb347",
    "#ff6f91",
    "#ffd166",
    "#6ef0c4",
    "#60a3ff",
    "#b388ff",
    "#ff5f5f",
    "#9dff5f",
    "#f5f5f5",
  ];

  const road = {
    width: 240,
    left: (canvas.width - 240) / 2,
    right: (canvas.width + 240) / 2,
  };

  const player = {
    lane: 1,
    width: 26,
    height: 40,
    y: canvas.height - 70,
  };

  let score = 0;
  let highScore = Number(localStorage.getItem("racecar_highscore")) || 0;
  let state = "playing";
  let laneOffset = 0;
  let obstacles = [];
  let spawnTimer = 0;
  let lastTime = performance.now();

  const laneCount = 3;
  const laneWidth = road.width / laneCount;

  const getLaneX = (lane) => road.left + lane * laneWidth + laneWidth / 2;

  const resetGame = () => {
    score = 0;
    obstacles = [];
    spawnTimer = 0;
    laneOffset = 0;
    state = "playing";
    player.lane = 1;
  };

  const spawnObstacle = () => {
    const lane = Math.floor(Math.random() * laneCount);
    const type = Math.random() > 0.3 ? "car" : "block";
    const size = type === "car" ? { w: 24, h: 38 } : { w: 22, h: 22 };
    const color = palette[7 + Math.floor(Math.random() * 8)];
    obstacles.push({
      lane,
      x: getLaneX(lane),
      y: -60,
      width: size.w,
      height: size.h,
      color,
      type,
      passed: false,
    });
  };

  const update = (dt) => {
    if (state !== "playing") return;

    const baseSpeed = 1.3;
    const speedStep = Math.floor(score / 5);
    const speed = Math.min(6, baseSpeed * Math.pow(1.06, speedStep));
    laneOffset = (laneOffset + speed * dt * 0.04) % 40;

    spawnTimer += dt;
    if (spawnTimer > 900) {
      spawnObstacle();
      spawnTimer = 0;
    }

    obstacles.forEach((obs) => {
      obs.y += speed * dt * 0.12;
      if (!obs.passed && obs.y > canvas.height) {
        obs.passed = true;
        score += 1;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("racecar_highscore", String(highScore));
        }
      }
    });

    obstacles = obstacles.filter((obs) => obs.y < canvas.height + 80);

    const playerX = getLaneX(player.lane);
    const playerBox = {
      x: playerX - player.width / 2,
      y: player.y - player.height / 2,
      w: player.width,
      h: player.height,
    };

    obstacles.forEach((obs) => {
      const obsBox = {
        x: obs.x - obs.width / 2,
        y: obs.y - obs.height / 2,
        w: obs.width,
        h: obs.height,
      };
      const hit =
        playerBox.x < obsBox.x + obsBox.w &&
        playerBox.x + playerBox.w > obsBox.x &&
        playerBox.y < obsBox.y + obsBox.h &&
        playerBox.y + playerBox.h > obsBox.y;
      if (hit) {
        state = "gameover";
      }
    });
  };

  const drawRoad = () => {
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = palette[2];
    ctx.fillRect(road.left - 12, 0, road.width + 24, canvas.height);

    ctx.fillStyle = palette[1];
    ctx.fillRect(road.left, 0, road.width, canvas.height);

    ctx.fillStyle = palette[4];
    ctx.fillRect(road.left - 6, 0, 2, canvas.height);
    ctx.fillRect(road.right + 4, 0, 2, canvas.height);

    ctx.strokeStyle = palette[6];
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 18]);
    for (let i = 1; i < laneCount; i += 1) {
      const x = road.left + laneWidth * i;
      ctx.beginPath();
      ctx.moveTo(x, -40 + laneOffset);
      ctx.lineTo(x, canvas.height + 40);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  };

  const drawCar = (x, y, color, width, height, isPlayer = false) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y - height / 2, width, height);

    ctx.fillStyle = isPlayer ? palette[15] : palette[5];
    ctx.fillRect(x - width / 2 + 4, y - height / 2 + 6, width - 8, height / 3);

    ctx.fillStyle = palette[0];
    ctx.fillRect(x - width / 2 + 2, y - height / 2 + 4, 4, 8);
    ctx.fillRect(x + width / 2 - 6, y - height / 2 + 4, 4, 8);
    ctx.fillRect(x - width / 2 + 2, y + height / 2 - 12, 4, 8);
    ctx.fillRect(x + width / 2 - 6, y + height / 2 - 12, 4, 8);

    ctx.fillStyle = isPlayer ? palette[11] : palette[3];
    ctx.fillRect(x - width / 2 + 6, y + height / 2 - 10, width - 12, 4);
  };

  const drawBlock = (x, y, color, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.fillStyle = palette[5];
    ctx.fillRect(x - size / 2 + 4, y - size / 2 + 4, size - 8, size - 8);
  };

  const drawHUD = () => {
    ctx.fillStyle = palette[15];
    ctx.font = "14px 'Avenir Next', sans-serif";
    ctx.fillText(`Score: ${score}`, 16, 26);
    ctx.fillText(`High: ${highScore}`, 16, 46);
  };

  const draw = () => {
    drawRoad();

    obstacles.forEach((obs) => {
      if (obs.type === "car") {
        drawCar(obs.x, obs.y, obs.color, obs.width, obs.height);
      } else {
        drawBlock(obs.x, obs.y, obs.color, obs.width);
      }
    });

    const playerX = getLaneX(player.lane);
    drawCar(playerX, player.y, palette[12], player.width, player.height, true);

    drawHUD();

    if (state === "gameover") {
      ctx.fillStyle = "rgba(10, 14, 20, 0.75)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = palette[15];
      ctx.font = "20px 'Avenir Next', sans-serif";
      ctx.fillText("Game Over", canvas.width / 2 - 56, canvas.height / 2 - 12);
      ctx.font = "14px 'Avenir Next', sans-serif";
      ctx.fillText(`Score: ${score}`, canvas.width / 2 - 40, canvas.height / 2 + 16);
      ctx.fillText("Click to restart", canvas.width / 2 - 58, canvas.height / 2 + 40);
    }
  };

  const loop = (time) => {
    const dt = time - lastTime;
    lastTime = time;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  };

  document.addEventListener("keydown", (event) => {
    if (state !== "playing") return;
    if (event.key === "ArrowLeft") {
      player.lane = Math.max(0, player.lane - 1);
    }
    if (event.key === "ArrowRight") {
      player.lane = Math.min(laneCount - 1, player.lane + 1);
    }
  });

  canvas.addEventListener("click", () => {
    if (state === "gameover") resetGame();
  });

  loop(performance.now());

  return {
    title: "Racecar",
    width: 460,
    height: 620,
    content,
  };
}
