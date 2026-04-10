import React from 'react';

export const LiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[var(--body-bg)] transition-colors duration-500">
      {/* Primary blobs with specific colors based on primary color */}
      <div 
        className="liquid-blob top-[-10%] left-[-10%] bg-[var(--primary-color)]" 
        style={{ opacity: 0.15, filter: 'blur(100px)' }}
      />
      <div 
        className="liquid-blob bottom-[10%] right-[-10%] bg-[var(--secondary-color)] animate-liquid-delayed" 
        style={{ opacity: 0.1, filter: 'blur(120px)' }}
      />
      <div 
        className="liquid-blob top-[20%] right-[10%] bg-[var(--accent-color)]" 
        style={{ opacity: 0.05, filter: 'blur(150px)' }}
      />
      {/* Subtle overlay to soften the look */}
      <div className="absolute inset-0 opacity-10" />
    </div>
  );
};
