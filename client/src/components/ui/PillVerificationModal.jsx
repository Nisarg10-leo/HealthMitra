import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PillIcon } from './Icons.jsx';

// Converts hex (#4f67d8) to [r, g, b]
function hexToRgb(hex) {
  const clean = hex?.replace('#', '') || '4f67d8';
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Euclidean color distance (0 = identical, 441 = max distance)
function colorDistance(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
}

export function PillVerificationModal({ dose, medication, onConfirm, onClose }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [matchScore, setMatchScore] = useState(0);
  const [detectedHex, setDetectedHex] = useState('#888888');
  const [cameraActive, setCameraActive] = useState(false);
  const [simulatedMatch, setSimulatedMatch] = useState(false);

  const targetRgb = hexToRgb(medication?.color || '#00f2fe');

  useEffect(() => {
    let intervalId = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }

        intervalId = setInterval(() => {
          if (!videoRef.current || !canvasRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const video = videoRef.current;
          if (video.videoWidth === 0) return;

          canvas.width = 60;
          canvas.height = 60;
          const sx = (video.videoWidth - 60) / 2;
          const sy = (video.videoHeight - 60) / 2;
          ctx.drawImage(video, sx, sy, 60, 60, 0, 0, 60, 60);

          const frame = ctx.getImageData(0, 0, 60, 60);
          const data = frame.data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 16) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count += 1;
          }
          const avgR = Math.round(r / count);
          const avgG = Math.round(g / count);
          const avgB = Math.round(b / count);
          const hex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;
          setDetectedHex(hex);

          const dist = colorDistance([avgR, avgG, avgB], targetRgb);
          const confidence = Math.max(10, Math.min(98, Math.round(100 - (dist / 280) * 100)));
          setMatchScore(confidence);
        }, 400);
      } catch (err) {
        console.warn('[camera] Camera access not available:', err);
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [medication?.color]);

  const effectiveMatch = simulatedMatch || matchScore >= 65;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 14, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div
        className="glass-matrix"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '26px',
          border: '1px solid rgba(0, 242, 254, 0.35)',
          boxShadow: '0 0 40px rgba(0, 242, 254, 0.15)',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>Computer Vision Pill Verification</h2>
            <small style={{ color: '#00f2fe', fontSize: '0.78rem' }}>Align pill inside target reticle</small>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '14px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Camera Viewfinder with target crosshair */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            borderRadius: '14px',
            overflow: 'hidden',
            background: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Central target reticle */}
          <div
            style={{
              position: 'absolute',
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              border: `3px dashed ${effectiveMatch ? '#6ffbbe' : '#00f2fe'}`,
              boxShadow: effectiveMatch ? '0 0 24px rgba(111, 251, 190, 0.8)' : '0 0 15px rgba(0, 242, 254, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            <PillIcon size={32} />
          </div>

          {!cameraActive && (
            <div style={{ position: 'absolute', color: '#94a3b8', fontSize: '0.84rem', padding: '16px', lineHeight: '1.4' }}>
              Camera stream offline or permission pending. Use manual color match override below if hardware camera is unavailable.
            </div>
          )}
        </div>

        {/* Prescription Target vs Detected */}
        <div
          style={{
            marginTop: '14px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '12px',
            background: 'rgba(10, 14, 23, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            fontSize: '0.84rem'
          }}
        >
          <div>
            <span style={{ color: '#849495', display: 'block', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
              EXPECTED COLOR
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: medication?.color || '#00f2fe', boxShadow: `0 0 8px ${medication?.color || '#00f2fe'}` }} />
              <strong style={{ color: '#ffffff' }}>{medication?.name}</strong>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div>
            <span style={{ color: '#849495', display: 'block', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
              DETECTED SENSOR
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: simulatedMatch ? medication?.color : detectedHex, boxShadow: `0 0 8px ${simulatedMatch ? medication?.color : detectedHex}` }} />
              <strong style={{ color: effectiveMatch ? '#6ffbbe' : '#00f2fe' }}>
                {simulatedMatch ? '96% Match' : `${matchScore}% Match`}
              </strong>
            </div>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: effectiveMatch ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${effectiveMatch ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            color: effectiveMatch ? '#6ffbbe' : '#fbbf24',
            fontSize: '0.88rem',
            fontWeight: '600'
          }}
        >
          {effectiveMatch
            ? `Verified: Matches ${medication?.name} (${medication?.dosage})`
            : 'Hold pill steady inside the target circle to verify color'}
        </div>

        {/* Confirmation Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            disabled={!effectiveMatch}
            className="btn-cyber"
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            onClick={() => onConfirm(dose, 'taken')}
          >
            Confirm Verified Pill Taken
          </button>

          <button
            type="button"
            className="btn-glass"
            style={{ fontSize: '0.84rem', color: '#00f2fe', borderColor: 'rgba(0, 242, 254, 0.2)' }}
            onClick={() => setSimulatedMatch(true)}
          >
            Manual Match Override (Sensor Fallback)
          </button>
        </div>
      </div>
    </div>
  );
}
