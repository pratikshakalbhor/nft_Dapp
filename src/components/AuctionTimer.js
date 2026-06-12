import React, { useState, useEffect } from 'react';
import { Gavel, Clock, Flame } from 'lucide-react';

const AuctionTimer = ({ endTime, isDark }) => {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const diff = endTime - now;
      if (diff <= 0) { setExpired(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s });
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (expired) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 800, fontSize: '0.9rem' }}>
      <Gavel size={16} /> Auction Ended
    </div>
  );

  const pad = n => String(n).padStart(2, '0');
  const urgency = timeLeft.h === 0 && timeLeft.m < 10;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {urgency ? <Flame size={18} color="#f97316" /> : <Clock size={18} color="#10b981" />}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[{ val: pad(timeLeft.h), label: 'h' }, { val: pad(timeLeft.m), label: 'm' }, { val: pad(timeLeft.s), label: 's' }].map(({ val, label }) => (
          <div key={label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: urgency ? 'rgba(249,115,22,0.15)' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
            border: `1px solid ${urgency ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '10px', padding: '6px 10px', minWidth: '50px'
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: '1.2rem', color: urgency ? '#f97316' : '#10b981' }}>{val}</span>
            <span style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuctionTimer;
