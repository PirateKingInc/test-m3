import { createInitialState, step } from './core/simulate.js';
import { render } from './render/renderer.js';
import { setupInput } from './input/input.js';
import { playSound, unlockAudio } from './audio/audio.js';

const HIGH_SCORE_KEY = 'reactor-siege-highscore';
const DT = 1 / 60;

function loadHighScore() {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // localStorage unavailable (private mode, disabled) — high score just won't persist.
  }
}

function seedFromUrlOrClock() {
  const seedParam = new URLSearchParams(location.search).get('seed');
  return seedParam ? Number(seedParam) : Date.now() >>> 0;
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let highScore = loadHighScore();
let state = createInitialState(seedFromUrlOrClock());
let pendingActions = [];
let prevStats = { ...state.stats };
let prevGameOver = null;

function restart() {
  state = createInitialState(Date.now() >>> 0);
  pendingActions = [];
  prevStats = { ...state.stats };
  prevGameOver = null;
}

setupInput(
  canvas,
  () => state,
  (action) => {
    unlockAudio();
    pendingActions.push(action);
  },
  () => {
    unlockAudio();
    restart();
  },
);

function playStatSounds(next) {
  if (next.stats.built > prevStats.built) playSound('build');
  if (next.stats.upgraded > prevStats.upgraded) playSound('upgrade');
  if (next.stats.coolantVents > prevStats.coolantVents) playSound('coolant');
  if (next.stats.shotsFired > prevStats.shotsFired) playSound('fire');
  prevStats = { ...next.stats };
}

let last = performance.now();
let acc = 0;

function loop(now) {
  requestAnimationFrame(loop);

  const delta = Math.min((now - last) / 1000, 0.25); // cap to avoid a spiral of death on tab-back
  last = now;
  acc += delta;

  while (acc >= DT) {
    step(state, DT, pendingActions.splice(0));
    playStatSounds(state);

    if (!prevGameOver && state.gameOver) {
      playSound(state.gameOver === 'win' ? 'win' : state.gameOver);
      if (state.score > highScore) {
        highScore = state.score;
        saveHighScore(highScore);
      }
    }
    prevGameOver = state.gameOver;

    acc -= DT;
  }

  render(ctx, state, canvas.clientWidth, canvas.clientHeight, highScore);
}

requestAnimationFrame(loop);
