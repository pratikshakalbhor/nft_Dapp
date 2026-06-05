import { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

export default function Background() {
  const canvasRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animId;
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    // Small floating crystalline particles
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.4 + 0.1,
      opacity: Math.random() * 0.5 + 0.1,
      angle: Math.random() * Math.PI * 2,
      spin: Math.random() * 0.02 - 0.01,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);

      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        
        // Draw a small diamond/crystal shape
        ctx.moveTo(0, -p.size * 2);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(0, p.size * 2);
        ctx.lineTo(-p.size, 0);
        ctx.closePath();

        const color = isDark ? "139, 92, 246" : "99, 102, 241";
        ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
        ctx.fill();
        
        // Add minimal glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${color}, ${p.opacity * 0.5})`;
        
        ctx.restore();

        // Update positions
        p.y -= p.speed;
        p.angle += p.spin;
        if (p.y < -10) {
          p.y = H + 10;
          p.x = Math.random() * W;
        }
      });

      animId = requestAnimationFrame(draw);
    }

    draw();

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [isDark]);

  return (
    <>
      <style>{`
        .bg-container {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          background: ${isDark ? "#0a0a1a" : "#f8fafc"};
          transition: background 0.5s ease;
        }
        
        /* Animated Blobs */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: ${isDark ? 0.4 : 0.25};
          animation: float 20s infinite alternate;
          z-index: 0;
        }
        
        .blob-1 {
          width: 40vw;
          height: 40vw;
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          top: -10%;
          right: -10%;
          animation-duration: 25s;
        }
        
        .blob-2 {
          width: 35vw;
          height: 35vw;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          bottom: -5%;
          left: -5%;
          animation-delay: -5s;
        }
        
        .blob-3 {
          width: 30vw;
          height: 30vw;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          top: 40%;
          left: 30%;
          animation-duration: 30s;
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 100px) scale(1.1); }
        }

        /* Modern Grid Overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} 1px, transparent 1px),
            linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 1;
        }

        /* Radial Vignette */
        .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, ${isDark ? "rgba(10,10,26,0.3)" : "rgba(255,255,255,0.2)"} 100%);
          z-index: 2;
        }

        /* Glass Surface */
        .overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          backdrop-filter: saturate(140%) blur(2px);
          pointer-events: none;
        }
      `}</style>

      <div className="bg-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="grid-overlay" />
        <div className="vignette" />
        <div className="overlay" />
        
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            pointerEvents: "none",
          }}
        />
      </div>
    </>
  );
}