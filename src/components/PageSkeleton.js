import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function PageSkeleton() {
  const { isDark } = useTheme();

  const shimmerStyle = {
    background: isDark
      ? "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)"
      : "linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite linear",
    borderRadius: "12px",
  };

  const glassStyle = {
    background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(24px)",
    border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
    borderRadius: "24px",
    padding: "24px",
  };

  return (
    <div style={{ padding: "80px 24px", maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Title skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "40px" }}>
        <div style={{ height: "36px", width: "250px", ...shimmerStyle }} />
        <div style={{ height: "18px", width: "350px", ...shimmerStyle }} />
      </div>

      {/* Grid wrapper */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} style={glassStyle}>
            <div style={{ aspectRatio: "1", ...shimmerStyle, borderRadius: "16px", marginBottom: "16px" }} />
            <div style={{ height: "20px", width: "80%", ...shimmerStyle, marginBottom: "10px" }} />
            <div style={{ height: "14px", width: "50%", ...shimmerStyle, marginBottom: "20px" }} />
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ height: "40px", flex: 1, ...shimmerStyle }} />
              <div style={{ height: "40px", flex: 1, ...shimmerStyle }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
