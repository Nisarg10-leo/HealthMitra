import React, { useEffect, useRef } from 'react';

/**
 * CinematicSunHero
 * Warm glowing amber sun orb with orbiting translucent pill capsules and mouse parallax.
 * Procedural HTML5 Canvas rendering, zero dependencies.
 */
export function CinematicSunHero() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;

    const dpr = window.devicePixelRatio || 1;
    const width = 280;
    const height = 180;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;
    const sunR = 34;

    // Translucent orbiting pill capsules
    const capsules = [
      { a: 0, speed: 0.015, rx: 90, ry: 36, color: '#38bdf8', tilt: 0.2 },
      { a: (Math.PI * 2) / 3, speed: 0.012, rx: 110, ry: 44, color: '#34d399', tilt: -0.15 },
      { a: (Math.PI * 4) / 3, speed: 0.018, rx: 80, ry: 30, color: '#f472b6', tilt: 0.35 }
    ];

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;
      const tx = mouseRef.current.x * 12;
      const ty = mouseRef.current.y * 8;

      // 1. Back Orbiting Capsules
      capsules.forEach((c) => {
        c.a += c.speed;
        if (Math.sin(c.a) <= 0) {
          drawCapsule(ctx, c, cx + tx * 0.4, cy + ty * 0.4, time);
        }
      });

      // 2. Coronal Ambient Sun Glow
      const glow = ctx.createRadialGradient(cx + tx, cy + ty, sunR * 0.2, cx + tx, cy + ty, sunR * 2.2);
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
      glow.addColorStop(0.5, 'rgba(245, 158, 11, 0.18)');
      glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx + tx, cy + ty, sunR * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 3. 3D Sun Sphere
      const sunGrad = ctx.createRadialGradient(
        cx + tx - sunR * 0.3,
        cy + ty - sunR * 0.3,
        sunR * 0.1,
        cx + tx,
        cy + ty,
        sunR
      );
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.4, '#f59e0b');
      sunGrad.addColorStop(0.85, '#d97706');
      sunGrad.addColorStop(1, '#b45309');

      ctx.beginPath();
      ctx.arc(cx + tx, cy + ty, sunR, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
      ctx.shadowBlur = 18;
      ctx.fill();

      // 4. Front Orbiting Capsules
      capsules.forEach((c) => {
        if (Math.sin(c.a) > 0) {
          drawCapsule(ctx, c, cx + tx * 0.4, cy + ty * 0.4, time);
        }
      });

      animId = requestAnimationFrame(render);
    };

    const drawCapsule = (ctx, c, originX, originY, t) => {
      const x = originX + Math.cos(c.a) * c.rx;
      const y = originY + Math.sin(c.a) * c.ry;
      const scale = 0.8 + (Math.sin(c.a) + 1) * 0.2;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(c.tilt + t * 0.5);
      ctx.scale(scale, scale);

      // Draw rounded pill capsule
      ctx.beginPath();
      ctx.roundRect(-10, -5, 20, 10, 5);
      ctx.fillStyle = c.color;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.85;
      ctx.fill();

      // Center divider of capsule
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 5);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
    };

    render();

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 12px' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '280px', height: '180px', pointerEvents: 'none' }}
      />
    </div>
  );
}
