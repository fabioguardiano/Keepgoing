import React from 'react';

interface KeepGoingLogoProps {
  className?: string;
  size?: number | string;
  color?: string;
  showText?: boolean;
  textColor?: string;
}

export const KeepGoingLogo: React.FC<KeepGoingLogoProps> = ({ 
  className = '', 
  size = 48, 
  color = 'currentColor',
  showText = true,
  textColor = 'currentColor'
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stylized Arrow Icon based on the provided mockup */}
        <path 
          d="M20 70C25 55 35 45 50 40M30 75C38 60 50 50 65 45M40 80C55 70 70 60 85 30" 
          stroke={color} 
          strokeWidth="8" 
          strokeLinecap="round"
        />
        <path 
          d="M85 30L70 30M85 30L85 45" 
          stroke={color} 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M45 85C60 75 75 60 90 25" 
          stroke={color} 
          strokeWidth="8" 
          strokeLinecap="round"
        />
        
        {/* Refined paths to match the "multiple paths" look */}
        <path d="M15 65C25 45 45 35 70 25" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <path d="M25 80C40 65 60 50 85 30" stroke={color} strokeWidth="12" strokeLinecap="round" />
        
        {/* The Arrow Head */}
        <path d="M85 30L65 28L87 50L85 30Z" fill={color} />
      </svg>
      {showText && (
        <span 
          className="font-bold tracking-tight" 
          style={{ 
            color: textColor, 
            fontSize: typeof size === 'number' ? size * 0.7 : '1.5rem',
            fontFamily: "'Poppins', sans-serif"
          }}
        >
          keepGoing
        </span>
      )}
    </div>
  );
};
