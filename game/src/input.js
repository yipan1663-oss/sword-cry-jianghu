// Keyboard, mouse, and touch input.
export const ACT_CONFIRM = 1;
export const ACT_PAUSE = 2;
export const ACT_SLASH = 4;
export const ACT_DASH = 8;
export const ACT_WAVE = 16;
export const ACT_JUMP = 32;
export const ACT_MUTE = 64;

const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const JUMP = new Set(['KeyW', 'ArrowUp', 'Space']);

export function createInput(canvas) {
  let left = false, right = false;
  let actions = 0;

  function press(flag) { actions |= flag; }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (LEFT.has(e.code)) { left = true; e.preventDefault(); }
    else if (RIGHT.has(e.code)) { right = true; e.preventDefault(); }
    else if (JUMP.has(e.code)) { press(ACT_JUMP); e.preventDefault(); }
    else if (e.code === 'KeyJ') press(ACT_SLASH);
    else if (e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') press(ACT_DASH);
    else if (e.code === 'KeyL') press(ACT_WAVE);
    else if (e.code === 'KeyP' || e.code === 'Escape') press(ACT_PAUSE);
    else if (e.code === 'Enter') press(ACT_CONFIRM);
    else if (e.code === 'KeyM') press(ACT_MUTE);
  });
  window.addEventListener('keyup', (e) => {
    if (LEFT.has(e.code)) left = false;
    if (RIGHT.has(e.code)) right = false;
  });
  window.addEventListener('blur', () => { left = false; right = false; });

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    // On title/results click acts as confirm+slash intent; main decides by screen.
    press(ACT_CONFIRM | ACT_SLASH);
  });

  // Basic touch: tap right side slash/confirm, left side move hint not required but handled by keyboard;
  // pointerdown already covers tap/click.

  return {
    dir() { return (right ? 1 : 0) - (left ? 1 : 0); },
    takeActions() { const a = actions; actions = 0; return a; },
  };
}
