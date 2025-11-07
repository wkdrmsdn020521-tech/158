diff --git a/app.js b/app.js
new file mode 100644
index 0000000000000000000000000000000000000000..3d695e23ceaf7a6badd16cabb9014ffe27bc154f
--- /dev/null
+++ b/app.js
@@ -0,0 +1,574 @@
+const {
+  Engine,
+  Runner,
+  Bodies,
+  World,
+  Body,
+  Events,
+  Composite,
+  Vector,
+} = Matter;
+
+const fieldCanvas = document.getElementById("field");
+const fieldCtx = fieldCanvas.getContext("2d");
+const roadmapCanvas = document.getElementById("roadmap");
+const roadmapCtx = roadmapCanvas.getContext("2d");
+
+const spawnBtn = document.getElementById("spawnBtn");
+const shuffleBtn = document.getElementById("shuffleBtn");
+const resetBtn = document.getElementById("resetBtn");
+const textarea = document.getElementById("ballInput");
+const leaderboardEl = document.getElementById("leaderboard");
+const ballCountEl = document.getElementById("ballCount");
+const finishCountEl = document.getElementById("finishCount");
+const fieldStatusEl = document.getElementById("fieldStatus");
+const cameraFocusEl = document.getElementById("cameraFocus");
+
+const FIELD_WIDTH = 780;
+const FIELD_HEIGHT = 1800;
+const VIEW_HEIGHT = fieldCanvas.height;
+const BALL_RADIUS = 14;
+const FINISH_LINE_Y = FIELD_HEIGHT - 80;
+const START_AREA_Y = 120;
+
+const engine = Engine.create({
+  gravity: { x: 0, y: 1 },
+});
+const runner = Runner.create();
+Runner.run(runner, engine);
+
+const world = engine.world;
+world.frictionAir = 0.015;
+
+const state = {
+  balls: [],
+  finished: [],
+  finishOrder: 0,
+  cameraY: 0,
+  cameraZoom: 1,
+  targetZoom: 1,
+  cameraMode: "전체",
+  cameraTarget: null,
+  roadmapHover: 0,
+};
+
+const colors = [
+  "#ff7b7b",
+  "#ffc857",
+  "#72efdd",
+  "#64dfdf",
+  "#80ffdb",
+  "#ff70a6",
+  "#f8f9fa",
+  "#ffd6a5",
+  "#d0a7ff",
+  "#a0c4ff",
+  "#9bf6ff",
+];
+
+function resetWorld() {
+  Composite.clear(engine.world, false);
+  state.balls = [];
+  state.finished = [];
+  state.finishOrder = 0;
+  state.cameraY = 0;
+  state.cameraTarget = null;
+  state.cameraMode = "전체";
+  state.targetZoom = 1;
+  state.cameraZoom = 1;
+  ballCountEl.textContent = "0";
+  finishCountEl.textContent = "0";
+  leaderboardEl.innerHTML = "";
+  fieldStatusEl.textContent = "대기 중";
+  setupBoundaries();
+  setupObstacles();
+}
+
+function setupBoundaries() {
+  const invisible = { visible: false };
+  const boundaries = [
+    Bodies.rectangle(FIELD_WIDTH / 2, -40, FIELD_WIDTH, 80, {
+      isStatic: true,
+      render: invisible,
+    }),
+    Bodies.rectangle(FIELD_WIDTH / 2, FIELD_HEIGHT + 40, FIELD_WIDTH, 80, {
+      isStatic: true,
+      render: invisible,
+    }),
+    Bodies.rectangle(-40, FIELD_HEIGHT / 2, 80, FIELD_HEIGHT * 2, {
+      isStatic: true,
+      render: invisible,
+    }),
+    Bodies.rectangle(FIELD_WIDTH + 40, FIELD_HEIGHT / 2, 80, FIELD_HEIGHT * 2, {
+      isStatic: true,
+      render: invisible,
+    }),
+  ];
+  World.add(world, boundaries);
+}
+
+const rotatingObstacles = [];
+const movingObstacles = [];
+
+function setupObstacles() {
+  const staticPlates = [
+    Bodies.rectangle(150, 220, 220, 16, { isStatic: true, angle: -0.2 }),
+    Bodies.rectangle(620, 240, 220, 16, { isStatic: true, angle: 0.25 }),
+    Bodies.rectangle(390, 420, 320, 18, { isStatic: true }),
+    Bodies.rectangle(120, 620, 180, 18, { isStatic: true, angle: 0.6 }),
+    Bodies.rectangle(650, 650, 180, 18, { isStatic: true, angle: -0.6 }),
+    Bodies.rectangle(390, 820, 260, 18, { isStatic: true }),
+    Bodies.rectangle(390, 1130, 380, 18, { isStatic: true, angle: 0.2 }),
+    Bodies.rectangle(390, 1260, 380, 18, { isStatic: true, angle: -0.25 }),
+    Bodies.rectangle(220, 1490, 220, 18, { isStatic: true }),
+    Bodies.rectangle(560, 1490, 220, 18, { isStatic: true }),
+  ];
+
+  const rotatorA = Bodies.rectangle(390, 980, 200, 18, {
+    isStatic: true,
+    render: { fillStyle: "#00ffc6" },
+  });
+  const rotatorB = Bodies.rectangle(390, 1380, 240, 18, {
+    isStatic: true,
+    render: { fillStyle: "#00ffc6" },
+  });
+
+  rotatingObstacles.length = 0;
+  rotatingObstacles.push({ body: rotatorA, speed: 0.015 });
+  rotatingObstacles.push({ body: rotatorB, speed: -0.018 });
+
+  const bumpers = [
+    Bodies.circle(390, 520, 16, { isStatic: true }),
+    Bodies.circle(320, 520, 16, { isStatic: true }),
+    Bodies.circle(460, 520, 16, { isStatic: true }),
+    Bodies.circle(250, 520, 16, { isStatic: true }),
+    Bodies.circle(530, 520, 16, { isStatic: true }),
+    Bodies.circle(180, 520, 16, { isStatic: true }),
+    Bodies.circle(600, 520, 16, { isStatic: true }),
+    Bodies.circle(390, 720, 14, { isStatic: true }),
+    Bodies.circle(340, 720, 14, { isStatic: true }),
+    Bodies.circle(440, 720, 14, { isStatic: true }),
+  ];
+
+  movingObstacles.length = 0;
+  const slider = Bodies.rectangle(390, 350, 160, 12, { isStatic: true });
+  movingObstacles.push({
+    body: slider,
+    origin: { x: 390, y: 350 },
+    amplitude: 140,
+    speed: 0.0025,
+    axis: "x",
+  });
+
+  World.add(world, [...staticPlates, rotatorA, rotatorB, ...bumpers, slider]);
+}
+
+function randomColor() {
+  return colors[Math.floor(Math.random() * colors.length)];
+}
+
+function parseInput(value) {
+  const tokens = value
+    .split(/\n|,|;/)
+    .map((s) => s.trim())
+    .filter(Boolean);
+
+  const result = [];
+  for (const token of tokens) {
+    const normalized = token.replace(/\s+/g, "");
+    if (!normalized) continue;
+
+    const matches = normalized.split(/\+/);
+    matches.forEach((piece) => {
+      if (!piece) return;
+      const multMatch = piece.match(/(.+?)\*(\d+)/);
+      if (multMatch) {
+        const name = multMatch[1];
+        const count = Math.min(20, Math.max(1, parseInt(multMatch[2], 10)));
+        for (let i = 0; i < count; i++) {
+          result.push(name);
+        }
+      } else {
+        result.push(piece);
+      }
+    });
+  }
+  return result;
+}
+
+function createBall(name, index, total) {
+  const x = FIELD_WIDTH / 2 + (index - total / 2) * (BALL_RADIUS * 2.4);
+  const y = START_AREA_Y + Math.random() * 40;
+
+  const body = Bodies.circle(x, y, BALL_RADIUS, {
+    restitution: 0.6,
+    friction: 0.1,
+    frictionAir: 0.02,
+    label: name,
+  });
+
+  const color = randomColor();
+  const ball = {
+    id:
+      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
+        ? crypto.randomUUID()
+        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
+    name,
+    body,
+    color,
+    finished: false,
+    finishRank: null,
+    skillInterval: 4000 + Math.random() * 5000,
+    skillTimer: 2000 + Math.random() * 3000,
+    shockRadius: 110,
+    shockForce: 0.015,
+  };
+
+  state.balls.push(ball);
+  World.add(world, body);
+  return ball;
+}
+
+function spawnBalls() {
+  const names = parseInput(textarea.value);
+  if (!names.length) {
+    textarea.focus();
+    return;
+  }
+
+  fieldStatusEl.textContent = "레이스 진행 중";
+  World.clear(world, false);
+  setupBoundaries();
+  setupObstacles();
+  state.balls = [];
+  state.finished = [];
+  state.finishOrder = 0;
+  names.forEach((name, index) => createBall(name, index, names.length));
+  updateCounts();
+}
+
+function updateCounts() {
+  ballCountEl.textContent = state.balls.length.toString();
+  finishCountEl.textContent = state.finished.length.toString();
+}
+
+function shuffleBalls() {
+  state.balls.forEach((ball) => {
+    const body = ball.body;
+    Body.setPosition(body, {
+      x: FIELD_WIDTH / 2 + (Math.random() - 0.5) * 200,
+      y: START_AREA_Y + Math.random() * 80,
+    });
+    Body.setVelocity(body, { x: (Math.random() - 0.5) * 4, y: -Math.random() * 4 });
+  });
+  fieldStatusEl.textContent = "섞는 중";
+  setTimeout(() => {
+    fieldStatusEl.textContent = "레이스 진행 중";
+  }, 800);
+}
+
+function updateLeaderboard() {
+  const activeBalls = state.balls.slice().sort((a, b) => {
+    if (a.finished && b.finished) return a.finishRank - b.finishRank;
+    if (a.finished) return -1;
+    if (b.finished) return 1;
+    return getProgress(b) - getProgress(a);
+  });
+
+  leaderboardEl.innerHTML = "";
+  activeBalls.forEach((ball, index) => {
+    const li = document.createElement("li");
+    if (ball.finished) li.classList.add("finished");
+    const rankNumber = ball.finished ? ball.finishRank : index + 1;
+    li.innerHTML = `
+      <span>
+        <span class="rank">${rankNumber}</span>
+        <span class="name" style="color:${ball.color}">${ball.name}</span>
+      </span>
+      <span class="badge">${ball.finished ? "FINISH" : (getProgress(ball) * 100).toFixed(0)}%</span>
+    `;
+    leaderboardEl.appendChild(li);
+  });
+}
+
+function getProgress(ball) {
+  const pos = ball.body.position;
+  const progress = Math.min(1, Math.max(0, pos.y / FINISH_LINE_Y));
+  return progress;
+}
+
+function handleFinish(ball) {
+  if (ball.finished) return;
+  ball.finished = true;
+  state.finishOrder += 1;
+  ball.finishRank = state.finishOrder;
+  state.finished.push(ball);
+  finishCountEl.textContent = state.finished.length.toString();
+  if (state.finished.length === state.balls.length && state.balls.length > 0) {
+    fieldStatusEl.textContent = `우승: ${ball.name}`;
+  }
+}
+
+function updateSkills(delta) {
+  state.balls.forEach((ball) => {
+    if (ball.finished) return;
+    ball.skillTimer -= delta;
+    if (ball.skillTimer <= 0) {
+      triggerShockwave(ball);
+      ball.skillTimer = ball.skillInterval + Math.random() * 2000;
+    }
+  });
+}
+
+function triggerShockwave(ball) {
+  const origin = ball.body.position;
+  state.balls.forEach((other) => {
+    if (other === ball || other.finished) return;
+    const distance = Matter.Vector.magnitude(
+      Vector.sub(other.body.position, origin)
+    );
+    if (distance < ball.shockRadius) {
+      const forceDir = Vector.normalise(Vector.sub(other.body.position, origin));
+      const magnitude = (ball.shockRadius - distance) / ball.shockRadius;
+      Body.applyForce(
+        other.body,
+        other.body.position,
+        Vector.mult(forceDir, magnitude * ball.shockForce)
+      );
+    }
+  });
+}
+
+function updateCamera(delta) {
+  const unfinished = state.balls.filter((ball) => !ball.finished);
+  const targetCount = unfinished.length;
+  state.targetZoom = targetCount <= 3 ? 1.35 : 1;
+  engine.timing.timeScale += ((targetCount <= 3 ? 0.6 : 1) - engine.timing.timeScale) * 0.02;
+
+  let targetY = state.cameraY;
+  if (state.cameraTarget && !state.cameraTarget.finished) {
+    targetY = clamp(
+      state.cameraTarget.body.position.y - VIEW_HEIGHT / (2 * state.cameraZoom),
+      0,
+      FIELD_HEIGHT - VIEW_HEIGHT
+    );
+    state.cameraMode = state.cameraTarget.name;
+  } else {
+    const focusBall = unfinished.reduce((prev, curr) =>
+      prev && prev.body.position.y > curr.body.position.y ? prev : curr
+    );
+    if (focusBall) {
+      targetY = clamp(
+        focusBall.body.position.y - VIEW_HEIGHT / (2 * state.cameraZoom),
+        0,
+        FIELD_HEIGHT - VIEW_HEIGHT
+      );
+      state.cameraMode = "선두";
+    } else {
+      state.cameraMode = "전체";
+    }
+  }
+
+  state.cameraY += (targetY - state.cameraY) * 0.08;
+  state.cameraZoom += (state.targetZoom - state.cameraZoom) * 0.05;
+  cameraFocusEl.textContent = state.cameraMode;
+}
+
+function clamp(value, min, max) {
+  return Math.max(min, Math.min(max, value));
+}
+
+function drawField() {
+  const ctx = fieldCtx;
+  ctx.save();
+  ctx.clearRect(0, 0, fieldCanvas.width, fieldCanvas.height);
+  ctx.translate(0, -state.cameraY * state.cameraZoom);
+  ctx.scale(state.cameraZoom, state.cameraZoom);
+
+  drawFieldBackground(ctx);
+  drawFinishLine(ctx);
+  drawObstacles(ctx);
+
+  state.balls.forEach((ball) => {
+    const { x, y } = ball.body.position;
+    ctx.save();
+    ctx.translate(x, y);
+    ctx.beginPath();
+    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
+    ctx.fillStyle = ball.color;
+    ctx.fill();
+    ctx.lineWidth = 2;
+    ctx.strokeStyle = "rgba(0,0,0,0.45)";
+    ctx.stroke();
+    ctx.fillStyle = "#111";
+    ctx.font = "12px Pretendard";
+    ctx.textAlign = "center";
+    ctx.fillText(ball.name, 0, -BALL_RADIUS - 6);
+    if (ball.finished) {
+      ctx.font = "bold 14px Pretendard";
+      ctx.fillStyle = "#00ffc6";
+      ctx.fillText(`#${ball.finishRank}`, 0, BALL_RADIUS + 18);
+    }
+    ctx.restore();
+  });
+
+  ctx.restore();
+}
+
+function drawFieldBackground(ctx) {
+  ctx.save();
+  ctx.strokeStyle = "rgba(61, 123, 255, 0.35)";
+  ctx.lineWidth = 4;
+  ctx.beginPath();
+  ctx.moveTo(60, 80);
+  ctx.lineTo(60, FIELD_HEIGHT - 60);
+  ctx.moveTo(FIELD_WIDTH - 60, 80);
+  ctx.lineTo(FIELD_WIDTH - 60, FIELD_HEIGHT - 60);
+  ctx.stroke();
+  ctx.restore();
+}
+
+function drawFinishLine(ctx) {
+  ctx.save();
+  ctx.strokeStyle = "rgba(0, 255, 198, 0.6)";
+  ctx.setLineDash([10, 12]);
+  ctx.lineWidth = 5;
+  ctx.beginPath();
+  ctx.moveTo(120, FINISH_LINE_Y);
+  ctx.lineTo(FIELD_WIDTH - 120, FINISH_LINE_Y);
+  ctx.stroke();
+  ctx.restore();
+}
+
+function drawObstacles(ctx) {
+  const bodies = Composite.allBodies(engine.world);
+  ctx.save();
+  ctx.lineWidth = 3;
+  ctx.strokeStyle = "rgba(61, 123, 255, 0.5)";
+  ctx.fillStyle = "rgba(61, 123, 255, 0.1)";
+  bodies.forEach((body) => {
+    if (body.render && body.render.visible === false) return;
+    if (body.circleRadius) {
+      ctx.beginPath();
+      ctx.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
+      ctx.fill();
+      ctx.stroke();
+    } else {
+      ctx.beginPath();
+      ctx.moveTo(body.vertices[0].x, body.vertices[0].y);
+      for (let j = 1; j < body.vertices.length; j++) {
+        ctx.lineTo(body.vertices[j].x, body.vertices[j].y);
+      }
+      ctx.closePath();
+      ctx.fill();
+      ctx.stroke();
+    }
+  });
+  ctx.restore();
+}
+
+function drawRoadmap() {
+  const ctx = roadmapCtx;
+  ctx.save();
+  ctx.clearRect(0, 0, roadmapCanvas.width, roadmapCanvas.height);
+  ctx.fillStyle = "rgba(10, 16, 32, 0.9)";
+  ctx.fillRect(0, 0, roadmapCanvas.width, roadmapCanvas.height);
+  const scaleX = roadmapCanvas.width / FIELD_WIDTH;
+  const scaleY = roadmapCanvas.height / FIELD_HEIGHT;
+  ctx.scale(scaleX, scaleY);
+
+  drawFieldBackground(ctx);
+  drawFinishLine(ctx);
+  drawObstacles(ctx);
+
+  state.balls.forEach((ball) => {
+    const { x, y } = ball.body.position;
+    ctx.beginPath();
+    ctx.arc(x, y, BALL_RADIUS * 0.6, 0, Math.PI * 2);
+    ctx.fillStyle = ball.color;
+    ctx.fill();
+  });
+
+  ctx.restore();
+}
+
+let lastTimestamp = performance.now();
+
+function animate(timestamp) {
+  const delta = timestamp - lastTimestamp;
+  lastTimestamp = timestamp;
+
+  updateRotatingObstacles(delta);
+  updateMovingObstacles(timestamp);
+  updateSkills(delta);
+  updateCamera(delta);
+  checkFinish();
+  updateLeaderboard();
+  drawField();
+  drawRoadmap();
+
+  requestAnimationFrame(animate);
+}
+
+function updateRotatingObstacles(delta) {
+  rotatingObstacles.forEach(({ body, speed }) => {
+    Body.rotate(body, speed * delta);
+  });
+}
+
+function updateMovingObstacles(time) {
+  movingObstacles.forEach(({ body, origin, amplitude, speed, axis }) => {
+    const offset = Math.sin(time * speed) * amplitude;
+    if (axis === "x") {
+      Body.setPosition(body, { x: origin.x + offset, y: origin.y });
+    } else {
+      Body.setPosition(body, { x: origin.x, y: origin.y + offset });
+    }
+  });
+}
+
+function checkFinish() {
+  state.balls.forEach((ball) => {
+    if (!ball.finished && ball.body.position.y >= FINISH_LINE_Y) {
+      handleFinish(ball);
+    }
+  });
+}
+
+function pickRandomFocus() {
+  const unfinished = state.balls.filter((b) => !b.finished);
+  if (!unfinished.length) {
+    state.cameraTarget = null;
+    return;
+  }
+  const target = unfinished[Math.floor(Math.random() * unfinished.length)];
+  state.cameraTarget = target;
+  state.cameraMode = target.name;
+}
+
+setInterval(pickRandomFocus, 8000);
+
+spawnBtn.addEventListener("click", spawnBalls);
+shuffleBtn.addEventListener("click", shuffleBalls);
+resetBtn.addEventListener("click", resetWorld);
+
+roadmapCanvas.addEventListener("mousemove", (event) => {
+  const rect = roadmapCanvas.getBoundingClientRect();
+  const ratio = (event.clientY - rect.top) / rect.height;
+  state.cameraY = clamp(ratio * FIELD_HEIGHT - VIEW_HEIGHT / 2, 0, FIELD_HEIGHT - VIEW_HEIGHT);
+  state.cameraTarget = null;
+  state.cameraMode = "드래그";
+});
+
+roadmapCanvas.addEventListener("mouseleave", () => {
+  state.cameraTarget = null;
+});
+
+textarea.addEventListener("keydown", (event) => {
+  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
+    spawnBalls();
+  }
+});
+
+resetWorld();
+requestAnimationFrame(animate);
