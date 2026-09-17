// All sound is synthesized with the Web Audio API — no audio files.
// The AudioContext is created lazily on the first user gesture
// (browsers block autoplay before that), via unlockAudio().

let audioCtx = null;

function ensureContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Call from a user-gesture handler (pointerdown) before the first playSound(). */
export function unlockAudio() {
  ensureContext();
}

function tone(freq, duration, type = 'sine', gain = 0.15) {
  const ctx = ensureContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const now = ctx.currentTime;
  gainNode.gain.setValueAtTime(gain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gainNode).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

const SOUNDS = {
  build: () => tone(440, 0.12, 'square'),
  upgrade: () => tone(660, 0.14, 'square'),
  fire: () => tone(220, 0.04, 'sawtooth', 0.05),
  coolant: () => tone(880, 0.2, 'sine'),
  meltdown: () => tone(90, 0.6, 'sawtooth', 0.2),
  'core-destroyed': () => tone(70, 0.6, 'square', 0.2),
  win: () => tone(880, 0.5, 'sine', 0.2),
};

/** @param {keyof typeof SOUNDS} name */
export function playSound(name) {
  const play = SOUNDS[name];
  if (play) play();
}
