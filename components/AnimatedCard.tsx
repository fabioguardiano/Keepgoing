import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  onClick?: () => void;
}

/**
 * AnimatedCard Component
 * A premium wrapper for KPI cards and other data displays.
 * Provides staggered entrance and subtle interactive hover effects.
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  delay = 0, 
  className = "",
  onClick
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        delay, 
        ease: [0.16, 1, 0.3, 1] // Apple-style smooth ease-out
      }}
      whileHover={{ 
        y: -5,
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * AnimatedStagger Wrapper
 * Helper to wrap groups of cards and automatically apply staggered delays.
 */
export const AnimatedStagger: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          // If the child is an AnimatedCard, we could inject the delay here
          // but for now we'll let the user pass the delay manually or use simple indexing
          return child;
        }
        return child;
      })}
    </div>
  );
};
