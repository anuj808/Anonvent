import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  animate = false,
  delay = 0,
  ...props
}) => {
  const cardStyles = `bg-card border border-card-border shadow-premium rounded-3xl p-8 ${className}`;

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 15 } : undefined}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: '-50px' }}
      transition={animate ? { duration: 0.6, ease: 'easeOut', delay } : undefined}
      className={cardStyles}
      {...props}
    >
      {children}
    </motion.div>
  );
};
