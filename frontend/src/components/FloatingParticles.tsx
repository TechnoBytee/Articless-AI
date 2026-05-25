import { useEffect, useRef } from 'react';
import { useTheme } from '../App';

export const FloatingParticles = () => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle type definition
    interface Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      angle?: number;
      r?: number;
      theta?: number;
      orbitSpeed?: number;
      opacity?: number;
      opacitySpeed?: number;
    }

    let particles: Particle[] = [];

    const createParticles = () => {
      particles = [];
      const count = theme === 'venus' ? 120 : 80;
      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < count; i++) {
        if (theme === 'venus') {
          // Cluster in center circle of radius ~150
          const r = Math.random() * 160;
          const theta = Math.random() * Math.PI * 2;
          const orbitSpeed = (Math.random() * 0.005 + 0.002) * (Math.random() < 0.5 ? 1 : -1);
          // Turquoise and Blue shades
          const colors = ['#00F5D4', '#00BBF9', '#4CC9F0', '#0077B6', '#03E2FF'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          particles.push({
            x: cx + r * Math.cos(theta),
            y: cy + r * Math.sin(theta),
            baseX: cx + r * Math.cos(theta),
            baseY: cy + r * Math.sin(theta),
            r,
            theta,
            orbitSpeed,
            size: Math.random() * 3 + 2,
            color,
            speedX: 0,
            speedY: 0,
            opacity: Math.random() * 0.5 + 0.5
          });
        } else if (theme === 'saturn') {
          // Orbiting along flat ring structure
          const r = Math.random() * 280 + 120;
          const theta = Math.random() * Math.PI * 2;
          const orbitSpeed = Math.random() * 0.004 + 0.001;
          const colors = ['#D4A373', '#FAEDCD', '#E9C46A', '#F4A261', '#E76F51'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          particles.push({
            x: cx + r * Math.cos(theta),
            y: cy + r * Math.sin(theta) * 0.2,
            baseX: cx + r * Math.cos(theta),
            baseY: cy + r * Math.sin(theta) * 0.2,
            r,
            theta,
            orbitSpeed,
            size: Math.random() * 2.5 + 1.5,
            color,
            speedX: 0,
            speedY: 0,
            opacity: Math.random() * 0.5 + 0.5
          });
        } else if (theme === 'moon') {
          // Low gravity vertical drift
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            baseX: 0,
            baseY: 0,
            size: Math.random() * 2.5 + 1,
            color: '#ADB5BD',
            speedX: Math.random() * 0.2 - 0.1,
            speedY: Math.random() * 0.3 + 0.1,
            opacity: Math.random() * 0.6 + 0.2
          });
        } else {
          // 'space' theme stars fading
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            baseX: 0,
            baseY: 0,
            size: Math.random() * 2 + 1,
            color: Math.random() < 0.7 ? '#4CC9F0' : '#7209B7',
            speedX: Math.random() * 0.4 - 0.2,
            speedY: Math.random() * 0.4 - 0.2,
            opacity: Math.random(),
            opacitySpeed: Math.random() * 0.01 + 0.005
          });
        }
      }
    };

    createParticles();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      createParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX - window.innerWidth / 2;
      mouseRef.current.targetY = e.clientY - window.innerHeight / 2;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      const cx = width / 2;
      const cy = height / 2;

      particles.forEach((p) => {
        if (theme === 'venus') {
          p.theta = (p.theta || 0) + (p.orbitSpeed || 0.002);
          
          const bx = cx + (p.r || 0) * Math.cos(p.theta);
          const by = cy + (p.r || 0) * Math.sin(p.theta);

          const dx = bx - cx;
          const dy = by - cy;
          const distToCenter = Math.sqrt(dx * dx + dy * dy);
          
          // Parallax movement factor
          const parallaxFactor = 0.15;
          
          // Wiggle effect inside circle
          p.x = bx - mouse.x * parallaxFactor + (mouse.x * 0.05 * (distToCenter / 150)) + Math.cos(p.theta * 3) * 2;
          p.y = by - mouse.y * parallaxFactor + (mouse.y * 0.05 * (distToCenter / 150)) + Math.sin(p.theta * 3) * 2;

          // Outer glowing halo
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = (p.opacity || 0.8) * 0.25;
          ctx.fill();

          // Inner core
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity || 0.8;
          ctx.fill();
        } else if (theme === 'saturn') {
          p.theta = (p.theta || 0) + (p.orbitSpeed || 0.002);
          const ringX = (p.r || 0) * Math.cos(p.theta);
          const ringY = (p.r || 0) * Math.sin(p.theta) * 0.25;

          const angle = -15 * (Math.PI / 180);
          const rotX = ringX * Math.cos(angle) - ringY * Math.sin(angle);
          const rotY = ringX * Math.sin(angle) + ringY * Math.cos(angle);

          p.x = cx + rotX - mouse.x * 0.08;
          p.y = cy + rotY - mouse.y * 0.08;

          // Outer glowing halo
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = (p.opacity || 0.8) * 0.25;
          ctx.fill();

          // Inner core
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity || 0.8;
          ctx.fill();
        } else if (theme === 'moon') {
          p.y += p.speedY;
          p.x += p.speedX;

          const renderX = p.x - mouse.x * 0.03;
          const renderY = p.y - mouse.y * 0.03;

          if (p.y > height) {
            p.y = 0;
            p.x = Math.random() * width;
          }
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;

          ctx.beginPath();
          ctx.arc(renderX, renderY, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity || 0.5;
          ctx.fill();
        } else {
          p.x += p.speedX;
          p.y += p.speedY;

          if (p.opacity !== undefined && p.opacitySpeed !== undefined) {
            p.opacity += p.opacitySpeed;
            if (p.opacity > 1 || p.opacity < 0.1) {
              p.opacitySpeed = -p.opacitySpeed;
            }
          }

          const renderX = p.x - mouse.x * 0.05;
          const renderY = p.y - mouse.y * 0.05;

          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;

          // Outer glowing halo
          ctx.beginPath();
          ctx.arc(renderX, renderY, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = (p.opacity || 0.7) * 0.25;
          ctx.fill();

          // Inner core
          ctx.beginPath();
          ctx.arc(renderX, renderY, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity || 0.7;
          ctx.fill();
        }
      });

      if (theme === 'venus') {
        const circleX = cx - mouse.x * 0.15;
        const circleY = cy - mouse.y * 0.15;

        // Outer glow circle stroke (simulated shadow)
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.03)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(circleX, circleY, 170, 0, Math.PI * 2);
        ctx.stroke();

        // Inner sharp stroke
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(circleX, circleY, 170, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
