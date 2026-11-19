const TARGET_RATIO = 40;
const APP_HEADER_HEIGHT = 0;
const POINTS_ACCUMULATOR = 10;
const TARGET_SPAWN_INTERVAL = 20000;
const SHOOT_SOUNDS_ELEMENTS = document.querySelectorAll("audio");
const DIFFICULTY_OPTIONS_KEY = "difficulty-option";
const SHOOT_SOUND_KEY = "shoot-sound-option";

const pointsCounter = document.getElementById("points-counter");
const restartBtn = document.getElementById("restart-btn");

const canvasContainer = document.getElementById("canvas-container");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const targets = [];
let originalTargetLifetime;
let targetLifetime = 10000;
let gameStartedAt = null;
let lastTargetSpawn = null;

const audio = new Audio();

let animationFrameId;

function resizeCanvas() {
  const rect = canvasContainer.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  paintTargets();
}

function newTarget(createdAt = null, centered = false) {
  return {
    x: centered
      ? canvas.width / 2
      : Math.random() * (canvas.width - TARGET_RATIO * 2) + TARGET_RATIO,
    y: centered
      ? canvas.height / 2
      : Math.random() * (canvas.height - TARGET_RATIO * 2) + TARGET_RATIO,
    radius: TARGET_RATIO,
    createdAt,
  };
}

function paintTargets() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#333";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < targets.length; i++) {
    context.beginPath();
    context.arc(targets[i].x, targets[i].y, targets[i].radius, 0, 2 * Math.PI);
    context.fillStyle = "#9d0208";
    context.fill();
    context.stroke();
  }
}

function restart() {
  cancelAnimationFrameHandler();
  pointsCounter.textContent = "0";
  targets.splice(0, targets.length, newTarget(null, true));
  paintTargets();
  targetLifetime = originalTargetLifetime;
  gameStartedAt = null;
  lastTargetSpawn = null;
}

function updatePoints(action = "add") {
  const current = Number(pointsCounter.textContent);
  let points = 0;
  if (action === "reduce") {
    if (current - POINTS_ACCUMULATOR <= 0) {
      points = 0;
    } else {
      points = current - POINTS_ACCUMULATOR;
    }
  } else {
    points = current + POINTS_ACCUMULATOR;
  }
  pointsCounter.textContent = points.toString();
}

function clickCanvasHandler(event) {
  startAnimation();

  let targetHit = false;

  for (let i = 0; i < targets.length; i++) {
    const dx = targets[i].x - event.offsetX;
    const dy = targets[i].y - event.offsetY;
    const distance = dx ** 2 + dy ** 2;
    if (distance <= targets[i].radius ** 2) {
      targetHit = true;
      targets.splice(i, 1, newTarget(performance.now()));
      updatePoints();
      if (audio.src) {
        audio.pause();
        audio.currentTime = 0;
        audio.play();
      }

      targetLifetime -= 5;

      if (targetLifetime <= 1000) {
        targetLifetime = originalTargetLifetime;
      }

      break;
    }
  }
  if (!targetHit) {
    updatePoints("reduce");
  }

  paintTargets();
}

function initializeControls(key) {
  const defaultValue = key === DIFFICULTY_OPTIONS_KEY ? "10" : "1";
  const savedValue = localStorage.getItem(key) ?? defaultValue;
  localStorage.setItem(key, savedValue);

  const options = document.getElementsByName(key);
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    option.checked = savedValue === option.value;
  }
  if (key === SHOOT_SOUND_KEY) {
    initializeAudioEffectSrc(savedValue);
  }
  if (key === DIFFICULTY_OPTIONS_KEY) {
    const value = Number(`${savedValue}000`);
    originalTargetLifetime = value;
    targetLifetime = value;
  }
}

function initializeAudioEffectSrc(value) {
  for (let i = 0; i < SHOOT_SOUNDS_ELEMENTS.length; i++) {
    const option = SHOOT_SOUNDS_ELEMENTS[i];
    if (option.id === `${SHOOT_SOUND_KEY}-${value}`) {
      audio.src = option.src;
      break;
    }
  }
}

function updateTargets() {
  const now = performance.now();
  const elapsed = now - gameStartedAt;
  const spawnInterval = Math.max(10000, TARGET_SPAWN_INTERVAL - elapsed / 20);
  if (now - lastTargetSpawn >= spawnInterval) {
    targets.push(newTarget(now));
    lastTargetSpawn = now;
  }
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    const targetElapsed = now - target.createdAt;
    const progress = Math.min(targetElapsed / targetLifetime, 1);
    target.radius = TARGET_RATIO * (1 - progress);

    if (progress >= 1) {
      targets.splice(i, 1);
      targets.push(newTarget(now));
    }
  }
  paintTargets();
  animationFrameId = requestAnimationFrame(updateTargets);
}

function startAnimation() {
  if (animationFrameId !== undefined || document.hidden) {
    return;
  }
  const now = performance.now();

  if (gameStartedAt === null) {
    gameStartedAt = now;
    lastTargetSpawn = now;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (target.createdAt === null) {
        target.createdAt = now;
      }
    }
  }
  animationFrameId = requestAnimationFrame(updateTargets);
}

function cancelAnimationFrameHandler() {
  if (animationFrameId !== undefined) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = undefined;
}

canvasContainer.addEventListener("click", clickCanvasHandler);
document.getElementById("restart-btn").addEventListener("click", restart);

document
  .getElementById("controls-difficulty-form")
  .addEventListener("change", function (event) {
    const value = event.target.value;
    localStorage.setItem(DIFFICULTY_OPTIONS_KEY, value);
    const timelifeValue = Number(`${value}000`);
    originalTargetLifetime = timelifeValue;
    targetLifetime = timelifeValue;
  });

document
  .getElementById("controls-soundeffect-form")
  .addEventListener("change", function (event) {
    const value = event.target.value;
    localStorage.setItem(SHOOT_SOUND_KEY, value);
    initializeAudioEffectSrc(value);
  });

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    restart();
  }
});

const resizeObserver = new ResizeObserver(function () {
  resizeCanvas();
});
resizeObserver.observe(canvasContainer);

initializeControls(DIFFICULTY_OPTIONS_KEY);
initializeControls(SHOOT_SOUND_KEY);
resizeCanvas();
restart();
