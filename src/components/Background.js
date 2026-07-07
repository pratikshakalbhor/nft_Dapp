import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function Background() {
  const canvasRef = useRef(null);
  const { isDark } = useTheme();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isLoginPage) {
      // 3D Tubes Gemstone Background
      let app;
      let active = true;

      import("../utils/tubesCursor").then((module) => {
        if (!active) return;
        const TubesCursor = module.default;
        try {
          app = TubesCursor(canvas, {
            bloom: {
              threshold: 0,
              strength: isDark ? 1.5 : 1.0,
              radius: 0.5
            },
            tubes: {
              count: 14,
              colors: isDark 
                ? ["#8b5cf6", "#ec4899", "#3b82f6"] // Neon purple, pink, and blue/indigo
                : ["#a855f7", "#ec4899", "#3b82f6"], // Vibrant colors for light mode
              minRadius: 0.035,
              maxRadius: 0.085,
              minTubularSegments: 64,
              maxTubularSegments: 96,
              lights: {
                intensity: isDark ? 220 : 160,
                colors: isDark 
                  ? ["#8b5cf6", "#ec4899", "#06b6d4", "#3b82f6"]
                  : ["#c084fc", "#f472b6", "#22d3ee", "#60a5fa"]
              }
            }
          });
        } catch (e) {
          console.error("Failed to initialize TubesCursor background:", e);
        }
      });

      return () => {
        active = false;
        if (app && typeof app.dispose === "function") {
          app.dispose();
        }
      };
    } else {
      // Elegant, high-performance Twinkling Starfield Background (many stars sparkling)
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      let animationFrameId;
      let width = 0;
      let height = 0;

      // Define star objects
      let stars = [];
      const starCount = 110;

      // Initialize stars spread across the viewport
      const initStars = (w, h) => {
        stars = [];
        // Theme colors matching the dashboard (neon pink, purple, blue, plus white for variety)
        const starColors = ["#FF2D95", "#8A2BE2", "#00C2FF", "#FFFFFF", "#FFFFFF", "#E0E0FF"];
        for (let i = 0; i < starCount; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            size: 0.8 + Math.random() * 1.8, // radius between 0.8px and 2.6px (makes them more visible)
            color: starColors[Math.floor(Math.random() * starColors.length)],
            baseOpacity: 0.15 + Math.random() * 0.75,
            phase: Math.random() * Math.PI * 2, // offset to make them twinkle at different times
            twinkleSpeed: 0.0012 + Math.random() * 0.0022 // speed of pulsation
          });
        }
      };


      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        initStars(width, height);
      };

      const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });
      resizeObserver.observe(canvas.parentNode || document.body);

      const draw = (currentTime) => {

        ctx.clearRect(0, 0, width, height);

        // Draw and update each star
        stars.forEach((star) => {
          // Soft twinkling using client timestamp, phase offset and speeds
          const wave = Math.sin(currentTime * star.twinkleSpeed + star.phase);
          
          // Calculate dynamic twinkle scale (0.05 min to baseOpacity max)
          const opacity = Math.max(0.05, star.baseOpacity * (0.35 + 0.65 * wave));

          ctx.fillStyle = star.color;
          ctx.globalAlpha = opacity;
          
          ctx.beginPath();
          // Draw standard circular star
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        });

        // Restore global opacity to preserve other canvas operations if any
        ctx.globalAlpha = 1.0;

        animationFrameId = requestAnimationFrame(draw);
      };

      resizeCanvas();
      animationFrameId = requestAnimationFrame(draw);

      return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
      };
    }
  }, [isLoginPage, isDark]);

  return (
    <>
      <style>{`
        .bg-container {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          width: 100vw;
          height: 100vh;
          background: ${isDark 
            ? "linear-gradient(135deg, #0b0b15 0%, #12122b 50%, #1b1035 100%)" 
            : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"};
          transition: background 0.5s ease;
        }

        /* Ambient background spots */
        .bg-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: ${isDark 
            ? "radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(0,0,0,0) 70%)"
            : "radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, rgba(0,0,0,0) 70%)"};
          filter: blur(60px);
          pointer-events: none;
          z-index: 1;
        }
        
        .bg-glow-1 {
          top: -10%;
          right: -10%;
        }

        .bg-glow-2 {
          bottom: -10%;
          left: -10%;
        }

        /* Modern Grid Overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(${isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.015)"} 1px, transparent 1px),
            linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.015)"} 1px, transparent 1px);
          background-size: 50px 50px;
          z-index: 2;
          pointer-events: none;
        }

        /* Radial Vignette */
        .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, ${isDark ? "rgba(8,7,16,0.4)" : "rgba(248,250,252,0.3)"} 100%);
          z-index: 3;
          pointer-events: none;
        }

        /* Glass Surface Overlay */
        .overlay {
          position: absolute;
          inset: 0;
          z-index: 4;
          backdrop-filter: saturate(120%) blur(1px);
          pointer-events: none;
        }
      `}</style>

      <div className="bg-container">
        {isLoginPage ? (
          <canvas
            key="webgl-canvas"
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              width: "100%",
              height: "100%",
              display: "block",
              pointerEvents: "none",
            }}
          />
        ) : (
          <canvas
            key="starfield-canvas"
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              width: "100%",
              height: "100%",
              display: "block",
              pointerEvents: "none",
            }}
          />
        )}
        {isLoginPage && <div className="bg-glow bg-glow-1" />}
        {isLoginPage && <div className="bg-glow bg-glow-2" />}
        <div className="grid-overlay" />
        <div className="vignette" />
        <div className="overlay" />
      </div>
    </>
  );
}