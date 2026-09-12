// Web Audio API Crazy Emergency Alarm Generator
// Multi-oscillator piercing klaxon siren + high-frequency staccato alert bursts

let globalAlarmContext = null;
let globalAlarmInterval = null;
let globalMasterGain = null;
const activeOscillators = new Set();
let isAlarmRunning = false;

/**
 * Starts an intense, continuous emergency alarm sound loop.
 * Plays high-urgency staccato pulses (2.2 kHz - 2.8 kHz) combined with
 * an aggressive dual-tone sweeping siren that loops until dismissed.
 * Returns a cleanup function that stops the alarm.
 */
export function startCrazyAlarm() {
  // Always ensure previous instances are cleanly killed
  stopCrazyAlarm();
  isAlarmRunning = true;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return () => {};

    const ctx = new AudioCtx();
    globalAlarmContext = ctx;

    // Master gain node for immediate hard-kill muting
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1, ctx.currentTime);
    masterGain.connect(ctx.destination);
    globalMasterGain = masterGain;

    const playUrgentAlarmBurst = () => {
      if (!isAlarmRunning || !ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // ── Sequence 1: 4 Rapid Piercing High-Frequency Chirps (2.2 kHz & 2.6 kHz) ──
      for (let i = 0; i < 4; i++) {
        if (!isAlarmRunning) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        activeOscillators.add(osc);
        osc.onended = () => activeOscillators.delete(osc);

        osc.type = 'sawtooth';
        const freq = i % 2 === 0 ? 2200 : 2650;
        osc.frequency.setValueAtTime(freq, now + i * 0.11);

        gain.gain.setValueAtTime(0.001, now + i * 0.11);
        gain.gain.linearRampToValueAtTime(0.45, now + i * 0.11 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.085);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now + i * 0.11);
        osc.stop(now + i * 0.11 + 0.09);
      }

      // ── Sequence 2: Dual-Oscillator Sweeping Klaxon Siren (800Hz - 1500Hz) ──
      const sirenStart = now + 0.5;
      const sirenDuration = 0.55;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const sirenGain = ctx.createGain();

      activeOscillators.add(osc1);
      activeOscillators.add(osc2);
      osc1.onended = () => activeOscillators.delete(osc1);
      osc2.onended = () => activeOscillators.delete(osc2);

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      osc1.frequency.setValueAtTime(800, sirenStart);
      osc1.frequency.exponentialRampToValueAtTime(1550, sirenStart + sirenDuration * 0.45);
      osc1.frequency.exponentialRampToValueAtTime(800, sirenStart + sirenDuration);

      osc2.frequency.setValueAtTime(809, sirenStart);
      osc2.frequency.exponentialRampToValueAtTime(1560, sirenStart + sirenDuration * 0.45);
      osc2.frequency.exponentialRampToValueAtTime(809, sirenStart + sirenDuration);

      sirenGain.gain.setValueAtTime(0.001, sirenStart);
      sirenGain.gain.linearRampToValueAtTime(0.4, sirenStart + 0.04);
      sirenGain.gain.setValueAtTime(0.4, sirenStart + sirenDuration - 0.08);
      sirenGain.gain.exponentialRampToValueAtTime(0.001, sirenStart + sirenDuration);

      osc1.connect(sirenGain);
      osc2.connect(sirenGain);
      sirenGain.connect(masterGain);

      osc1.start(sirenStart);
      osc2.start(sirenStart);
      osc1.stop(sirenStart + sirenDuration + 0.01);
      osc2.stop(sirenStart + sirenDuration + 0.01);
    };

    // Play immediately, then repeat every 1.15 seconds
    playUrgentAlarmBurst();
    globalAlarmInterval = setInterval(playUrgentAlarmBurst, 1150);

    return () => stopCrazyAlarm();
  } catch (err) {
    console.warn('[audio] Could not start crazy alarm:', err);
    return () => {};
  }
}

/**
 * Instantly and completely kills any active alarm sound:
 * 1. Disables running flag
 * 2. Clears the repeat interval
 * 3. Immediately silences and disconnects the master gain
 * 4. Force-stops and disconnects all queued oscillators
 * 5. Closes the AudioContext
 * 6. Cancels any speech synthesis
 */
export function stopCrazyAlarm() {
  isAlarmRunning = false;

  if (globalAlarmInterval) {
    clearInterval(globalAlarmInterval);
    globalAlarmInterval = null;
  }

  // Instantly cut audio output through master gain
  if (globalMasterGain) {
    try {
      globalMasterGain.gain.cancelScheduledValues(0);
      globalMasterGain.gain.setValueAtTime(0, 0);
      globalMasterGain.disconnect();
    } catch {}
    globalMasterGain = null;
  }

  // Force-stop all active and scheduled oscillators
  for (const osc of activeOscillators) {
    try {
      osc.stop(0);
      osc.disconnect();
    } catch {}
  }
  activeOscillators.clear();

  // Close context
  if (globalAlarmContext) {
    try {
      globalAlarmContext.close();
    } catch {}
    globalAlarmContext = null;
  }

  // Cancel any active or queued speech announcements
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Backward-compatible single-burst trigger
 */
export function playAlarmChime() {
  startCrazyAlarm();
}
