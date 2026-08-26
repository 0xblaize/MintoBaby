import React, { useEffect, useRef, useState } from 'react';

type PaletteMode = 'watercolor' | 'cosmic' | 'neon';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  growthRate: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  hue: number;
  sat: number;
  light: number;
  spinAngle: number;
  spinSpeed: number;
  isSparkle?: boolean;
}

interface CurrentPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

export const WatercolorCurrentCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeMode, setActiveMode] = useState<PaletteMode>('watercolor');
  const [isInteractive, setIsInteractive] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(false);

  // Mouse & Touch Tracking
  const mouseRef = useRef({
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    vx: 0,
    vy: 0,
    isDown: false,
    moving: false,
    lastMoveTime: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle & Trail Storage
    const particles: Particle[] = [];
    const trailPoints: CurrentPoint[] = [];
    const maxParticles = 250;
    const maxTrailPoints = 80;

    // Base color provider based on Y ratio (Purple at top -> down into magenta, blue, cyan)
    const getColorForPosition = (y: number, mode: PaletteMode) => {
      const ratio = Math.max(0, Math.min(1, y / height));

      if (mode === 'cosmic') {
        // Deep purple to violet & gold
        const h = 260 + ratio * 60; // 260 (purple) -> 320 (magenta/gold)
        return { hue: h, sat: 85, light: 55 + ratio * 10 };
      } else if (mode === 'neon') {
        // Electric neon purple -> cyan -> lime
        const h = 270 - ratio * 150; // 270 (purple) -> 120 (neon green/teal)
        return { hue: (h + 360) % 360, sat: 95, light: 60 };
      } else {
        // Classic Watercolor: Purple downward to violet, indigo, blue, cyan
        // Top 0.0-0.3: Vibrant Deep Purple (265 - 280)
        // Mid 0.3-0.7: Electric Violet / Magenta / Royal Blue (285 - 230)
        // Bottom 0.7-1.0: Ocean Blue & Cyan (210 - 180)
        let h: number;
        let s = 80;
        let l = 60;

        if (ratio < 0.35) {
          h = 265 + (ratio / 0.35) * 20; // 265 -> 285 (Purple / Violet)
          s = 85;
          l = 55 + ratio * 15;
        } else if (ratio < 0.7) {
          const midRatio = (ratio - 0.35) / 0.35;
          h = 285 - midRatio * 60; // 285 -> 225 (Violet -> Electric Blue)
          s = 85;
          l = 60;
        } else {
          const botRatio = (ratio - 0.7) / 0.3;
          h = 225 - botRatio * 45; // 225 -> 180 (Blue -> Cyan / Emerald)
          s = 90;
          l = 55;
        }

        return { hue: h, sat: s, light: l };
      }
    };

    // Spawn Watercolor Droplet / Blooming Ink
    const spawnWatercolorBlob = (
      x: number,
      y: number,
      vxForce = 0,
      vyForce = 0,
      isBurst = false
    ) => {
      const { hue, sat, light } = getColorForPosition(y, activeMode);
      const count = isBurst ? 18 : 2;

      for (let i = 0; i < count; i++) {
        if (particles.length >= maxParticles) {
          particles.shift();
        }

        const angle = Math.random() * Math.PI * 2;
        const speed = isBurst
          ? 2 + Math.random() * 6
          : 0.5 + Math.random() * 2.5;

        // Current flow vector (downward drift + mouse push)
        const vx = Math.cos(angle) * speed + vxForce * 0.4;
        const vy = Math.sin(angle) * speed + vyForce * 0.4 + 0.3; // gentle downward flow

        const maxRadius = isBurst
          ? 35 + Math.random() * 60
          : 20 + Math.random() * 45;

        particles.push({
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 15,
          vx,
          vy,
          radius: 4 + Math.random() * 8,
          maxRadius,
          growthRate: 0.6 + Math.random() * 1.2,
          color: `hsla(${hue}, ${sat}%, ${light}%, `,
          alpha: isBurst ? 0.7 : 0.45,
          life: 0,
          maxLife: 100 + Math.random() * 120,
          hue,
          sat,
          light,
          spinAngle: Math.random() * Math.PI * 2,
          spinSpeed: (Math.random() - 0.5) * 0.04,
          isSparkle: Math.random() < 0.2,
        });
      }

      // Add to current trail ribbon
      if (trailPoints.length >= maxTrailPoints) {
        trailPoints.shift();
      }
      trailPoints.push({
        x,
        y,
        vx: vxForce,
        vy: vyForce,
        radius: 12 + Math.random() * 20,
        color: `hsla(${hue}, ${sat}%, ${light}%, `,
        alpha: 0.4,
      });
    };

    // Ambient Liquid Current Generator (keeps background alive when cursor is idle)
    let ambientTimer = 0;
    const generateAmbientCurrent = () => {
      ambientTimer++;
      if (ambientTimer % 18 === 0) {
        // Spawn soft floating watercolor drift from top/sides
        const ambX = Math.random() * width;
        const ambY = Math.random() * (height * 0.85);
        const { hue, sat, light } = getColorForPosition(ambY, activeMode);

        if (particles.length < maxParticles) {
          particles.push({
            x: ambX,
            y: ambY,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 0.4 + Math.random() * 0.6, // gentle downward current
            radius: 8 + Math.random() * 12,
            maxRadius: 30 + Math.random() * 50,
            growthRate: 0.4 + Math.random() * 0.6,
            color: `hsla(${hue}, ${sat}%, ${light}%, `,
            alpha: 0.25,
            life: 0,
            maxLife: 140 + Math.random() * 100,
            hue,
            sat,
            light,
            spinAngle: Math.random() * Math.PI * 2,
            spinSpeed: (Math.random() - 0.5) * 0.02,
            isSparkle: Math.random() < 0.15,
          });
        }
      }
    };

    // Pointer Event Listeners
    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isInteractive) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const mouse = mouseRef.current;
      if (mouse.x === -1000) {
        mouse.prevX = clientX;
        mouse.prevY = clientY;
      } else {
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
      }

      mouse.x = clientX;
      mouse.y = clientY;
      mouse.vx = (mouse.x - mouse.prevX) * 0.5;
      mouse.vy = (mouse.y - mouse.prevY) * 0.5;
      mouse.moving = true;
      mouse.lastMoveTime = Date.now();

      spawnWatercolorBlob(mouse.x, mouse.y, mouse.vx, mouse.vy, false);
    };

    const onPointerClick = (e: MouseEvent) => {
      if (!isInteractive) return;
      spawnWatercolorBlob(e.clientX, e.clientY, 0, 0, true);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('click', onPointerClick);

    // Main 60 FPS Render Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Check idle mouse state
      if (Date.now() - mouseRef.current.lastMoveTime > 300) {
        mouseRef.current.moving = false;
      }

      generateAmbientCurrent();

      // --- LAYER 1: Fluid Ribbon / Water Current Connections ---
      if (trailPoints.length > 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 1; i < trailPoints.length; i++) {
          const p1 = trailPoints[i - 1];
          const p2 = trailPoints[i];
          p1.alpha *= 0.96; // fade over time

          if (p1.alpha > 0.01) {
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (dist < 180) {
              const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
              grad.addColorStop(0, `${p1.color}${p1.alpha * 0.35})`);
              grad.addColorStop(1, `${p2.color}${p2.alpha * 0.35})`);

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = grad;
              ctx.lineWidth = Math.max(1, (1 - dist / 180) * 16);
              ctx.lineCap = 'round';
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // --- LAYER 2: Watercolor Blooming Ink Blobs ---
      ctx.save();
      // 'screen' blending produces vibrant watercolor ink blending on dark bg
      ctx.globalCompositeOperation = 'screen';

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        // Expand radius simulating ink bloom in water
        if (p.radius < p.maxRadius) {
          p.radius += p.growthRate;
        }

        // Current motion & liquid friction
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy = p.vy * 0.96 + 0.08; // subtle downward liquid gravity
        p.spinAngle += p.spinSpeed;

        // Mouse proximity reaction (pushes watercolor slightly)
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && mouseRef.current.moving) {
          const force = (1 - dist / 120) * 1.5;
          p.vx += (dx / (dist || 1)) * force;
          p.vy += (dy / (dist || 1)) * force;
        }

        // Fade calculation
        const lifeRatio = p.life / p.maxLife;
        let currentAlpha = p.alpha;
        if (lifeRatio > 0.6) {
          currentAlpha = p.alpha * (1 - (lifeRatio - 0.6) / 0.4);
        }

        if (p.life >= p.maxLife || currentAlpha <= 0.005) {
          particles.splice(i, 1);
          continue;
        }

        // Draw Soft Soft-Edged Radial Watercolor Blob
        const radialGrad = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x + Math.cos(p.spinAngle) * (p.radius * 0.2),
          p.y + Math.sin(p.spinAngle) * (p.radius * 0.2),
          p.radius
        );

        radialGrad.addColorStop(0, `${p.color}${currentAlpha})`);
        radialGrad.addColorStop(0.4, `${p.color}${currentAlpha * 0.6})`);
        radialGrad.addColorStop(0.75, `${p.color}${currentAlpha * 0.2})`);
        radialGrad.addColorStop(1, `${p.color}0)`);

        ctx.fillStyle = radialGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw occasional liquid sparkle accent
        if (p.isSparkle && currentAlpha > 0.15) {
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(
            p.x + (Math.random() - 0.5) * p.radius * 0.5,
            p.y + (Math.random() - 0.5) * p.radius * 0.5,
            1.5 + Math.random() * 1.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('click', onPointerClick);
    };
  }, [activeMode, isInteractive]);

  return (
    <>
      {/* Background Interactive Watercolor Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.88,
          filter: 'blur(1px)', // Soft organic watercolor diffusion look
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* Subtle Floating Controls Badge for User Customization */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setShowControls(!showControls)}
          style={{
            background: 'rgba(20, 19, 26, 0.85)',
            color: '#c77dff',
            border: '1px solid rgba(107, 60, 232, 0.4)',
            backdropFilter: 'blur(12px)',
            borderRadius: 30,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 15px rgba(107, 60, 232, 0.25)',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(107, 60, 232, 0.8)';
            e.currentTarget.style.transform = 'scale(1.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(107, 60, 232, 0.4)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span style={{ fontSize: 14 }}>🎨</span>
          <span>Watercolor Current FX</span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isInteractive ? '#00ff88' : '#827e99',
              boxShadow: isInteractive ? '0 0 8px #00ff88' : 'none',
            }}
          />
        </button>

        {/* Expanded Controls Card */}
        {showControls && (
          <div
            style={{
              background: 'rgba(15, 14, 22, 0.94)',
              border: '1px solid rgba(107, 60, 232, 0.4)',
              backdropFilter: 'blur(16px)',
              borderRadius: 16,
              padding: 16,
              width: 260,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(107, 60, 232, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Reactive Fluid FX
              </span>
              <button
                onClick={() => setIsInteractive(!isInteractive)}
                style={{
                  background: isInteractive ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                  color: isInteractive ? '#00ff88' : '#827e99',
                  border: isInteractive ? '1px solid rgba(0, 255, 136, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isInteractive ? 'ACTIVE' : 'PAUSED'}
              </button>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#827e99', marginBottom: 6, fontWeight: 500 }}>
                Color Current Theme
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { id: 'watercolor', label: '🟣 Purple Downward Fluid', desc: 'Purple top -> Violet -> Cyan bottom' },
                  { id: 'cosmic', label: '🔮 Cosmic Purple & Gold', desc: 'Deep Violet, Magenta & Golden Ink' },
                  { id: 'neon', label: '⚡ Electric Cyber Current', desc: 'High Contrast Neon Waves' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setActiveMode(mode.id as PaletteMode)}
                    style={{
                      background: activeMode === mode.id ? 'rgba(107, 60, 232, 0.3)' : 'rgba(255, 255, 255, 0.04)',
                      border: activeMode === mode.id ? '1px solid #6b3ce8' : '1px solid transparent',
                      borderRadius: 8,
                      padding: '7px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: activeMode === mode.id ? '#fff' : '#c77dff' }}>
                      {mode.label}
                    </div>
                    <div style={{ fontSize: 9, color: '#827e99', marginTop: 2 }}>{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 10, color: '#827e99', fontStyle: 'italic', textAlign: 'center' }}>
              💡 Move cursor around or click anywhere to splash color!
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WatercolorCurrentCanvas;
