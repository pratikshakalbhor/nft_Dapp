import React from 'react';
import { useTheme } from '../context/ThemeContext';

const SkeletonCard = () => {
  const { isDark } = useTheme();

  const shimmerStyle = {
    background: isDark
      ? 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)'
      : 'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite linear',
    borderRadius: '8px',
  };

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{
        borderRadius: '20px',
        overflow: 'hidden',
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
      }}>
        {/* Image skeleton */}
        <div style={{ aspectRatio: '1', ...shimmerStyle, borderRadius: 0 }} />

        {/* Content skeleton */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ height: '18px', width: '70%', ...shimmerStyle }} />
          <div style={{ height: '14px', width: '40%', ...shimmerStyle }} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <div style={{ height: '36px', flex: 1, ...shimmerStyle }} />
            <div style={{ height: '36px', flex: 1, ...shimmerStyle }} />
          </div>
        </div>
      </div>
    </>
  );
};

export default SkeletonCard;
