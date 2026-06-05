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

    const NODE_COUNT = 72;
    const MAX_DIST = 155;
    const SPEED = 0.38;

    // Dimmed palette — slightly lower opacity for both modes
    const nodeColor = isDark ? "rgba(0,200,185,{a})"  : "rgba(99,102,241,{a})";
    const lineColor = isDark ? "rgba(0,185,170,{a})"  : "rgba(99,102,241,{a})";
    const dotGlow   = isDark ? "#00cdb8"               : "#6366f1";
    const bgGrad1   = isDark ? "#010c0b"               : "#f5f4ff";
    const bgGrad2   = isDark ? "#051513"               : "#ede9ff";
    const bgGrad3   = isDark ? "#081820"               : "#e8f0ff";

    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: Math.random() * 2.0 + 1.0,
    }));

    function mkColor(template, alpha) {
      return template.replace("{a}", alpha.toFixed(3));
    }

    function draw() {
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0,   bgGrad1);
      grad.addColorStop(0.5, bgGrad2);
      grad.addColorStop(1,   bgGrad3);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Lines — dimmed alpha
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            // Dimmed to ~40% of original brightness
            const alpha = (1 - dist / MAX_DIST) * (isDark ? 0.32 : 0.22);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = mkColor(lineColor, alpha);
            ctx.lineWidth = isDark ? 0.7 : 0.6;
            ctx.stroke();
          }
        }
      }

      // Nodes — dimmed glow
      for (const node of nodes) {
        // Soft glow halo — reduced radius & opacity
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.r * 3.5);
        grd.addColorStop(0, mkColor(nodeColor, isDark ? 0.55 : 0.45));
        grd.addColorStop(1, mkColor(nodeColor, 0));
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core dot — slightly dimmer
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = dotGlow;
        ctx.globalAlpha = isDark ? 0.7 : 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function update() {
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > W) node.vx *= -1;
        if (node.y < 0 || node.y > H) node.vy *= -1;
      }
    }

    function loop() {
      update();
      draw();
      animId = requestAnimationFrame(loop);
    }

    loop();

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
      {/* Layer 1 — Animated plexus canvas with strong blur + brightness reduction */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          display: "block",
          filter: "blur(3px) brightness(0.65)",
        }}
      />

      {/* Layer 2 — Semi-transparent dark gradient overlay for readability */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: "linear-gradient(160deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.36) 50%, rgba(0,0,0,0.50) 100%)",
        }}
      />
    </>
  );
}