import React, { useState, useEffect, useCallback } from 'react';

const SplashScreen = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  const finish = useCallback(() => onFinish(), [onFinish]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 1.2;
      });
    }, 25);
    const fadeTimer = setTimeout(() => setFadeOut(true), 2500);
    const finishTimer = setTimeout(finish, 3000);
    return () => { clearInterval(interval); clearTimeout(fadeTimer); clearTimeout(finishTimer); };
  }, [finish]);

  return (
    <div className={`splash-overlay ${fadeOut ? 'splash-fade-out' : ''}`}>
      <div className="splash-content">
        {/* Brand name with stagger animation */}
        <h1 className="splash-title">
          {'SLTS Fleet'.split('').map((char, i) => (
            <span key={i} className="splash-letter" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </h1>

        <p className="splash-subtitle">Fleet Management System</p>

        {/* Progress bar */}
        <div className="splash-progress-track">
          <div className="splash-progress-bar" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
