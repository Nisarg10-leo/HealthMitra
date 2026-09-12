// Web Audio API Multi-Tone Medication Alarm Generator
// Supports 6 distinct synthesized tones: Crazy Siren, Gentle Chimes, Digital Beep, Clinical Telemetry, Vintage Twin-Bell, Sonar Ping.

export const ALARM_TONES = [
  {
    id: 'crazy-siren',
    name: 'Urgent Klaxon Siren',
    nameHi: 'तीव्र आपातकालीन सायरन',
    badge: 'Urgent & Loud',
    badgeHi: 'तीव्र और ज़ोरदार',
    desc: 'High-frequency piercing chirps and sweeping dual siren. Impossible to sleep through.',
    descHi: 'तेज आवाज और सायरन — गहरी नींद में भी सुनाई देने वाला अलार्म।',
    iconKey: 'siren',
    category: 'urgent',
    loopInterval: 1150
  },
  {
    id: 'gentle-chime',
    name: 'Gentle Morning Chimes',
    nameHi: 'सौम्य सुबह की घंटी',
    badge: 'Calm & Soothing',
    badgeHi: 'शांत और मधुर',
    desc: 'Peaceful harmonic marimba and harp arpeggios for anxiety-free reminders.',
    descHi: 'शांत और मधुर धुन जो बिना किसी घबराहट के दवा की याद दिलाती है।',
    iconKey: 'chimes',
    category: 'gentle',
    loopInterval: 1800
  },
  {
    id: 'digital-beep',
    name: 'Digital Smartwatch Pulse',
    nameHi: 'डिजिटल वॉच बीप',
    badge: 'Modern & Clean',
    badgeHi: 'आधुनिक और स्पष्ट',
    desc: 'Crisp double-beep cadence like a modern digital smartwatch alert.',
    descHi: 'स्मार्टवॉच जैसी स्पष्ट दोहरी बीप जो आसानी से समझ आती है।',
    iconKey: 'pulse',
    category: 'standard',
    loopInterval: 1000
  },
  {
    id: 'clinical-pulse',
    name: 'Clinical Telemetry Monitor',
    nameHi: 'अस्पताल मॉनिटर बीप',
    badge: 'Medical Grade',
    badgeHi: 'मेडिकल ग्रेड',
    desc: 'Rhythmic hospital cardiac monitor pings with warm harmonic depth.',
    descHi: 'अस्पताल के कार्डियक मॉनिटर जैसी लयबद्ध और गंभीर बीप।',
    iconKey: 'telemetry',
    category: 'medical',
    loopInterval: 1200
  },
  {
    id: 'vintage-bell',
    name: 'Retro Twin-Bell Clock',
    nameHi: 'पारंपरिक अलार्म घड़ी',
    badge: 'Classic Mechanical',
    badgeHi: 'पारंपरिक घंटी',
    desc: 'Rapid alternating brass bells with nostalgic mechanical clockwork rattle.',
    descHi: 'पुरानी पीतल की अलार्म घड़ी जैसी तेज और स्पष्ट खड़खड़ाहट।',
    iconKey: 'bell',
    category: 'loud',
    loopInterval: 1150
  },
  {
    id: 'radar-sonar',
    name: 'Submarine Sonar Ping',
    nameHi: 'सोनार रडार पिंग',
    badge: 'Deep Acoustic',
    badgeHi: 'गहरा प्रतिध्वनि पिंग',
    desc: 'Deep resonant underwater sonar pulse with spatial reverberation decay.',
    descHi: 'गहरी प्रतिध्वनि वाला सोनार पिंग जो अलग और विशिष्ट सुनाई देता है।',
    iconKey: 'sonar',
    category: 'standard',
    loopInterval: 1450
  }
];

export const STORAGE_KEY_ALARM_TONE = 'healthmitra_alarm_tone';

export function getSelectedAlarmTone() {
  if (typeof window === 'undefined') return 'crazy-siren';
  return localStorage.getItem(STORAGE_KEY_ALARM_TONE) || 'crazy-siren';
}

export function setSelectedAlarmTone(toneId) {
  if (typeof window === 'undefined') return;
  const validTone = ALARM_TONES.find((t) => t.id === toneId) ? toneId : 'crazy-siren';
  localStorage.setItem(STORAGE_KEY_ALARM_TONE, validTone);
  window.dispatchEvent(new CustomEvent('alarm-tone-changed', { detail: validTone }));
}

let globalAlarmContext = null;
let globalAlarmInterval = null;
let globalMasterGain = null;
let previewTimeout = null;
const activeOscillators = new Set();
let isAlarmRunning = false;

// ── Synthesizer 1: Urgent Klaxon Siren ──
function playCrazySiren(ctx, masterGain) {
  const now = ctx.currentTime;

  // 4 rapid piercing chirps (2.2 kHz - 2.65 kHz)
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
    gain.gain.linearRampToValueAtTime(0.42, now + i * 0.11 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.085);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now + i * 0.11);
    osc.stop(now + i * 0.11 + 0.09);
  }

  // Dual-oscillator sweeping siren
  const sirenStart = now + 0.48;
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
  sirenGain.gain.linearRampToValueAtTime(0.38, sirenStart + 0.04);
  sirenGain.gain.setValueAtTime(0.38, sirenStart + sirenDuration - 0.08);
  sirenGain.gain.exponentialRampToValueAtTime(0.001, sirenStart + sirenDuration);

  osc1.connect(sirenGain);
  osc2.connect(sirenGain);
  sirenGain.connect(masterGain);

  osc1.start(sirenStart);
  osc2.start(sirenStart);
  osc1.stop(sirenStart + sirenDuration + 0.01);
  osc2.stop(sirenStart + sirenDuration + 0.01);
}

// ── Synthesizer 2: Gentle Morning Chimes ──
function playGentleChimes(ctx, masterGain) {
  const now = ctx.currentTime;
  // Soothing Pentatonic Chords: C5 (523), E5 (659), G5 (784), B5 (988), C6 (1046)
  const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];

  notes.forEach((freq, idx) => {
    if (!isAlarmRunning) return;
    const noteStart = now + idx * 0.14;
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    activeOscillators.add(osc);
    activeOscillators.add(subOsc);
    osc.onended = () => activeOscillators.delete(osc);
    subOsc.onended = () => activeOscillators.delete(subOsc);

    osc.type = 'sine';
    subOsc.type = 'triangle';

    osc.frequency.setValueAtTime(freq, noteStart);
    subOsc.frequency.setValueAtTime(freq * 2, noteStart);

    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.linearRampToValueAtTime(0.28, noteStart + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.65);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(masterGain);

    osc.start(noteStart);
    subOsc.start(noteStart);
    osc.stop(noteStart + 0.68);
    subOsc.stop(noteStart + 0.68);
  });
}

// ── Synthesizer 3: Digital Smartwatch Pulse ──
function playDigitalBeep(ctx, masterGain) {
  const now = ctx.currentTime;
  // Double-burst smartwatch cadence
  const beeps = [
    { start: 0, dur: 0.08, freq: 1760 },
    { start: 0.12, dur: 0.08, freq: 1760 },
    { start: 0.32, dur: 0.08, freq: 1760 },
    { start: 0.44, dur: 0.12, freq: 1760 }
  ];

  beeps.forEach(({ start, dur, freq }) => {
    if (!isAlarmRunning) return;
    const t = now + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    activeOscillators.add(osc);
    osc.onended = () => activeOscillators.delete(osc);

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
    gain.gain.setValueAtTime(0.25, t + dur - 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + dur + 0.01);
  });
}

// ── Synthesizer 4: Clinical Telemetry Monitor ──
function playClinicalPulse(ctx, masterGain) {
  const now = ctx.currentTime;
  // Cardiac monitor ping: 1046Hz (High C) followed by warm 1318Hz (High E)
  const pulses = [
    { start: 0, dur: 0.11, freq: 1046.5 },
    { start: 0.18, dur: 0.13, freq: 1318.5 }
  ];

  pulses.forEach(({ start, dur, freq }) => {
    if (!isAlarmRunning) return;
    const t = now + start;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();

    activeOscillators.add(osc);
    activeOscillators.add(sub);
    osc.onended = () => activeOscillators.delete(osc);
    sub.onended = () => activeOscillators.delete(sub);

    osc.type = 'sine';
    sub.type = 'triangle';

    osc.frequency.setValueAtTime(freq, t);
    sub.frequency.setValueAtTime(freq * 0.5, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    sub.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.01);
    sub.stop(t + dur + 0.01);
  });
}

// ── Synthesizer 5: Retro Twin-Bell Clock ──
function playVintageBell(ctx, masterGain) {
  const now = ctx.currentTime;
  // Rapid alternating mechanical hammer hits on twin bells (820Hz & 980Hz)
  const hits = 14;
  const interval = 0.045;

  for (let i = 0; i < hits; i++) {
    if (!isAlarmRunning) return;
    const t = now + i * interval;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    activeOscillators.add(osc);
    osc.onended = () => activeOscillators.delete(osc);

    osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
    const freq = i % 2 === 0 ? 820 : 980;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

// ── Synthesizer 6: Submarine Sonar Ping ──
function playRadarSonar(ctx, masterGain) {
  const now = ctx.currentTime;

  // Primary sonar ping with downward glissando
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  activeOscillators.add(osc);
  osc.onended = () => activeOscillators.delete(osc);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1250, now);
  osc.frequency.exponentialRampToValueAtTime(640, now + 0.7);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.38, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.88);

  // Soft echo reverberation at +0.28s
  const echo = ctx.createOscillator();
  const echoGain = ctx.createGain();

  activeOscillators.add(echo);
  echo.onended = () => activeOscillators.delete(echo);

  echo.type = 'sine';
  echo.frequency.setValueAtTime(800, now + 0.28);
  echo.frequency.exponentialRampToValueAtTime(540, now + 0.75);

  echoGain.gain.setValueAtTime(0.001, now + 0.28);
  echoGain.gain.linearRampToValueAtTime(0.15, now + 0.3);
  echoGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

  echo.connect(echoGain);
  echoGain.connect(masterGain);

  echo.start(now + 0.28);
  echo.stop(now + 0.88);
}

function triggerToneBurst(toneId, ctx, masterGain) {
  switch (toneId) {
    case 'gentle-chime':
      playGentleChimes(ctx, masterGain);
      break;
    case 'digital-beep':
      playDigitalBeep(ctx, masterGain);
      break;
    case 'clinical-pulse':
      playClinicalPulse(ctx, masterGain);
      break;
    case 'vintage-bell':
      playVintageBell(ctx, masterGain);
      break;
    case 'radar-sonar':
      playRadarSonar(ctx, masterGain);
      break;
    case 'crazy-siren':
    default:
      playCrazySiren(ctx, masterGain);
      break;
  }
}

/**
 * Starts a repeating alarm loop using the selected or specified tone.
 * Returns a cleanup function that stops the alarm.
 */
export function startAlarm(explicitToneId = null) {
  stopAlarm();
  isAlarmRunning = true;

  const toneId = explicitToneId || getSelectedAlarmTone();
  const toneConfig = ALARM_TONES.find((t) => t.id === toneId) || ALARM_TONES[0];
  const intervalMs = toneConfig.loopInterval || 1150;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return () => {};

    const ctx = new AudioCtx();
    globalAlarmContext = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1, ctx.currentTime);
    masterGain.connect(ctx.destination);
    globalMasterGain = masterGain;

    const playLoop = () => {
      if (!isAlarmRunning || !ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      triggerToneBurst(toneId, ctx, masterGain);
    };

    playLoop();
    globalAlarmInterval = setInterval(playLoop, intervalMs);

    return () => stopAlarm();
  } catch (err) {
    console.warn('[audio] Could not start alarm:', err);
    return () => {};
  }
}

/**
 * Plays a single ~2 second preview of a specific tone, then stops automatically.
 */
export function previewAlarmTone(toneId) {
  stopAlarm();
  isAlarmRunning = true;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return () => {};

    const ctx = new AudioCtx();
    globalAlarmContext = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, ctx.currentTime);
    masterGain.connect(ctx.destination);
    globalMasterGain = masterGain;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    triggerToneBurst(toneId, ctx, masterGain);

    previewTimeout = setTimeout(() => {
      stopAlarm();
    }, 2100);

    return () => stopAlarm();
  } catch (err) {
    console.warn('[audio] Could not preview tone:', err);
    return () => {};
  }
}

/**
 * Instantly cuts all audio, clears timers, and resets state.
 */
export function stopAlarm() {
  isAlarmRunning = false;

  if (globalAlarmInterval) {
    clearInterval(globalAlarmInterval);
    globalAlarmInterval = null;
  }

  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }

  if (globalMasterGain) {
    try {
      globalMasterGain.gain.cancelScheduledValues(0);
      globalMasterGain.gain.setValueAtTime(0, 0);
      globalMasterGain.disconnect();
    } catch {}
    globalMasterGain = null;
  }

  for (const osc of activeOscillators) {
    try {
      osc.stop(0);
      osc.disconnect();
    } catch {}
  }
  activeOscillators.clear();

  if (globalAlarmContext) {
    try {
      globalAlarmContext.close();
    } catch {}
    globalAlarmContext = null;
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

// ── Backward compatibility aliases ──
export const startCrazyAlarm = (toneId) => startAlarm(toneId);
export const stopCrazyAlarm = () => stopAlarm();
export const playAlarmChime = () => startAlarm();
