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

  // Mouse & Touch Tracking
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
    movementEnergy: 0, // Accumulates as user moves more
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
    const maxParticles = 280;

    // Full unified color palette from purple downward:
    // Top (y=0): Deep Royal Purple (270) -> Violet (285)
    // Mid (y=0.5): Electric Magenta (310) -> Indigo/Blue (240)
    // Bottom (y=1.0): Ocean Cyan (195) -> Emerald Teal (165)
    const getPaletteColorForPosition = (y: number, energy: number) => {
      const ratio = Math.max(0, Math.min(1, y / height));

      let hue: number;
      if (ratio < 0.33) {
        hue = 265 + (ratio / 0.33) * 25; // 265 -> 290 (Purple to Violet)
      } else if (ratio < 0.66) {
        const midRatio = (ratio - 0.33) / 0.33;
        hue = 290 - midRatio * 50; // 290 -> 240 (Violet/Magenta to Royal Blue)
      } else {
        const botRatio = (ratio - 0.66) / 0.34;
        hue = 240 - botRatio * 75; // 240 -> 165 (Blue to Cyan & Emerald)
      }

      // As movement energy increases, colors become dramatically brighter & more luminous!
      const sat = Math.min(100, 80 + energy * 20);
      const baseLight = 45 + Math.min(40, energy * 35); // Increases brightness on faster/continuous movement

      return { hue, sat, baseLight };
    };

    // Spawn interconnected liquid wave disturbance blobs
    const spawnWaveDisturbance = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      speed: number
    ) => {
      const energy = mouseRef.current.movementEnergy;
      const { hue, sat, baseLight } = getPaletteColorForPosition(y, energy);

      // Create overlapping wave clusters that blend into one continuous color sheet
      const clusterSize = Math.min(8, 2 + Math.floor(speed * 0.3));

      for (let i = 0; i < clusterSize; i++) {
        if (particles.length >= maxParticles) {
          particles.shift();
        }

        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * (20 + speed * 2);

        const spawnX = x + Math.cos(offsetAngle) * offsetDist;
        const spawnY = y + Math.sin(offsetAngle) * offsetDist;

        // Wave disturbance radius grows larger and brighter as movement increases
        const radius = 25 + Math.random() * 20 + energy * 30;
        const maxRadius = radius + 30 + Math.random() * 40 + speed * 3;

        particles.push({
          x: spawnX,
          y: spawnY,
          baseX: spawnX,
          baseY: spawnY,
          vx: vx * 0.2 + (Math.random() - 0.5) * 1.5,
          vy: vy * 0.2 + (Math.random() - 0.5) * 1.5,
          radius,
          maxRadius,
          hue,
          sat,
          baseLight,
          alpha: 0.35 + Math.min(0.4, energy * 0.35),
          life: 0,
          maxLife: 40 + Math.random() * 30, // Settles quickly when cursor stops
          phase: Math.random() * Math.PI * 2,
          frequency: 0.03 + Math.random() * 0.04,
          amplitude: 8 + Math.random() * 12 + speed * 0.5, // Water wave ripple height
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

      // Accumulate energy: the more the user moves, the brighter the colors get!
      mouse.movementEnergy = Math.min(1.0, mouse.movementEnergy + 0.08 + mouse.speed * 0.005);

      spawnWaveDisturbance(mouse.x, mouse.y, mouse.vx, mouse.vy, mouse.speed);
    };

    const onPointerClick = (e: MouseEvent) => {
      mouseRef.current.movementEnergy = 1.0;
      spawnWaveDisturbance(e.clientX, e.clientY, 0, 0, 15);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('click', onPointerClick);

    // Main 60 FPS Render Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      const timeSinceMove = now - mouseRef.current.lastMoveTime;
      const isMouseStopped = timeSinceMove > 100;

      if (isMouseStopped) {
        mouseRef.current.moving = false;
        // Decay movement energy smoothly back to 0 when cursor stops
        mouseRef.current.movementEnergy *= 0.88;
      }

      if (particles.length > 0) {
        ctx.save();
        // Screen composite mode blends overlapping colors into a smooth continuous watercolor palette
        ctx.globalCompositeOperation = 'screen';

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];

          if (isMouseStopped) {
            p.life += 2.5;
            p.alpha *= 0.86; // Rapid clean fade back to static background
          } else {
            p.life++;
          }

          // Expand radius simulating watercolor liquid spreading
          if (p.radius < p.maxRadius) {
            p.radius += 1.2;
          }

          // --- WATER WAVE DISTURBANCE MOTION (Sine / Cosine Wave Equations) ---
          p.phase += p.frequency;
          const waveDistortionX = Math.sin(p.phase + p.baseY * 0.015) * p.amplitude;
          const waveDistortionY = Math.cos(p.phase + p.baseX * 0.015) * (p.amplitude * 0.7);

          p.x = p.baseX + waveDistortionX + p.vx;
          p.y = p.baseY + waveDistortionY + p.vy;

          p.vx *= 0.95;
          p.vy *= 0.95;

          // Fade calculation
          const lifeRatio = p.life / p.maxLife;
          let currentAlpha = p.alpha;
          if (lifeRatio > 0.3) {
            currentAlpha = p.alpha * (1 - (lifeRatio - 0.3) / 0.7);
          }

          if (p.life >= p.maxLife || currentAlpha <= 0.005) {
            particles.splice(i, 1);
            continue;
          }

          // Draw Soft Continuous Blended Watercolor Palette Gradient
          const radialGrad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x + Math.sin(p.phase) * (p.radius * 0.15),
            p.y + Math.cos(p.phase) * (p.radius * 0.15),
            p.radius
          );

          const colorString = `hsla(${p.hue}, ${p.sat}%, ${p.baseLight}%, `;

          radialGrad.addColorStop(0, `${colorString}${currentAlpha})`);
          radialGrad.addColorStop(0.45, `${colorString}${currentAlpha * 0.65})`);
          radialGrad.addColorStop(0.8, `${colorString}${currentAlpha * 0.25})`);
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
        filter: 'blur(2px)', // Blends all colors together smoothly into one unified watercolor sheet
        transition: 'opacity 0.3s ease',
      }}
    />
  );
};

export default WatercolorCurrentCanvas;
