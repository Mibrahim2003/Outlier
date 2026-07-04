// Lightweight UI sound playback for meaningful outcomes only (save/commit
// success and errors) — never per-button-click. Caches one Audio element per
// source so we don't re-fetch, and fails silently if the browser blocks
// playback (e.g. autoplay policy before any user gesture).

const cache = new Map<string, HTMLAudioElement>();

// App-wide mute flag, synced from the user's profile preference (see useProfile).
// Defaults to on so sounds work before the profile loads.
let soundEnabled = true;

export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
};

// The curated sound set. Files live in /public/sounds.
export const SOUNDS = {
  success: '/sounds/save.wav',
  error: '/sounds/error.wav',
} as const;

export type SoundName = keyof typeof SOUNDS;

/**
 * Play a short UI sound by name. `volume` is 0–1 (kept low for a subtle,
 * premium feel). No-ops when the user has muted sounds. Safe to call from
 * event handlers and query callbacks — rejections are swallowed.
 */
export const playSound = (name: SoundName, volume = 0.35) => {
  if (!soundEnabled) return;
  if (typeof Audio === 'undefined') return; // SSR / test guard

  const src = SOUNDS[name];
  let audio = cache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = 'auto';
    cache.set(src, audio);
  }

  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {
    /* autoplay blocked, interrupted, or asset missing — ignore */
  });
};
