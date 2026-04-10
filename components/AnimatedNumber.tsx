import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  format?: (v: number) => string;
  className?: string;
}

/**
 * AnimatedNumber Component
 * Provides a smooth transition (count-up) when the value changes.
 * Uses framer-motion springs for premium feel.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, format, className }) => {
  const spring = useSpring(0, { 
    mass: 1, 
    stiffness: 60, 
    damping: 20,
    restDelta: 0.001
  });
  
  const display = useTransform(spring, (current) => 
    format ? format(current) : Math.round(current).toLocaleString('pt-BR')
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  );
};
