// Web Audio API Crazy Emergency Alarm Generator
// Multi-oscillator piercing klaxon siren + high-frequency staccato alert bursts

let globalAlarmContext = null;
let globalAlarmInterval = null;

/**
 * Starts an intense, continuous emergency alarm sound loop.
 * Plays high-urgency staccato pulses (2.2 kHz - 2.8 kHz) combined with
 * an aggressive dual-tone sweeping siren that loops until dismissed.
 * Returns a cleanup function that stops the alarm.
 */
export function startCrazyAlarm() {
  stopCrazyAlarm();

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return () => {};

    const ctx = new AudioCtx();
    globalAlarmContext = ctx;

    const playUrgentAlarmBurst = () => {
      if (!ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // ── Sequence 1: 4 Rapid Piercing High-Frequency Chirps (2.2 kHz & 2.6 kHz) ──
      // Peak human ear sensitivity: 2 - 4 kHz
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        // Alternating piercing tones
        const freq = i % 2 === 0 ? 2200 : 2650;
        osc.frequency.setValueAtTime(freq, now + i * 0.11);

        // Sharp percussive envelope
        gain.gain.setValueAtTime(0.001, now + i * 0.11);
        gain.gain.linearRampToValueAtTime(0.45, now + i * 0.11 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.085);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.11);
        osc.stop(now + i * 0.11 + 0.09);
      }

      // ── Sequence 2: Dual-Oscillator Sweeping Klaxon Siren (800Hz - 1500Hz) ──
      const sirenStart = now + 0.5;
      const sirenDuration = 0.55;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator(); // detuned by 9Hz for aggressive acoustic warble
      const sirenGain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      // Sweep up then sweep down aggressively
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
      sirenGain.connect(ctx.destination);

      osc1.start(sirenStart);
      osc2.start(sirenStart);
      osc1.stop(sirenStart + sirenDuration + 0.01);
      osc2.stop(sirenStart + sirenDuration + 0.01);
    };

    // Play immediately, then repeat continuously every 1.15 seconds
    playUrgentAlarmBurst();
    globalAlarmInterval = setInterval(playUrgentAlarmBurst, 1150);

    return () => stopCrazyAlarm();
  } catch (err) {
    console.warn('[audio] Could not start crazy alarm:', err);
    return () => {};
  }
}

/**
 * Immediately stops any active crazy alarm sound and releases audio resources.
 */
export function stopCrazyAlarm() {
  if (globalAlarmInterval) {
    clearInterval(globalAlarmInterval);
    globalAlarmInterval = null;
  }
  if (globalAlarmContext) {
    try {
      globalAlarmContext.close();
    } catch {}
    globalAlarmContext = null;
  }
}

/**
 * Backward-compatible single-burst trigger
 */
export function playAlarmChime() {
  startCrazyAlarm();
}
