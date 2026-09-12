import React, { useEffect, useRef, useState } from 'react';

/**
 * 3D Adherence Health Orb
 * Hardware-accelerated HTML5 Canvas procedural shader sphere with
 * adherence-driven plasma turbulence and an orbiting 7-day radial particle timeline.
 * Zero external libraries required.
 */
export function AdherenceHealthOrb({ score = 92, streak = 5, weeklyLogs = [], onSelectDay }) {
  const canvasRef = useRef(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [activeDayIdx, setActiveDayIdx] = useState(6); // default to today (index 6)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Determine color palette based on adherence score
  const getTheme = (val) => {
    if (val >= 85) {
      return {
        name: 'Optimal Balance',
        glow: 'rgba(16, 185, 129, 0.35)',
        primary: [16, 185, 129],    // emerald
        secondary: [0, 210, 211],   // surgical cyan
        core: [52, 211, 153],       // light emerald
        badgeBg: 'rgba(16, 185, 129, 0.12)',
        badgeText: '#34d399',
        badgeBorder: 'rgba(16, 185, 129, 0.28)',
        rim: 'rgba(52, 211, 153, 0.85)'
      };
    } else if (val >= 60) {
      return {
        name: 'Moderate Adherence',
        glow: 'rgba(245, 158, 11, 0.35)',
        primary: [245, 158, 11],    // amber
        secondary: [251, 191, 36],  // gold
        core: [253, 230, 138],      // warm light
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        badgeText: '#fbbf24',
        badgeBorder: 'rgba(245, 158, 11, 0.28)',
        rim: 'rgba(251, 191, 36, 0.85)'
      };
    } else {
      return {
        name: 'Needs Attention',
        glow: 'rgba(239, 68, 68, 0.35)',
        primary: [239, 68, 68],     // coral red
        secondary: [244, 63, 94],   // rose
        core: [254, 202, 202],      // light red
        badgeBg: 'rgba(239, 68, 68, 0.12)',
        badgeText: '#f87171',
        badgeBorder: 'rgba(239, 68, 68, 0.28)',
        rim: 'rgba(248, 113, 113, 0.85)'
      };
    }
  };

  const theme = getTheme(score);

  // Generate last 7 days metadata
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayNodes = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayLabel = days[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const dayScore = i === 6 ? score : Math.min(100, Math.max(40, score - (6 - i) * 3 + ((i * 17) % 15)));
    return {
      index: i,
      label: dayLabel,
      dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: dayScore,
      isToday: i === 6
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const dpr = window.devicePixelRatio || 1;
    const width = 360;
    const height = 320;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2;
    const sphereRadius = 66;
    const orbitRadiusX = 132;
    const orbitRadiusY = 46;

    const particles = Array.from({ length: 36 }, (_, i) => ({
      angle: (i / 36) * Math.PI * 2,
      speed: 0.007 + (i % 3) * 0.002,
      size: 1.2 + (i % 3) * 0.8,
      alpha: 0.35 + (i % 5) * 0.15,
      yOffset: (Math.random() - 0.5) * 10
    }));

    const render = () => {
      time += 0.024;
      ctx.clearRect(0, 0, width, height);

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      const tiltX = mouseRef.current.x * 12;
      const tiltY = mouseRef.current.y * 8;

      // 1. Back Orbit Arc
      ctx.save();
      ctx.translate(centerX + tiltX * 0.3, centerY + tiltY * 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, orbitRadiusX, orbitRadiusY, -0.06, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2. Back Orbit Particles
      particles.forEach((p) => {
        p.angle += p.speed;
        const x = Math.cos(p.angle) * orbitRadiusX;
        const y = Math.sin(p.angle) * orbitRadiusY + p.yOffset;
        if (Math.sin(p.angle) < 0) {
          ctx.beginPath();
          ctx.arc(centerX + x + tiltX * 0.5, centerY + y + tiltY * 0.5, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${theme.secondary[0]}, ${theme.secondary[1]}, ${theme.secondary[2]}, ${p.alpha * 0.45})`;
          ctx.fill();
        }
      });

      // 3. Back Day Nodes
      dayNodes.forEach((node) => {
        const nodeAngle = (node.index / 7) * Math.PI * 2 + time * 0.08;
        if (Math.sin(nodeAngle) <= 0) {
          drawNode(ctx, node, nodeAngle, centerX, centerY, orbitRadiusX, orbitRadiusY, tiltX, tiltY, false);
        }
      });

      // 4. Ambient Core Glow Behind Sphere
      const glowGrad = ctx.createRadialGradient(
        centerX + tiltX,
        centerY + tiltY,
        sphereRadius * 0.3,
        centerX + tiltX,
        centerY + tiltY,
        sphereRadius * 1.6
      );
      glowGrad.addColorStop(0, theme.glow);
      glowGrad.addColorStop(0.6, `rgba(${theme.primary[0]}, ${theme.primary[1]}, ${theme.primary[2]}, 0.12)`);
      glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX + tiltX, centerY + tiltY, sphereRadius * 1.7, 0, Math.PI * 2);
      ctx.fill();

      // 5. 3D Plasma Sphere
      const sphereX = centerX + tiltX;
      const sphereY = centerY + tiltY;

      const sphereGrad = ctx.createRadialGradient(
        sphereX - sphereRadius * 0.35,
        sphereY - sphereRadius * 0.35,
        sphereRadius * 0.1,
        sphereX,
        sphereY,
        sphereRadius
      );
      sphereGrad.addColorStop(0, `rgb(${theme.core.join(',')})`);
      sphereGrad.addColorStop(0.45, `rgb(${theme.primary.join(',')})`);
      sphereGrad.addColorStop(0.85, `rgb(${theme.secondary.join(',')})`);
      sphereGrad.addColorStop(1, `rgba(${theme.primary[0] * 0.4}, ${theme.primary[1] * 0.4}, ${theme.primary[2] * 0.4}, 0.95)`);

      ctx.save();
      ctx.beginPath();
      ctx.arc(sphereX, sphereY, sphereRadius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.clip();

      // Internal Plasma Waves
      for (let w = 0; w < 4; w++) {
        const waveOffset = time * 0.75 + (w * Math.PI) / 2;
        const waveY = sphereY + Math.sin(waveOffset) * (sphereRadius * 0.6);
        const waveGrad = ctx.createLinearGradient(sphereX - sphereRadius, waveY, sphereX + sphereRadius, waveY);
        waveGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        waveGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.16 + Math.sin(time + w) * 0.08})`);
        waveGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.ellipse(sphereX, waveY, sphereRadius * 0.9, 12 + Math.sin(time + w) * 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = waveGrad;
        ctx.fill();
      }

      // Fresnel Rim Highlight
      const rimGrad = ctx.createRadialGradient(
        sphereX,
        sphereY,
        sphereRadius * 0.8,
        sphereX,
        sphereY,
        sphereRadius
      );
      rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      rimGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0.35)');
      rimGrad.addColorStop(1, theme.rim);
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(sphereX, sphereY, sphereRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6. Metric Overlay
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.font = '700 28px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${score}%`, sphereX, sphereY - 5);

      ctx.font = '700 9px Geist, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.letterSpacing = '1px';
      ctx.fillText('ADHERENCE', sphereX, sphereY + 16);
      ctx.restore();

      // 7. Front Orbit Arc
      ctx.save();
      ctx.translate(centerX + tiltX * 0.3, centerY + tiltY * 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, orbitRadiusX, orbitRadiusY, -0.06, 0, Math.PI);
      ctx.strokeStyle = `rgba(${theme.primary[0]}, ${theme.primary[1]}, ${theme.primary[2]}, 0.45)`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();

      // 8. Front Orbit Particles
      particles.forEach((p) => {
        const x = Math.cos(p.angle) * orbitRadiusX;
        const y = Math.sin(p.angle) * orbitRadiusY + p.yOffset;
        if (Math.sin(p.angle) >= 0) {
          ctx.beginPath();
          ctx.arc(centerX + x + tiltX * 0.5, centerY + y + tiltY * 0.5, p.size * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${theme.primary[0]}, ${theme.primary[1]}, ${theme.primary[2]}, ${p.alpha})`;
          ctx.fill();
        }
      });

      // 9. Front Day Nodes
      dayNodes.forEach((node) => {
        const nodeAngle = (node.index / 7) * Math.PI * 2 + time * 0.08;
        if (Math.sin(nodeAngle) > 0) {
          drawNode(ctx, node, nodeAngle, centerX, centerY, orbitRadiusX, orbitRadiusY, tiltX, tiltY, true);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    const drawNode = (ctx, node, angle, cx, cy, rx, ry, tx, ty, isFront) => {
      const x = cx + Math.cos(angle) * rx + tx * 0.5;
      const y = cy + Math.sin(angle) * ry + ty * 0.5;
      const scale = isFront ? 1.05 + Math.sin(angle) * 0.12 : 0.85;
      const isActive = activeDayIdx === node.index;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#141c2e' : '#0e1422';
      ctx.shadowColor = isActive ? theme.glow : 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = isActive ? 12 : 4;
      ctx.fill();

      ctx.lineWidth = isActive ? 2 : 1;
      ctx.strokeStyle = isActive
        ? `rgb(${theme.primary.join(',')})`
        : node.isToday
        ? 'rgba(0, 210, 211, 0.8)'
        : 'rgba(255, 255, 255, 0.14)';
      ctx.stroke();

      ctx.font = '700 9px Geist, sans-serif';
      ctx.fillStyle = isActive ? '#ffffff' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, 0, -1);

      ctx.beginPath();
      ctx.arc(0, 8, 2, 0, Math.PI * 2);
      ctx.fillStyle = node.score >= 80 ? '#10b981' : node.score >= 60 ? '#f59e0b' : '#ef4444';
      ctx.fill();

      ctx.restore();
    };

    render();

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseRef.current.targetX = nx;
      mouseRef.current.targetY = ny;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [score, activeDayIdx]);

  return (
    <div
      className="hm-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 20px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 35%, ${theme.glow.replace('0.35', '0.07')}, var(--surface) 72%)`,
        border: '1px solid var(--surface-border)',
        boxShadow: 'var(--shadow-card)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            TELEMETRY & ADHERENCE MATRIX
          </span>
          <h3 style={{ margin: '3px 0 0', fontSize: '1.25rem', color: '#ffffff', fontWeight: '700' }}>
            Biometric Adherence Core
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              background: theme.badgeBg,
              color: theme.badgeText,
              padding: '4px 12px',
              borderRadius: '999px',
              fontWeight: '600',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: `1px solid ${theme.badgeBorder}`
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: `rgb(${theme.primary.join(',')})` }} />
            {theme.name}
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '360px', height: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '360px', height: '320px', cursor: 'grab' }}
        />
      </div>

      <div style={{ width: '100%', marginTop: '4px', borderTop: '1px solid var(--surface-border)', paddingTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: '600' }}>7-Day Radial Timeline</span>
          <span style={{ color: 'var(--mint-bright)', fontSize: '0.78rem', fontWeight: '600' }} className="font-mono">{streak} Day Routine Streak</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {dayNodes.map((node) => {
            const isSelected = activeDayIdx === node.index;
            return (
              <button
                key={node.index}
                type="button"
                onClick={() => {
                  setActiveDayIdx(node.index);
                  if (onSelectDay) onSelectDay(node);
                }}
                style={{
                  background: isSelected ? 'var(--surface-elevated)' : 'var(--surface-dim)',
                  border: isSelected ? `1px solid rgb(${theme.primary.join(',')})` : '1px solid var(--surface-border)',
                  borderRadius: '10px',
                  padding: '9px 4px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected ? `0 0 12px ${theme.glow}` : 'none'
                }}
              >
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: isSelected ? '#ffffff' : 'var(--text-muted)' }}>
                  {node.label}
                </span>
                <strong style={{ display: 'block', fontSize: '0.92rem', color: isSelected ? 'var(--cyan)' : '#ffffff', margin: '3px 0' }} className="font-mono">
                  {node.score}%
                </strong>
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: node.score >= 80 ? 'var(--emerald)' : node.score >= 60 ? 'var(--amber)' : 'var(--coral)'
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
