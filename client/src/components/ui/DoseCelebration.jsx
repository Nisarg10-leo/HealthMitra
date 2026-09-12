import React, { useEffect, useState } from 'react';

/**
 * DoseCelebration
 * An elder-friendly, rewarding micro-celebration moment when a medicine is taken.
 * Soft pastel healing particles drift upwards with a spring-bounce confirmation badge.
 * Auto-dismisses smoothly after 2.4 seconds.
 */
export function DoseCelebration({ medicationName = 'Medicine', patientName = 'Meera', onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) setTimeout(onClose, 300);
    }, 2400);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Generate 24 floating soft pastel particle nodes
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${15 + (i * 3.2) % 70}%`,
    delay: `${(i % 6) * 0.12}s`,
    duration: `${1.4 + (i % 4) * 0.3}s`,
    size: `${6 + (i % 5) * 3}px`,
    color: ['#34d399', '#60a5fa', '#fcd34d', '#a78bfa', '#f472b6', '#38bdf8'][i % 6]
  }));

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Floating particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            bottom: '25%',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}`,
            animation: `floatUp ${p.duration} ease-out forwards`,
            animationDelay: p.delay,
            opacity: 0.85
          }}
        />
      ))}

      {/* Spring-bounce Celebration Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '2px solid #10b981',
          borderRadius: '24px',
          padding: '24px 32px',
          boxShadow: '0 20px 40px -8px rgba(16, 185, 129, 0.35), 0 0 0 1px rgba(16, 185, 129, 0.2)',
          textAlign: 'center',
          animation: 'springBounce 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          maxWidth: '380px'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 12px',
            boxShadow: '0 8px 16px rgba(16, 185, 129, 0.35)'
          }}
        >
          ✓
        </div>
        <span style={{ color: '#059669', fontSize: '0.82em', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          DOSE RECORDED
        </span>
        <h3 style={{ margin: '4px 0 6px', fontSize: '1.4em', color: '#0f172a' }}>
          Well done, {patientName}!
        </h3>
        <p style={{ margin: 0, color: '#475569', fontSize: '0.95em' }}>
          {medicationName} marked as taken.
        </p>
      </div>

      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-280px) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes springBounce {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          70% {
            transform: scale(1.06);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
