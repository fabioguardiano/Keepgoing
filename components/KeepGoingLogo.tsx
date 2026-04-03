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
        {/* Barras crescentes */}
        <rect x="8"  y="68" width="14" height="24" rx="3" fill={color} />
        <rect x="27" y="52" width="14" height="40" rx="3" fill={color} />
        <rect x="46" y="36" width="14" height="56" rx="3" fill={color} />

        {/* Linhas curvas conectando as barras à seta */}
        <path
          d="M15 62 Q30 30 68 14"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M34 46 Q50 22 68 14"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Seta apontando para cima-direita */}
        <path
          d="M68 14 L92 8 L86 32 Z"
          fill={color}
        />
        {/* Linha diagonal da seta */}
        <line
          x1="76"
          y1="22"
          x2="92"
          y2="8"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span
          className="font-bold tracking-tight"
          style={{
            color: textColor,
            fontSize: typeof size === 'number' ? size * 0.38 : '1.2rem',
            fontFamily: "'Poppins', sans-serif"
          }}
        >
          KeepGoing
        </span>
      )}
    </div>
  );
};
