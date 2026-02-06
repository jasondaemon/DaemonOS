import Matter from "https://esm.sh/matter-js@0.20.0";

export function createApp() {
  const content = document.createElement("div");
  content.style.height = "100%";

  const canvas = document.createElement("canvas");
  canvas.className = "game-canvas";
  canvas.width = 640;
  canvas.height = 920;
  content.appendChild(canvas);

  const {
    Engine,
    Render,
    Runner,
    Bodies,
    Body,
    Composite,
    Constraint,
    Events,
    Vector,
  } = Matter;

  const engine = Engine.create();
  engine.gravity.y = 1.1;

  const render = Render.create({
    canvas,
    engine,
    options: {
      width: canvas.width,
      height: canvas.height,
      background: "#0f1620",
      wireframes: false,
    },
  });

  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  const storageKey = "pineball_highscore";
  let highScore = Number(localStorage.getItem(storageKey) || 0);
  let score = 0;
  let ballsRemaining = 3;
  let gameState = "insert";
  let charging = false;
  let plungerPower = 0;
  let lightPhase = 0;

  const table = {
    width: canvas.width,
    height: canvas.height,
    gutter: 48,
    top: 50,
    bottom: canvas.height - 40,
    plungerLaneX: canvas.width - 66,
  };

  const walls = [];
  const bumpers = [];
  const targets = [];

  const addWall = (x1, y1, x2, y2, thickness = 12) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const wall = Bodies.rectangle(midX, midY, len, thickness, {
      isStatic: true,
      angle,
      render: {
        fillStyle: "#1b2e4a",
        strokeStyle: "rgba(255,255,255,0.2)",
        lineWidth: 2,
      },
    });
    walls.push(wall);
  };

  const addBumper = (x, y, r, value, color) => {
    const bumper = Bodies.circle(x, y, r, {
      isStatic: true,
      restitution: 1.2,
      render: { fillStyle: color, strokeStyle: "rgba(0,0,0,0.4)", lineWidth: 3 },
      label: `bumper:${value}`,
    });
    bumpers.push(bumper);
  };

  const addTarget = (x, y, w, h) => {
    const target = Bodies.rectangle(x, y, w, h, {
      isStatic: true,
      render: { fillStyle: "#b0c4de" },
      label: "target",
    });
    targets.push(target);
  };

  const buildGeometry = () => {
    // Playfield boundary (purple outline)
    addWall(110, 90, 530, 90, 14); // top straight
    addWall(110, 90, 80, 160, 12); // top-left slope
    addWall(530, 90, 560, 160, 12); // top-right slope
    addWall(80, 160, 80, 640, 12); // left vertical
    addWall(560, 160, 560, 640, 12); // right vertical
    addWall(80, 640, 150, 760, 12); // left lower slope
    addWall(560, 640, 490, 760, 12); // right lower slope
    addWall(150, 760, 240, 850, 12); // left bottom slope
    addWall(490, 760, 400, 850, 12); // right bottom slope
    addWall(240, 850, 315, 890, 14); // left drain lip
    addWall(400, 850, 325, 890, 14); // right drain lip

    // Plunger lane divider + outer lane wall
    addWall(520, 220, 520, 900, 10);
    addWall(580, 220, 580, 900, 10);

    // Blue bars (walls) guiding toward flippers
    addWall(200, 520, 300, 640, 12);
    addWall(440, 520, 340, 640, 12);
  };

  const buildBumpers = () => {
    // Round bumpers
    addBumper(320, 420, 38, 100, "#ffd27a"); // center star
    addBumper(250, 260, 22, 25, "#7bd5ff"); // left top
    addBumper(390, 260, 22, 50, "#ff7aa2"); // right top
    addBumper(220, 330, 14, 10, "#ffb347");
    addBumper(420, 330, 14, 10, "#ffb347");
    addBumper(270, 520, 12, 10, "#ffb347");
    addBumper(370, 520, 12, 10, "#ffb347");

    // Red bumpers (static angled bumpers)
    addTarget(170, 260, 20, 110);
    addTarget(470, 260, 20, 110);
    addTarget(170, 640, 30, 130);
    addTarget(470, 640, 30, 130);

    // Standup targets near top row
    addTarget(250, 160, 12, 45);
    addTarget(300, 160, 12, 45);
    addTarget(350, 160, 12, 45);
    addTarget(400, 160, 12, 45);
  };

  buildGeometry();
  buildBumpers();

  const flippers = [
    // Hinged at the outer walls
    createFlipper(180, canvas.height - 220, 130, 0.8, -0.2),
    createFlipper(canvas.width - 180, canvas.height - 220, 130, Math.PI - 0.8, Math.PI + 0.2),
  ];

  Composite.add(engine.world, [...walls, ...bumpers, ...targets, ...flippers.map((f) => f.body)]);

  function createFlipper(pivotX, pivotY, length, restAngle, activeAngle) {
    const body = Bodies.rectangle(pivotX + length / 2, pivotY, length, 12, {
      isStatic: true,
      restitution: 0.2,
      render: { fillStyle: "#ff8fa3" },
    });
    Body.setAngle(body, restAngle);
    return { body, restAngle, activeAngle };
  }

  function spawnBall() {
    const ball = Bodies.circle(table.plungerLaneX, table.bottom - 160, 9, {
      restitution: 0.4,
      friction: 0.02,
      frictionAir: 0.001,
      label: "ball",
      render: { fillStyle: "#f7f7f7" },
    });
    Composite.add(engine.world, ball);
    return ball;
  }

  let currentBall = null;

  function resetForNewBall() {
    if (currentBall) Composite.remove(engine.world, currentBall);
    currentBall = spawnBall();
    Body.setPosition(currentBall, { x: table.plungerLaneX, y: table.bottom - 160 });
    Body.setVelocity(currentBall, { x: 0, y: 0 });
    Body.setStatic(currentBall, true);
    plungerPower = 0;
    charging = false;
    lightPhase = 0;
    gameState = "ready";
  }

  function startGame() {
    score = 0;
    ballsRemaining = 3;
    resetForNewBall();
    gameState = "lights";
  }

  function launchBall() {
    if (!currentBall) return;
    Body.setStatic(currentBall, false);
    const force = Math.max(0.016, plungerPower / 900);
    Body.applyForce(currentBall, currentBall.position, { x: 0, y: -force });
    gameState = "playing";
  }

  function endGame() {
    gameState = "gameover";
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(storageKey, String(score));
    }
  }

  function loseBall() {
    ballsRemaining -= 1;
    if (ballsRemaining <= 0) {
      endGame();
    } else {
      resetForNewBall();
      gameState = "lights";
    }
  }

  Events.on(engine, "collisionStart", (event) => {
    event.pairs.forEach((pair) => {
      const label = pair.bodyA.label || pair.bodyB.label;
      if (label?.startsWith("bumper")) {
        const value = Number(label.split(":")[1] || 0);
        score += value;
      }
      if (label === "target") {
        score += 150;
      }
    });
  });

  Events.on(engine, "afterUpdate", () => {
    if (!currentBall) return;
    if (currentBall.position.y > table.bottom + 60) {
      loseBall();
    }
  });

  Events.on(engine, "beforeUpdate", () => {
    flippers.forEach((flipper) => {
      const isActive = flipper.active;
      const target = isActive ? flipper.activeAngle : flipper.restAngle;
      const current = flipper.body.angle;
      const next = current + (target - current) * 0.35;
      Body.setAngle(flipper.body, next);
    });
  });

  function updateLights() {
    lightPhase += 0.04;
  }

  function drawOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "22px 'Avenir Next', sans-serif";

    if (gameState === "insert") {
      ctx.fillText("PINEBALL", canvas.width / 2, 300);
      ctx.font = "14px 'Avenir Next', sans-serif";
      ctx.fillText("Insert Coin", canvas.width / 2, 340);
      ctx.fillText("Press Enter to Start", canvas.width / 2, 364);
    }

    if (gameState === "lights") {
      ctx.fillText("Lighting sequence...", canvas.width / 2, 360);
    }

    if (gameState === "ready") {
      ctx.fillText("Pull the Plunger", canvas.width / 2, 360);
      ctx.font = "14px 'Avenir Next', sans-serif";
      ctx.fillText("Hold Right Shift then release", canvas.width / 2, 384);
    }

    if (gameState === "gameover") {
      ctx.fillText("Game Over", canvas.width / 2, 360);
      ctx.font = "16px 'Avenir Next', sans-serif";
      ctx.fillText(`Final Score: ${score}`, canvas.width / 2, 390);
      ctx.font = "14px 'Avenir Next', sans-serif";
      ctx.fillText("Press Enter to Restart", canvas.width / 2, 420);
    }
    ctx.restore();
  }

  Events.on(render, "afterRender", () => {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "14px 'Avenir Next', sans-serif";
    ctx.fillText(`Score: ${score}`, 20, 24);
    ctx.fillText(`High: ${highScore}`, 280, 24);
    ctx.fillText(`Balls: ${ballsRemaining}`, 520, 24);

    if (gameState !== "playing") {
      drawOverlay();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.code === "Enter") {
      if (gameState === "insert" || gameState === "gameover") {
        startGame();
      }
      if (gameState === "ready") {
        launchBall();
      }
    }

    if (event.code === "ShiftLeft") {
      flippers[0].active = true;
    }
    if (event.code === "ShiftRight") {
      flippers[1].active = true;
      if (gameState === "ready") charging = true;
    }
  });

  document.addEventListener("keyup", (event) => {
    if (event.code === "ShiftLeft") {
      flippers[0].active = false;
    }
    if (event.code === "ShiftRight") {
      flippers[1].active = false;
      if (gameState === "ready" && charging) {
        launchBall();
      }
      charging = false;
    }
  });

  function updatePlunger() {
    if (charging) {
      plungerPower = Math.min(14, plungerPower + 0.25);
    } else {
      plungerPower = Math.max(0, plungerPower - 0.1);
    }
  }

  setInterval(updatePlunger, 16);

  function tick() {
    if (gameState === "lights") {
      updateLights();
      if (lightPhase > Math.PI * 2) gameState = "ready";
    }
    requestAnimationFrame(tick);
  }
  tick();

  return {
    title: "Pineball",
    width: 700,
    height: 1000,
    content,
  };
}
