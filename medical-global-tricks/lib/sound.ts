'use client';
// Short synthesised UI cues (no audio files, no loops, no autoplay).
// Muted by default; enabled only by the user. Any failure is swallowed so audio can never break the app.

export type Cue = 'tap' | 'start' | 'save' | 'finish';
const KEY = 'mgt_sound';
let ctx: AudioContext | null = null;
const listeners = new Set<(on: boolean) => void>();

export function soundEnabled(): boolean {
  try { return localStorage.getItem(KEY) === 'on'; } catch { return false; }
}

export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
  listeners.forEach((l) => l(on));
  if (on) play('tap', true);
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

const NOTES: Record<Cue, [number, number, number][]> = {
  // [frequency Hz, start offset s, duration s]
  tap: [[660, 0, 0.06]],
  start: [[523.25, 0, 0.12], [783.99, 0.1, 0.16]],
  save: [[880, 0, 0.08], [1174.66, 0.07, 0.1]],
  finish: [[523.25, 0, 0.14], [659.25, 0.12, 0.14], [783.99, 0.24, 0.22]],
};

export function play(cue: Cue, force = false) {
  try {
    if (!force && !soundEnabled()) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    for (const [freq, at, dur] of NOTES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.06, now + at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + dur + 0.02);
    }
  } catch {
    /* audio unavailable — ignore */
  }
}
