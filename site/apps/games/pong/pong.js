export function createApp(osAPI) {
  const content = document.createElement("div");
  content.style.height = "100%";
  content.style.display = "flex";
  content.style.flexDirection = "column";

  const canvas = document.createElement("canvas");
  canvas.className = "game-canvas";
  canvas.width = 560;
  canvas.height = 340;
  content.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const paddleLeft = { x: 18, y: 120, w: 12, h: 80 };
  const paddleRight = { x: canvas.width - 30, y: 120, w: 12, h: 80 };
  const ball = { x: 260, y: 160, vx: 3, vy: 2, r: 8 };

  let mode = null;
  let hits = 0;
  let score = 0;
  let playerScore = 0;
  let cpuScore = 0;
  let state = "start";
  let progressive = false;
  let lastSpeedHit = 0;

  const storageKey = "pong_highscores";

  const getScores = () => {
    const raw = document.cookie.split("; ").find((row) => row.startsWith(`${storageKey}=`));
    if (!raw) return [];
    try {
      return JSON.parse(decodeURIComponent(raw.split("=")[1])) || [];
    } catch {
      return [];
    }
  };

  const saveScores = (scores) => {
    const encoded = encodeURIComponent(JSON.stringify(scores));
    document.cookie = `${storageKey}=${encoded}; path=/; max-age=31536000`;
  };

  const updateScores = (newScore) => {
    const scores = getScores();
    scores.push({ score: newScore, at: new Date().toLocaleString() });
    scores.sort((a, b) => b.score - a.score);
    saveScores(scores.slice(0, 3));
  };

  const resetBall = () => {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = Math.random() > 0.5 ? 3 : -3;
    ball.vy = Math.random() > 0.5 ? 2 : -2;
    hits = 0;
    lastSpeedHit = 0;
  };

  const startSingle = () => {
    mode = "single";
    score = 0;
    state = "playing";
    resetBall();
  };

  const startVersus = () => {
    mode = "versus";
    playerScore = 0;
    cpuScore = 0;
    state = "playing";
    resetBall();
  };

  const endSingle = () => {
    state = "gameover";
    updateScores(score);
  };

  const endVersus = () => {
    state = "gameover";
  };

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    paddleLeft.y = Math.max(0, Math.min(canvas.height - paddleLeft.h, y - paddleLeft.h / 2));
  });

  osAPI?.registerAppMenu?.("pong", {
    appName: "Pong",
    menus: [
      {
        title: "Pong",
        items: [
          {
            label: "Progressive Difficulty",
            type: "checkbox",
            checked: progressive,
            onToggle: (value) => {
              progressive = value;
            },
          },
        ],
      },
      { title: "Edit", items: [{ label: "Undo", disabled: true }] },
      { title: "View", items: [{ label: "Zoom In", disabled: true }] },
      { title: "Window", items: [{ label: "Minimize", disabled: true }] },
      { title: "Help", items: [{ label: "Pong Help", disabled: true }] },
    ],
  });

  function update() {
    if (state !== "playing") return;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - ball.r < 0 || ball.y + ball.r > canvas.height) {
      ball.vy *= -1;
    }

    const hitLeft =
      ball.x - ball.r < paddleLeft.x + paddleLeft.w &&
      ball.y > paddleLeft.y &&
      ball.y < paddleLeft.y + paddleLeft.h;

    if (hitLeft) {
      ball.vx = Math.abs(ball.vx);
      ball.x = paddleLeft.x + paddleLeft.w + ball.r;
      hits += 1;
      if (mode === "single") score += 1;
    }

    if (mode === "versus") {
      const hitRight =
        ball.x + ball.r > paddleRight.x &&
        ball.y > paddleRight.y &&
        ball.y < paddleRight.y + paddleRight.h;
      if (hitRight) {
        ball.vx = -Math.abs(ball.vx);
        ball.x = paddleRight.x - ball.r;
        hits += 1;
      }

      const target = ball.y - paddleRight.h / 2;
      paddleRight.y += (target - paddleRight.y) * 0.08;
      paddleRight.y = Math.max(0, Math.min(canvas.height - paddleRight.h, paddleRight.y));
    } else {
      paddleRight.y = canvas.height / 2 - paddleRight.h / 2;
    }

    if (progressive && hits > 0 && hits % 3 === 0 && lastSpeedHit !== hits) {
      ball.vx *= 1.02;
      ball.vy *= 1.02;
      lastSpeedHit = hits;
    }

    if (ball.x - ball.r < 0) {
      if (mode === "single") {
        endSingle();
      } else {
        cpuScore += 1;
        resetBall();
        if (cpuScore >= 3) endVersus();
      }
    }

    if (ball.x + ball.r > canvas.width) {
      if (mode === "single") {
        ball.vx *= -1;
      } else {
        playerScore += 1;
        resetBall();
        if (playerScore >= 3) endVersus();
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0c1117";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state === "start") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "20px 'Avenir Next', sans-serif";
      ctx.fillText("Pong", canvas.width / 2 - 24, 90);
      ctx.font = "14px 'Avenir Next', sans-serif";
      ctx.fillText("Play Single Player", canvas.width / 2 - 70, 140);
      ctx.fillText("Play vs Computer", canvas.width / 2 - 70, 170);

      const scores = getScores();
      ctx.fillText("High Scores", canvas.width / 2 - 50, 220);
      scores.forEach((entry, index) => {
        ctx.fillText(`${index + 1}. ${entry.score} (${entry.at})`, canvas.width / 2 - 110, 240 + index * 18);
      });
      return;
    }

    if (state === "gameover") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "20px 'Avenir Next', sans-serif";
      ctx.fillText("Game Over", canvas.width / 2 - 50, 130);
      ctx.font = "16px 'Avenir Next', sans-serif";
      if (mode === "single") {
        ctx.fillText(`Score: ${score}`, canvas.width / 2 - 40, 160);
      } else {
        ctx.fillText(`Player ${playerScore} : ${cpuScore} CPU`, canvas.width / 2 - 70, 160);
      }
      ctx.fillText("Click to restart", canvas.width / 2 - 60, 200);
      return;
    }

    ctx.fillStyle = "#f2c358";
    ctx.fillRect(paddleLeft.x, paddleLeft.y, paddleLeft.w, paddleLeft.h);
    if (mode === "versus") {
      ctx.fillRect(paddleRight.x, paddleRight.y, paddleRight.w, paddleRight.h);
    }

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "14px 'Avenir Next', sans-serif";
    if (mode === "single") {
      ctx.fillText(`Score: ${score}`, canvas.width - 110, 24);
    } else {
      ctx.fillText(`${playerScore} : ${cpuScore}`, canvas.width / 2 - 14, 24);
    }
  }

  canvas.addEventListener("click", (event) => {
    if (state === "start") {
      const rect = canvas.getBoundingClientRect();
      const y = event.clientY - rect.top;
      if (y > 120 && y < 150) {
        startSingle();
      } else if (y > 150 && y < 190) {
        startVersus();
      }
    } else if (state === "gameover") {
      state = "start";
    }
  });

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  loop();

  return {
    title: "Pong",
    width: 600,
    height: 420,
    content,
  };
}
