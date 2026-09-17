// Input: desktop mouse and mobile touch both funnel through the same
// Pointer Events handler and produce the same pendingActions the core
// consumes — there is no separate mobile-only code path.

import { computeLayout, worldToScreen } from '../render/renderer.js';

const SLOT_HIT_RADIUS = 28; // px, generous enough for a fingertip

/**
 * @param {HTMLCanvasElement} canvas
 * @param {() => object} getState returns the current GameState.
 * @param {(action: object) => void} enqueueAction
 * @param {() => void} onRestart called on any tap/click while gameOver.
 */
export function setupInput(canvas, getState, enqueueAction, onRestart) {
  function handlePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const state = getState();

    if (state.gameOver) {
      onRestart();
      return;
    }

    const { cx, cy, scale, ringRadius, coolantButton } = computeLayout(rect.width, rect.height);

    if (
      x >= coolantButton.x &&
      x <= coolantButton.x + coolantButton.w &&
      y >= coolantButton.y &&
      y <= coolantButton.y + coolantButton.h
    ) {
      enqueueAction({ type: 'coolant' });
      return;
    }

    for (const turret of state.turrets) {
      const pos = worldToScreen(ringRadius, turret.angle, cx, cy, scale);
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) <= SLOT_HIT_RADIUS) {
        enqueueAction(turret.level === 0 ? { type: 'build', slot: turret.id } : { type: 'upgrade', slot: turret.id });
        return;
      }
    }
  }

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      event.preventDefault();
      handlePointer(event.clientX, event.clientY);
    },
    { passive: false },
  );
}
