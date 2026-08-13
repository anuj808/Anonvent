import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'text';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-2xl px-6 py-3.5 text-base tracking-wide';

  const variants = {
    primary: 'bg-primary text-background hover:bg-primary-hover active:bg-primary-dark shadow-soft',
    secondary: 'bg-card border border-card-border text-primary hover:bg-primary-light active:bg-card-darker shadow-subtle',
    text: 'text-primary hover:text-primary-hover hover:bg-primary-light px-4 py-2',
  };

  return (
    <motion.button
      whileHover={{ y: -1, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};
