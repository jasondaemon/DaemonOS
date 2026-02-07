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
  const difficultySelect = document.createElement("select");
  difficultySelect.className = "menu-select";
  ["Easy", "Normal", "Hard"].forEach((label) => {
    const opt = document.createElement("option");
    opt.value = label.toLowerCase();
    opt.textContent = label;
    difficultySelect.appendChild(opt);
  });
  const startButton = document.createElement("button");
  startButton.className = "menu-button";
  startButton.textContent = "Start";
  const status = document.createElement("div");
  status.className = "game-status";
  toolbar.append(difficultySelect, startButton, status);
  wrapper.appendChild(toolbar);

  const { content, ctx, view, resizeObserver, clear } = createGameSurface({
    baseWidth: 560,
    baseHeight: 520,
  });
  wrapper.appendChild(content);

  const player = {
    x: view.baseWidth / 2,
    y: view.baseHeight - 60,
    speed: 220,
    hitbox: 6,
    invuln: 0,
    lives: 3,
  };

  let running = false;
  let score = 0;
  let wave = 1;
  let bullets = [];
  let enemyBullets = [];
  let enemies = [];
  let powerups = [];
  let shootCooldown = 0;
  let keys = new Set();

  const difficultyConfig = {
    easy: { fireRate: 0.7, bulletSpeed: 90, density: 0.8, health: 1 },
    normal: { fireRate: 0.9, bulletSpeed: 120, density: 1, health: 1.4 },
    hard: { fireRate: 1.2, bulletSpeed: 150, density: 1.25, health: 1.8 },
  };

  const currentDifficulty = () => difficultyConfig[difficultySelect.value];

  const reset = () => {
    player.x = view.baseWidth / 2;
    player.y = view.baseHeight - 60;
    player.invuln = 0;
    player.lives = 3;
    score = 0;
    wave = 1;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    powerups = [];
    shootCooldown = 0;
    running = false;
    updateStatus();
  };

  const updateStatus = () => {
    status.textContent = running ? `Lives ${player.lives} • Score ${score} • Wave ${wave}` : "Ready";
  };

  const spawnWave = () => {
    const count = 4 + wave;
    enemies = Array.from({ length: count }).map((_, idx) => ({
      x: 80 + (idx % 4) * 110,
      y: 60 + Math.floor(idx / 4) * 60,
      vx: 40 + Math.random() * 40,
      hp: currentDifficulty().health,
      type: idx % 3,
      fireTimer: 0,
      angle: Math.random() * Math.PI * 2,
    }));
  };

  const firePlayer = () => {
    if (shootCooldown > 0) return;
    shootCooldown = 0.2;
    bullets.push({ x: player.x, y: player.y - 16, vx: 0, vy: -300, power: 1 });
    if (player.multishot) {
      bullets.push({ x: player.x - 10, y: player.y - 10, vx: -80, vy: -280, power: 1 });
      bullets.push({ x: player.x + 10, y: player.y - 10, vx: 80, vy: -280, power: 1 });
    }
  };

  const spawnPowerup = (x, y) => {
    if (Math.random() > 0.25) return;
    powerups.push({ x, y, type: "multishot", vy: 60 });
  };

  const update = (dt) => {
    if (!running) return;
    const diff = currentDifficulty();
    shootCooldown = Math.max(0, shootCooldown - dt);
    if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);

    const dx = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
    const dy = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0);
    player.x = Math.max(20, Math.min(view.baseWidth - 20, player.x + dx * player.speed * dt));
    player.y = Math.max(40, Math.min(view.baseHeight - 20, player.y + dy * player.speed * dt));

    bullets.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });
    bullets = bullets.filter((b) => b.y > -40);

    enemyBullets.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });
    enemyBullets = enemyBullets.filter((b) => b.y < view.baseHeight + 40);

    powerups.forEach((p) => {
      p.y += p.vy * dt;
    });
    powerups = powerups.filter((p) => p.y < view.baseHeight + 40);

    enemies.forEach((e) => {
      e.x += Math.cos(e.angle) * e.vx * dt;
      e.y += Math.sin(e.angle) * (e.vx * 0.2) * dt;
      if (e.x < 40 || e.x > view.baseWidth - 40) e.angle = Math.PI - e.angle;
      e.fireTimer += dt * diff.fireRate * diff.density;
      if (e.fireTimer > 1.3) {
        e.fireTimer = 0;
        const pattern = e.type;
        if (pattern === 0) {
          // aimed shot
          const dxp = player.x - e.x;
          const dyp = player.y - e.y;
          const len = Math.hypot(dxp, dyp) || 1;
          enemyBullets.push({ x: e.x, y: e.y, vx: (dxp / len) * diff.bulletSpeed, vy: (dyp / len) * diff.bulletSpeed });
        } else if (pattern === 1) {
          // radial burst
          const count = 6 + Math.floor(diff.density * 2);
          for (let i = 0; i < count; i += 1) {
            const angle = (Math.PI * 2 * i) / count;
            enemyBullets.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(angle) * diff.bulletSpeed,
              vy: Math.sin(angle) * diff.bulletSpeed,
            });
          }
        } else {
          // sweeping arc
          for (let i = -2; i <= 2; i += 1) {
            const angle = e.angle + i * 0.25;
            enemyBullets.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(angle) * diff.bulletSpeed,
              vy: Math.sin(angle) * diff.bulletSpeed,
            });
          }
          e.angle += 0.2;
        }
      }
    });

    bullets.forEach((b) => {
      enemies.forEach((e) => {
        if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
          e.hp -= b.power;
          b.hit = true;
          if (e.hp <= 0) {
            e.dead = true;
            score += 50;
            spawnPowerup(e.x, e.y);
          }
        }
      });
    });
    bullets = bullets.filter((b) => !b.hit);
    enemies = enemies.filter((e) => !e.dead);

    enemyBullets.forEach((b) => {
      const dxp = b.x - player.x;
      const dyp = b.y - player.y;
      if (dxp * dxp + dyp * dyp < player.hitbox * player.hitbox && player.invuln <= 0) {
        player.lives -= 1;
        player.invuln = 2;
        if (player.lives <= 0) running = false;
      }
    });

    powerups.forEach((p) => {
      if (Math.abs(p.x - player.x) < 18 && Math.abs(p.y - player.y) < 18) {
        p.collected = true;
        player.multishot = true;
        setTimeout(() => {
          player.multishot = false;
        }, 8000);
      }
    });
    powerups = powerups.filter((p) => !p.collected);

    if (enemies.length === 0) {
      wave += 1;
      spawnWave();
    }
    updateStatus();
  };

  const draw = () => {
    clear();
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, view.baseWidth, view.baseHeight);

    ctx.fillStyle = "#7bd5ff";
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 14);
    ctx.lineTo(player.x - 12, player.y + 12);
    ctx.lineTo(player.x + 12, player.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.hitbox, 0, Math.PI * 2);
    ctx.fill();

    enemies.forEach((e) => {
      ctx.fillStyle = e.type === 0 ? "#ff6f91" : e.type === 1 ? "#ffd166" : "#6ef0c4";
      ctx.fillRect(e.x - 14, e.y - 10, 28, 20);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(e.x - 8, e.y - 4, 4, 4);
      ctx.fillRect(e.x + 4, e.y - 4, 4, 4);
    });

    ctx.fillStyle = "#ffd166";
    bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 8, 4, 12));
    ctx.fillStyle = "#ff5f5f";
    enemyBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 2, 4, 6));

    ctx.fillStyle = "#9be58a";
    powerups.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!running) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, view.baseWidth, view.baseHeight);
      ctx.fillStyle = "#e6edf6";
      ctx.font = "22px 'Avenir Next', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Spacefighter", view.baseWidth / 2, view.baseHeight / 2 - 12);
      ctx.font = "14px 'Avenir Next', sans-serif";
      ctx.fillText("Press Start to play", view.baseWidth / 2, view.baseHeight / 2 + 16);
    }
  };

  document.addEventListener("keydown", (event) => {
    keys.add(event.key.toLowerCase());
    if (event.key === " ") firePlayer();
  }, { signal });

  document.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  }, { signal });

  startButton.addEventListener("click", () => {
    if (!running) {
      running = true;
      score = 0;
      wave = 1;
      bullets = [];
      enemyBullets = [];
      powerups = [];
      player.lives = 3;
      player.invuln = 2;
      player.multishot = false;
      spawnWave();
      updateStatus();
    }
  }, { signal });

  const stopLoop = startLoop({
    step: update,
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

  reset();

  return {
    title: "Spacefighter",
    width: 640,
    height: 560,
    content: wrapper,
  };
}
