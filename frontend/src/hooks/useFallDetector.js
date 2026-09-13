import { useCallback, useEffect, useRef, useState } from 'react';

// Ambient Acoustic Fall & Impact Detector using Web Audio API FFT analysis
export function useFallDetector(onFallConfirmed) {
  const [active, setActive] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const onFallConfirmedRef = useRef(onFallConfirmed);
  onFallConfirmedRef.current = onFallConfirmed;

  const triggerDistress = useCallback(() => {
    setFallDetected(true);
    setCountdown(30);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          if (onFallConfirmedRef.current) onFallConfirmedRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const dismiss = useCallback(() => {
    setFallDetected(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let lastSpikeTime = 0;

      const checkAudio = () => {
        if (!streamRef.current) return;
        analyser.getByteTimeDomainData(buffer);

        // Compute RMS amplitude
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const val = (buffer[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / buffer.length);

        // A sharp acoustic impact spike typically has RMS > 0.45
        const now = Date.now();
        if (rms > 0.45 && now - lastSpikeTime > 5000) {
          lastSpikeTime = now;
          triggerDistress();
        }

        requestAnimationFrame(checkAudio);
      };

      requestAnimationFrame(checkAudio);
      setActive(true);
    } catch (err) {
      console.warn('[fall-detector] Microphone access unavailable:', err);
      setActive(false);
    }
  }, [triggerDistress]);

  const stopListening = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [stopListening]);

  return {
    active,
    fallDetected,
    countdown,
    startListening,
    stopListening,
    dismiss,
    simulateFall: triggerDistress
  };
}
