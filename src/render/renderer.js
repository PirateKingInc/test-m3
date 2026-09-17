// Canvas rendering — pure presentation, reads GameState but never
// mutates it. Everything is drawn with canvas 2D primitives; no
// images, no sprite sheets.

import { SPAWN_RADIUS, CORE_HIT_RADIUS, RUN_DURATION, HEAT_MAX, CORE_MAX_HP } from '../core/constants.js';

const WORLD_MARGIN = 0.92; // fraction of the smaller canvas dimension used for the play field

function worldToScreen(radius, angle, cx, cy, scale) {
  return {
    x: cx + Math.cos(angle) * radius * scale,
    y: cy + Math.sin(angle) * radius * scale,
  };
}

/**
 * Shared layout math so input.js can hit-test the same slot positions
 * the renderer draws — one source of truth for "where is slot N".
 */
export function computeLayout(width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const scale = (Math.min(width, height) * WORLD_MARGIN) / 2 / SPAWN_RADIUS;
  const ringRadius = SPAWN_RADIUS * 0.35;
  const coolantButton = { x: width / 2 - 90, y: height - 56, w: 180, h: 40 };
  return { cx, cy, scale, ringRadius, coolantButton };
}

function heatColor(heat) {
  const t = Math.min(1, heat / HEAT_MAX);
  const r = Math.round(60 + t * 195);
  const g = Math.round(200 - t * 170);
  const b = Math.round(220 - t * 200);
  return `rgb(${r},${g},${b})`;
}

function drawCore(ctx, state, cx, cy, scale) {
  const hpFrac = Math.max(0, state.coreHP / CORE_MAX_HP);
  ctx.beginPath();
  ctx.arc(cx, cy, CORE_HIT_RADIUS * scale * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = heatColor(state.heat);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke();

  // core HP ring
  ctx.beginPath();
  ctx.arc(cx, cy, CORE_HIT_RADIUS * scale * 2.1, -Math.PI / 2, -Math.PI / 2 + hpFrac * Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#7CFF9E';
  ctx.stroke();
}

function drawTurrets(ctx, state, cx, cy, scale, ringRadius) {
  for (const turret of state.turrets) {
    const { x, y } = worldToScreen(ringRadius, turret.angle, cx, cy, scale);
    const size = 10 + turret.level * 4;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    if (turret.level === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const levelColors = ['', '#4FD1FF', '#7CFF9E', '#FFD86B'];
      ctx.fillStyle = levelColors[turret.level] || '#4FD1FF';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#0B0F14';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(turret.level), x, y);
    }
  }
}

function drawEnemies(ctx, state, cx, cy, scale) {
  for (const enemy of state.enemies) {
    const { x, y } = worldToScreen(enemy.radius, enemy.angle, cx, cy, scale);
    const hpFrac = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.beginPath();
    ctx.arc(x, y, 5 + hpFrac * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, ${Math.round(90 + hpFrac * 60)}, 90, 0.9)`;
    ctx.fill();
  }
}

function drawHUD(ctx, state, width, coolantButton) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#EAF2F8';
  ctx.font = 'bold 16px sans-serif';

  const timeLeft = Math.max(0, RUN_DURATION - state.time);
  const mm = Math.floor(timeLeft / 60);
  const ss = Math.floor(timeLeft % 60)
    .toString()
    .padStart(2, '0');
  ctx.fillText(`Time ${mm}:${ss}`, 12, 12);
  ctx.fillText(`Wave ${state.wave}`, 12, 34);
  ctx.fillText(`Score ${state.score}`, 12, 56);
  ctx.fillText(`Energy ${Math.floor(state.energy)}`, 12, 78);

  // heat bar
  const barW = 160;
  const barX = width - barW - 12;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(barX, 12, barW, 14);
  ctx.fillStyle = heatColor(state.heat);
  ctx.fillRect(barX, 12, barW * Math.min(1, state.heat / HEAT_MAX), 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeRect(barX, 12, barW, 14);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#EAF2F8';
  ctx.fillText('HEAT', barX, 30);

  // coolant button
  ctx.fillStyle = 'rgba(79,209,255,0.25)';
  ctx.fillRect(coolantButton.x, coolantButton.y, coolantButton.w, coolantButton.h);
  ctx.strokeStyle = '#4FD1FF';
  ctx.strokeRect(coolantButton.x, coolantButton.y, coolantButton.w, coolantButton.h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#EAF2F8';
  ctx.fillText('VENT COOLANT', coolantButton.x + coolantButton.w / 2, coolantButton.y + coolantButton.h / 2);
}

function drawGameOver(ctx, state, width, height, highScore) {
  ctx.fillStyle = 'rgba(5,8,12,0.75)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#EAF2F8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const title =
    state.gameOver === 'win' ? 'REACTOR STABILIZED' : state.gameOver === 'meltdown' ? 'MELTDOWN' : 'CORE DESTROYED';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(title, width / 2, height / 2 - 40);

  ctx.font = '18px sans-serif';
  ctx.fillText(`Score ${state.score}  |  Survived ${Math.floor(state.time)}s`, width / 2, height / 2);
  ctx.fillText(`Best score: ${highScore}`, width / 2, height / 2 + 28);

  ctx.font = '14px sans-serif';
  ctx.fillText('Tap / click anywhere to play again', width / 2, height / 2 + 64);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state GameState
 * @param {number} width canvas width in CSS pixels
 * @param {number} height canvas height in CSS pixels
 * @param {number} highScore best score from localStorage
 * @returns {{x:number,y:number,w:number,h:number}} the coolant button hit box, for input.js
 */
export function render(ctx, state, width, height, highScore) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0B0F14';
  ctx.fillRect(0, 0, width, height);

  const { cx, cy, scale, ringRadius, coolantButton } = computeLayout(width, height);

  // range/breach guide rings
  ctx.beginPath();
  ctx.arc(cx, cy, SPAWN_RADIUS * scale, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawEnemies(ctx, state, cx, cy, scale);
  drawTurrets(ctx, state, cx, cy, scale, ringRadius);
  drawCore(ctx, state, cx, cy, scale);

  drawHUD(ctx, state, width, coolantButton);

  if (state.gameOver) {
    drawGameOver(ctx, state, width, height, highScore);
  }

  return coolantButton;
}

export { worldToScreen };
