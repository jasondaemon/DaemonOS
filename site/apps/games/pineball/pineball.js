export function createApp() {
  const root = document.createElement("div");
  root.className = "pineball-app";
  root.style.position = "relative";

  const canvas = document.createElement("canvas");
  canvas.className = "pineball-canvas";
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  const hud = document.createElement("div");
  hud.className = "pineball-hud";
  hud.style.position = "absolute";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.right = "12px";
  hud.style.pointerEvents = "none";

  root.appendChild(canvas);
  root.appendChild(hud);

  const controller = new AbortController();
  const { signal } = controller;

  const BASE_W = 520;
  const BASE_H = 760;
  const WORLD_SCALE = 30;

  const state = {
    score: 0,
    balls: 3,
    message: "Press Space to launch",
    paused: false,
    gameOver: false,
    debug: false,
    ballSave: 0,
  };

  let planck = null;
  let world = null;
  let ball = null;
  let leftFlipper = null;
  let rightFlipper = null;
  let leftJoint = null;
  let rightJoint = null;
  let bumpers = [];
  let posts = [];
  let glowTimers = new Map();
  let rafId = null;
  let lastTime = null;
  let accumulator = 0;
  let resizeObserver = null;
  let outline = [];
  let laneEdges = [];
  let shooterEdges = [];
  let slingEdges = [];

  const view = {
    dpr: 1,
    cssW: BASE_W,
    cssH: BASE_H,
    scale: 1,
    ox: 0,
    oy: 0,
  };

  const toWorld = (px) => px / WORLD_SCALE;
  const toPixel = (m) => m * WORLD_SCALE;

  const updateHud = () => {
    hud.innerHTML = `
      <div>Score: ${state.score}</div>
      <div>Balls: ${state.balls}</div>
      <div>${state.message}</div>
    `;
  };

  const loadPlanck = () =>
    new Promise((resolve, reject) => {
      if (window.planck) {
        resolve(window.planck);
        return;
      }
      const script = document.createElement("script");
      script.src = "/apps/games/pineball/vendor/planck.min.js";
      script.onload = () => resolve(window.planck);
      script.onerror = reject;
      document.head.appendChild(script);
    });

  const P = (nx, ny) => [nx * BASE_W, ny * BASE_H];

  const createWorld = () => {
    world = planck.World(planck.Vec2(0, 18));

    const walls = world.createBody();
    const makeEdge = (a, b, options = {}) => {
      walls.createFixture(planck.Edge(a, b), { restitution: 0.25, friction: 0.12, ...options });
    };

    outline = [
      P(0.10, 0.95),
      P(0.08, 0.72),
      P(0.08, 0.28),
      P(0.16, 0.12),
      P(0.50, 0.06),
      P(0.78, 0.10),
      P(0.82, 0.20),
      P(0.82, 0.86),
      P(0.78, 0.95),
      P(0.66, 0.93),
      P(0.58, 0.97),
      P(0.50, 0.985),
      P(0.42, 0.97),
      P(0.34, 0.93),
      P(0.10, 0.95),
    ];

    for (let i = 0; i < outline.length - 1; i += 1) {
      const a = planck.Vec2(toWorld(outline[i][0]), toWorld(outline[i][1]));
      const b = planck.Vec2(toWorld(outline[i + 1][0]), toWorld(outline[i + 1][1]));
      makeEdge(a, b);
    }

    // Inlanes / outlanes
    laneEdges = [
      [P(0.16, 0.90), P(0.22, 0.74)],
      [P(0.30, 0.92), P(0.42, 0.83)],
      [P(0.70, 0.92), P(0.58, 0.83)],
      [P(0.82, 0.86), P(0.78, 0.72)],
    ];
    laneEdges.forEach(([a, b]) => makeEdge(planck.Vec2(toWorld(a[0]), toWorld(a[1])), planck.Vec2(toWorld(b[0]), toWorld(b[1]))));

    // Shooter lane
    shooterEdges = [
      { a: P(0.95, 0.95), b: P(0.95, 0.18), options: { restitution: 0.12 } },
      { a: P(0.82, 0.18), b: P(0.95, 0.18), options: { restitution: 0.12 } },
      { a: P(0.86, 0.95), b: P(0.86, 0.22), options: { restitution: 0.12 } },
      { a: P(0.86, 0.95), b: P(0.95, 0.95), options: { restitution: 0.05 } },
      { a: P(0.86, 0.26), b: P(0.78, 0.32), options: { restitution: 0.2 } },
    ];
    shooterEdges.forEach(({ a, b, options }) =>
      makeEdge(planck.Vec2(toWorld(a[0]), toWorld(a[1])), planck.Vec2(toWorld(b[0]), toWorld(b[1])), options)
    );

    // Slingshots
    slingEdges = [
      [P(0.22, 0.78), P(0.40, 0.72)],
      [P(0.78, 0.78), P(0.60, 0.72)],
    ];
    slingEdges.forEach(([a, b]) =>
      makeEdge(planck.Vec2(toWorld(a[0]), toWorld(a[1])), planck.Vec2(toWorld(b[0]), toWorld(b[1])), { restitution: 0.95 })
    );

    // Ball
    ball = world.createDynamicBody({
      position: planck.Vec2(toWorld(P(0.905, 0.92)[0]), toWorld(P(0.905, 0.92)[1])),
      bullet: true,
      linearDamping: 0.05,
      angularDamping: 0.05,
    });
    ball.createFixture(planck.Circle(toWorld(8)), {
      density: 1.0,
      restitution: 0.35,
      friction: 0.02,
    });

    // Flippers
    const flipperShape = planck.Box(toWorld(44), toWorld(7));
    leftFlipper = world.createDynamicBody({ position: planck.Vec2(toWorld(P(0.44, 0.925)[0]), toWorld(P(0.44, 0.925)[1])) });
    rightFlipper = world.createDynamicBody({ position: planck.Vec2(toWorld(P(0.56, 0.925)[0]), toWorld(P(0.56, 0.925)[1])) });
    leftFlipper.createFixture(flipperShape, { density: 2.2, friction: 0.6, restitution: 0.2 });
    rightFlipper.createFixture(flipperShape, { density: 2.2, friction: 0.6, restitution: 0.2 });

    const leftPivot = world.createBody({ position: planck.Vec2(toWorld(P(0.36, 0.915)[0]), toWorld(P(0.36, 0.915)[1])) });
    const rightPivot = world.createBody({ position: planck.Vec2(toWorld(P(0.64, 0.915)[0]), toWorld(P(0.64, 0.915)[1])) });

    leftJoint = world.createJoint(planck.RevoluteJoint(
      {
        enableLimit: true,
        lowerAngle: 0.10,
        upperAngle: 0.95,
        enableMotor: true,
        maxMotorTorque: 120,
      },
      leftPivot,
      leftFlipper,
      leftPivot.getPosition()
    ));

    rightJoint = world.createJoint(planck.RevoluteJoint(
      {
        enableLimit: true,
        lowerAngle: -0.95,
        upperAngle: -0.10,
        enableMotor: true,
        maxMotorTorque: 120,
      },
      rightPivot,
      rightFlipper,
      rightPivot.getPosition()
    ));

    leftFlipper.setAngle(0.20);
    rightFlipper.setAngle(-0.20);

    // Bumpers
    const bumperPositions = [P(0.35, 0.32), P(0.65, 0.32), P(0.50, 0.44)];
    bumpers = bumperPositions.map(([x, y], idx) => {
      const body = world.createBody({ position: planck.Vec2(toWorld(x), toWorld(y)) });
      const fixture = body.createFixture(planck.Circle(toWorld(22)), {
        restitution: 0.95,
        friction: 0.2,
      });
      fixture.setUserData({ type: "bumper", id: `bumper-${idx}` });
      return body;
    });

    const postPositions = [P(0.44, 0.84), P(0.56, 0.84)];
    posts = postPositions.map(([x, y]) => {
      const body = world.createBody({ position: planck.Vec2(toWorld(x), toWorld(y)) });
      body.createFixture(planck.Circle(toWorld(10)), {
        restitution: 0.75,
        friction: 0.2,
      });
      return body;
    });

    // Sensors
    const sensorBody = world.createBody();
    const addSensor = (x, y, w, h, type) => {
      const fx = sensorBody.createFixture(planck.Box(toWorld(w / 2), toWorld(h / 2), planck.Vec2(toWorld(x), toWorld(y)), 0), {
        isSensor: true,
      });
      fx.setUserData({ type });
    };

    addSensor(P(0.50, 0.11)[0], P(0.50, 0.11)[1], BASE_W * 0.20, BASE_H * 0.02, "rollover");
    addSensor(P(0.30, 0.88)[0], P(0.30, 0.88)[1], BASE_W * 0.06, BASE_H * 0.02, "inlane");
    addSensor(P(0.70, 0.88)[0], P(0.70, 0.88)[1], BASE_W * 0.06, BASE_H * 0.02, "inlane");
    addSensor(P(0.18, 0.90)[0], P(0.18, 0.90)[1], BASE_W * 0.05, BASE_H * 0.02, "outlane");
    addSensor(P(0.82, 0.90)[0], P(0.82, 0.90)[1], BASE_W * 0.05, BASE_H * 0.02, "outlane");
    addSensor(P(0.50, 0.985)[0], P(0.50, 0.985)[1], BASE_W * 0.18, BASE_H * 0.02, "drain");

    world.on("begin-contact", (contact) => {
      const a = contact.getFixtureA();
      const b = contact.getFixtureB();
      const aData = a.getUserData();
      const bData = b.getUserData();

      const ballFixture = ball.getFixtureList();
      const other = a === ballFixture ? b : b === ballFixture ? a : null;
      const otherData = other?.getUserData();

      if (otherData?.type === "bumper") {
        const center = other.getBody().getPosition();
        const ballPos = ball.getPosition();
        const impulseDir = ballPos.clone().sub(center);
        impulseDir.mul(6);
        ball.applyLinearImpulse(impulseDir, ballPos, true);
        state.score += 100;
        glowTimers.set(otherData.id, 10);
        updateHud();
      }

      const sensor = aData?.type ? aData : bData?.type ? bData : null;
      if (sensor && other === ballFixture) {
        if (sensor.type === "rollover") state.score += 50;
        if (sensor.type === "inlane") state.score += 25;
        if (sensor.type === "outlane") state.score += 10;
        if (sensor.type === "drain") {
          handleDrain();
        }
        updateHud();
      }
    });
  };

  const handleDrain = () => {
    if (state.gameOver) return;
    if (state.ballSave > 0) {
      ball.setLinearVelocity(planck.Vec2(0, 0));
      ball.setAngularVelocity(0);
      ball.setPosition(planck.Vec2(toWorld(P(0.905, 0.92)[0]), toWorld(P(0.905, 0.92)[1])));
      return;
    }
    state.balls -= 1;
    if (state.balls <= 0) {
      state.gameOver = true;
      state.message = "Game Over - Press R";
    } else {
      state.message = "Press Space to launch";
    }
    ball.setLinearVelocity(planck.Vec2(0, 0));
    ball.setAngularVelocity(0);
    ball.setPosition(planck.Vec2(toWorld(P(0.905, 0.92)[0]), toWorld(P(0.905, 0.92)[1])));
  };

  const resetGame = () => {
    state.score = 0;
    state.balls = 3;
    state.gameOver = false;
    state.message = "Press Space to launch";
    state.ballSave = 0;
    ball.setLinearVelocity(planck.Vec2(0, 0));
    ball.setAngularVelocity(0);
    ball.setPosition(planck.Vec2(toWorld(P(0.905, 0.92)[0]), toWorld(P(0.905, 0.92)[1])));
    updateHud();
  };

  const render = () => {
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);

    ctx.fillStyle = "#0c1219";
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    // Table outline
    ctx.strokeStyle = "rgba(130, 220, 255, 0.5)";
    ctx.lineWidth = 4;
    ctx.shadowColor = "rgba(130, 220, 255, 0.7)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(outline[0][0], outline[0][1]);
    outline.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Shooter lane
    ctx.strokeStyle = "rgba(120, 200, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(P(0.86, 0.22)[0], P(0.86, 0.22)[1]);
    ctx.lineTo(P(0.86, 0.95)[0], P(0.86, 0.95)[1]);
    ctx.lineTo(P(0.95, 0.95)[0], P(0.95, 0.95)[1]);
    ctx.lineTo(P(0.95, 0.18)[0], P(0.95, 0.18)[1]);
    ctx.lineTo(P(0.82, 0.18)[0], P(0.82, 0.18)[1]);
    ctx.stroke();

    ctx.strokeStyle = "rgba(120, 200, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    slingEdges.forEach(([a, b]) => {
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    });
    ctx.stroke();

    // Bumpers
    bumpers.forEach((bumper, idx) => {
      const pos = bumper.getPosition();
      const x = toPixel(pos.x);
      const y = toPixel(pos.y);
      const glow = glowTimers.get(`bumper-${idx}`) || 0;
      if (glow > 0) glowTimers.set(`bumper-${idx}`, glow - 1);
      ctx.fillStyle = glow > 0 ? "#ffe68a" : "#f5b86a";
      ctx.shadowColor = glow > 0 ? "rgba(255, 230, 138, 0.8)" : "rgba(245, 184, 106, 0.4)";
      ctx.shadowBlur = glow > 0 ? 18 : 8;
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    posts.forEach((post) => {
      const pos = post.getPosition();
      ctx.fillStyle = "#5fc4ff";
      ctx.shadowColor = "rgba(95, 196, 255, 0.5)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(toPixel(pos.x), toPixel(pos.y), 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Flippers
    const drawFlipper = (body, color) => {
      const pos = body.getPosition();
      const angle = body.getAngle();
      ctx.save();
      ctx.translate(toPixel(pos.x), toPixel(pos.y));
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(255, 120, 160, 0.6)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(-44, -7, 88, 14, 8);
      ctx.fill();
      ctx.restore();
    };

    drawFlipper(leftFlipper, "#ff7aa2");
    drawFlipper(rightFlipper, "#ff7aa2");

    // Ball
    const ballPos = ball.getPosition();
    ctx.fillStyle = "#8fd3ff";
    ctx.shadowColor = "rgba(143, 211, 255, 0.8)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(toPixel(ballPos.x), toPixel(ballPos.y), 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (state.debug) {
      ctx.lineWidth = 1.5;
      world.getBodyList().forEach((body) => {
        for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
          const shape = fixture.getShape();
          const type = shape.getType();
          ctx.strokeStyle = fixture.isSensor() ? "#ff5f5f" : "#6ef0c4";
          if (type === "edge") {
            const v1 = body.getWorldPoint(shape.m_vertex1);
            const v2 = body.getWorldPoint(shape.m_vertex2);
            ctx.beginPath();
            ctx.moveTo(toPixel(v1.x), toPixel(v1.y));
            ctx.lineTo(toPixel(v2.x), toPixel(v2.y));
            ctx.stroke();
          } else if (type === "circle") {
            const center = body.getWorldPoint(shape.m_p);
            ctx.beginPath();
            ctx.arc(toPixel(center.x), toPixel(center.y), toPixel(shape.m_radius), 0, Math.PI * 2);
            ctx.stroke();
          } else if (type === "polygon") {
            const verts = shape.m_vertices;
            if (!verts.length) continue;
            const first = body.getWorldPoint(verts[0]);
            ctx.beginPath();
            ctx.moveTo(toPixel(first.x), toPixel(first.y));
            for (let i = 1; i < verts.length; i += 1) {
              const wp = body.getWorldPoint(verts[i]);
              ctx.lineTo(toPixel(wp.x), toPixel(wp.y));
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
      });
    }
  };

  const stepWorld = (dt) => {
    world.step(dt);
  };

  const loop = (time) => {
    if (!root.isConnected || signal.aborted) return;
    if (lastTime == null) lastTime = time;
    const dt = Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;

    if (!state.paused && !state.gameOver) {
      accumulator += dt;
      const step = 1 / 60;
      let steps = 0;
      while (accumulator >= step && steps < 4) {
        stepWorld(step);
        accumulator -= step;
        steps += 1;
      }
      if (state.ballSave > 0) {
        state.ballSave = Math.max(0, state.ballSave - dt);
      }
    }

    render();
    rafId = requestAnimationFrame(loop);
  };

  const setFlipper = (side, up) => {
    if (side === "left") {
      leftJoint.setMotorSpeed(up ? 25 : -18);
      leftJoint.setMaxMotorTorque(up ? 120 : 70);
    } else {
      rightJoint.setMotorSpeed(up ? -25 : 18);
      rightJoint.setMaxMotorTorque(up ? 120 : 70);
    }
  };

  const onKeyDown = (event) => {
    if (event.repeat) return;
    if (event.key === "ArrowLeft") setFlipper("left", true);
    if (event.key === "ArrowRight") setFlipper("right", true);
    if (event.key === " ") {
      if (!state.gameOver) {
        const pos = ball.getPosition();
        if (pos.x > toWorld(P(0.86, 0.0)[0]) && pos.x < toWorld(P(0.95, 0.0)[0]) && pos.y > toWorld(P(0.0, 0.78)[1])) {
          ball.applyLinearImpulse(planck.Vec2(0, -10), pos, true);
          state.ballSave = 2.0;
          state.message = "";
          updateHud();
        }
      }
    }
    if (event.key.toLowerCase() === "p") {
      state.paused = !state.paused;
      state.message = state.paused ? "Paused" : "";
      updateHud();
    }
    if (event.key.toLowerCase() === "r") {
      resetGame();
    }
    if (event.key.toLowerCase() === "d") {
      state.debug = !state.debug;
    }
  };

  const onKeyUp = (event) => {
    if (event.key === "ArrowLeft") setFlipper("left", false);
    if (event.key === "ArrowRight") setFlipper("right", false);
  };

  const updateViewport = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const scale = Math.min(canvas.width / BASE_W, canvas.height / BASE_H);
    const ox = (canvas.width - BASE_W * scale) / 2;
    const oy = (canvas.height - BASE_H * scale) / 2;
    view.scale = scale;
    view.ox = ox;
    view.oy = oy;
  };

  const cleanup = () => {
    controller.abort();
    if (rafId) cancelAnimationFrame(rafId);
    if (resizeObserver) resizeObserver.disconnect();
  };

  loadPlanck()
    .then((lib) => {
      planck = lib;
      createWorld();
      updateHud();
      updateViewport();
      resizeObserver = new ResizeObserver(updateViewport);
      resizeObserver.observe(root);
      document.addEventListener("keydown", onKeyDown, { signal });
      document.addEventListener("keyup", onKeyUp, { signal });
      rafId = requestAnimationFrame(loop);
    })
    .catch((err) => {
      state.message = "Failed to load physics";
      updateHud();
      console.error(err);
    });

  const observer = new MutationObserver(() => {
    if (!root.isConnected) {
      observer.disconnect();
      cleanup();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return {
    title: "Pineball",
    width: 560,
    height: 820,
    content: root,
  };
}
