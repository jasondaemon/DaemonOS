export function createApp() {
  const content = document.createElement("div");
  content.style.height = "100%";

  const canvas = document.createElement("canvas");
  canvas.className = "game-canvas";
  canvas.width = 520;
  canvas.height = 320;
  content.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const lanes = [
    { y: 80, speed: 1.2, width: 60, count: 3 },
    { y: 140, speed: -1.6, width: 50, count: 4 },
    { y: 200, speed: 1.0, width: 70, count: 3 },
  ];

  const cars = lanes.flatMap((lane) => {
    return Array.from({ length: lane.count }).map((_, index) => ({
      x: index * 180,
      y: lane.y,
      width: lane.width,
      speed: lane.speed,
    }));
  });

  const player = { x: 240, y: 280, size: 18 };
  let alive = true;
  let victory = false;

  function reset() {
    player.x = 240;
    player.y = 280;
    alive = true;
    victory = false;
  }

  document.addEventListener("keydown", (event) => {
    if (!alive || victory) return;
    const step = 20;
    if (event.key === "ArrowUp") player.y -= step;
    if (event.key === "ArrowDown") player.y += step;
    if (event.key === "ArrowLeft") player.x -= step;
    if (event.key === "ArrowRight") player.x += step;
    player.x = Math.max(10, Math.min(canvas.width - 10, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 10, player.y));
  });

  function updateCars() {
    cars.forEach((car) => {
      car.x += car.speed;
      if (car.speed > 0 && car.x > canvas.width + car.width) car.x = -car.width;
      if (car.speed < 0 && car.x < -car.width) car.x = canvas.width + car.width;
    });
  }

  function checkCollision() {
    cars.forEach((car) => {
      if (
        player.x + player.size > car.x &&
        player.x - player.size < car.x + car.width &&
        player.y + player.size > car.y &&
        player.y - player.size < car.y + 20
      ) {
        alive = false;
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0f1720";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1a2532";
    ctx.fillRect(0, 60, canvas.width, 180);

    ctx.fillStyle = "#f2c358";
    cars.forEach((car) => {
      ctx.fillRect(car.x, car.y, car.width, 18);
    });

    ctx.fillStyle = victory ? "#9be58a" : alive ? "#8fe3ff" : "#f05f57";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "14px 'Avenir Next', sans-serif";
    ctx.fillText("Reach the top!", 14, 24);

    if (!alive) {
      ctx.fillStyle = "#f05f57";
      ctx.fillText("Hit! Press R to retry.", 14, 44);
    }

    if (victory) {
      ctx.fillStyle = "#9be58a";
      ctx.fillText("Safe! Press R to play again.", 14, 44);
    }
  }

  function loop() {
    if (alive && !victory) {
      updateCars();
      checkCollision();
      if (player.y < 40) victory = true;
    }
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "r") reset();
  });

  loop();

  return {
    title: "Frogger",
    width: 560,
    height: 360,
    content,
  };
}
