import React, { useEffect, useRef } from 'react';

interface WaveParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  hue: number;
  sat: number;
  baseLight: number;
  alpha: number;
  life: number;
  maxLife: number;
  phase: number;
  frequency: number;
  amplitude: number;
}

export const WatercolorCurrentCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse & Touch Tracking + Liquid UI Physics
  const mouseRef = useRef({
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    vx: 0,
    vy: 0,
    speed: 0,
    moving: false,
    lastMoveTime: 0,
    movementEnergy: 0,
    // Liquid Website UI Motion State
    uiTargetX: 0,
    uiTargetY: 0,
    uiCurrentX: 0,
    uiCurrentY: 0,
    uiRotX: 0,
    uiRotY: 0,
    wavePhase: 0,
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

    const particles: WaveParticle[] = [];
    const maxParticles = 180;

    // Smooth Palette Progression matching Primary (#6b3ce8) & Secondary Accents (#c77dff, #3a86ff, #00ff88)
    const getSmoothPaletteColor = (y: number, energy: number) => {
      const ratio = Math.max(0, Math.min(1, y / height));

      // Key color palette stops:
      // 0.0 (Top): Deep Primary Purple (256°)
      // 0.35 (Upper-Mid): Electric Violet Accent (275°)
      // 0.70 (Lower-Mid): Soft Royal Indigo / Magenta (295° -> 230°)
      // 1.00 (Bottom): Emerald Teal Secondary Accent (165° - #00ff88)

      let hue: number;
      let sat: number;
      let light: number;

      if (ratio < 0.35) {
        const t = ratio / 0.35;
        hue = 256 + t * 20; // 256 -> 276 (Primary Electric Purple to Violet)
        sat = 82 + t * 6;
        light = 54 + t * 6;
      } else if (ratio < 0.7) {
        const t = (ratio - 0.35) / 0.35;
        hue = 276 - t * 46; // 276 -> 230 (Violet to Electric Royal Blue)
        sat = 88;
        light = 60;
      } else {
        const t = (ratio - 0.7) / 0.3;
        hue = 230 - t * 70; // 230 -> 160 (Royal Blue to Emerald Cyan / #00ff88)
        sat = 88 + t * 7;
        light = 60 - t * 8;
      }

      // Smoothly boost lightness & saturation as cursor movement energy increases
      const dynamicSat = Math.min(100, sat + energy * 12);
      const dynamicLight = Math.min(85, light + energy * 22);

      return { hue, sat: dynamicSat, baseLight: dynamicLight };
    };

    // Spawn localized watercolor wave particles right around the pointer
    const spawnWaveDisturbance = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      speed: number
    ) => {
      const energy = mouseRef.current.movementEnergy;
      const { hue, sat, baseLight } = getSmoothPaletteColor(y, energy);

      const clusterSize = Math.min(5, 1 + Math.floor(speed * 0.2));

      for (let i = 0; i < clusterSize; i++) {
        if (particles.length >= maxParticles) {
          particles.shift();
        }

        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * (8 + speed * 1.2);

        const spawnX = x + Math.cos(offsetAngle) * offsetDist;
        const spawnY = y + Math.sin(offsetAngle) * offsetDist;

        const radius = 8 + Math.random() * 8 + energy * 10;
        const maxRadius = radius + 12 + Math.random() * 15 + speed * 1.5;

        particles.push({
          x: spawnX,
          y: spawnY,
          baseX: spawnX,
          baseY: spawnY,
          vx: vx * 0.15 + (Math.random() - 0.5) * 1.0,
          vy: vy * 0.15 + (Math.random() - 0.5) * 1.0,
          radius,
          maxRadius,
          hue,
          sat,
          baseLight,
          alpha: 0.4 + Math.min(0.4, energy * 0.35),
          life: 0,
          maxLife: 35 + Math.random() * 25,
          phase: Math.random() * Math.PI * 2,
          frequency: 0.04 + Math.random() * 0.04,
          amplitude: 4 + Math.random() * 6 + speed * 0.3,
        });
      }
    };

    // Pointer Event Listeners
    const onPointerMove = (e: MouseEvent | TouchEvent) => {
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
      mouse.vx = mouse.x - mouse.prevX;
      mouse.vy = mouse.y - mouse.prevY;
      mouse.speed = Math.hypot(mouse.vx, mouse.vy);
      mouse.moving = true;
      mouse.lastMoveTime = Date.now();

      mouse.movementEnergy = Math.min(1.0, mouse.movementEnergy + 0.08 + mouse.speed * 0.005);

      const normX = (mouse.x / width - 0.5) * 2;
      const normY = (mouse.y / height - 0.5) * 2;

      mouse.uiTargetX = normX * 12 + mouse.vx * 0.4;
      mouse.uiTargetY = normY * 10 + mouse.vy * 0.4;
      mouse.uiRotX = normY * -2.5;
      mouse.uiRotY = normX * 2.5;

      spawnWaveDisturbance(mouse.x, mouse.y, mouse.vx, mouse.vy, mouse.speed);
    };

    const onPointerClick = (e: MouseEvent) => {
      mouseRef.current.movementEnergy = 1.0;
      spawnWaveDisturbance(e.clientX, e.clientY, 0, 0, 10);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('click', onPointerClick);

    // Main 60 FPS Render & Liquid UI Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const now = Date.now();
      const timeSinceMove = now - mouse.lastMoveTime;
      const isMouseStopped = timeSinceMove > 100;

      if (isMouseStopped) {
        mouse.moving = false;
        mouse.movementEnergy *= 0.88;
        mouse.uiTargetX *= 0.9;
        mouse.uiTargetY *= 0.9;
        mouse.uiRotX *= 0.9;
        mouse.uiRotY *= 0.9;
      }

      // --- LIQUID WEBSITE UI WAVE MOTION CONTROLLER ---
      mouse.wavePhase += 0.04;
      mouse.uiCurrentX += (mouse.uiTargetX - mouse.uiCurrentX) * 0.1;
      mouse.uiCurrentY += (mouse.uiTargetY - mouse.uiCurrentY) * 0.1;

      const fluidSwayX = Math.sin(mouse.wavePhase) * (mouse.moving ? 3 : 0.8);
      const fluidSwayY = Math.cos(mouse.wavePhase * 0.8) * (mouse.moving ? 2.5 : 0.6);

      const totalX = mouse.uiCurrentX + fluidSwayX;
      const totalY = mouse.uiCurrentY + fluidSwayY;

      const websiteWrapper = document.getElementById('liquid-website-wrapper');
      if (websiteWrapper) {
        websiteWrapper.style.transform = `translate3d(${totalX.toFixed(2)}px, ${totalY.toFixed(2)}px, 0) rotateX(${mouse.uiRotX.toFixed(2)}deg) rotateY(${mouse.uiRotY.toFixed(2)}deg)`;
        websiteWrapper.style.transition = mouse.moving ? 'none' : 'transform 0.5s cubic-bezier(0.1, 0.8, 0.2, 1)';
      }

      // --- WATERCOLOR CANVAS DRAWING ---
      if (particles.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];

          if (isMouseStopped) {
            p.life += 2.5;
            p.alpha *= 0.86;
          } else {
            p.life++;
          }

          if (p.radius < p.maxRadius) {
            p.radius += 0.8;
          }

          p.phase += p.frequency;
          const waveDistortionX = Math.sin(p.phase + p.baseY * 0.02) * p.amplitude;
          const waveDistortionY = Math.cos(p.phase + p.baseX * 0.02) * (p.amplitude * 0.7);

          p.x = p.baseX + waveDistortionX + p.vx;
          p.y = p.baseY + waveDistortionY + p.vy;

          p.vx *= 0.94;
          p.vy *= 0.94;

          const lifeRatio = p.life / p.maxLife;
          let currentAlpha = p.alpha;
          if (lifeRatio > 0.3) {
            currentAlpha = p.alpha * (1 - (lifeRatio - 0.3) / 0.7);
          }

          if (p.life >= p.maxLife || currentAlpha <= 0.005) {
            particles.splice(i, 1);
            continue;
          }

          // Draw Soft Smooth Palette Color Blob
          const radialGrad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x + Math.sin(p.phase) * (p.radius * 0.12),
            p.y + Math.cos(p.phase) * (p.radius * 0.12),
            p.radius
          );

          const colorString = `hsla(${p.hue}, ${p.sat}%, ${p.baseLight}%, `;

          radialGrad.addColorStop(0, `${colorString}${currentAlpha})`);
          radialGrad.addColorStop(0.5, `${colorString}${currentAlpha * 0.6})`);
          radialGrad.addColorStop(0.85, `${colorString}${currentAlpha * 0.2})`);
          radialGrad.addColorStop(1, `${colorString}0)`);

          ctx.fillStyle = radialGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

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
  }, []);

  return (
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
        opacity: 0.92,
        filter: 'blur(1.5px)',
        transition: 'opacity 0.3s ease',
      }}
    />
  );
};

export default WatercolorCurrentCanvas;
