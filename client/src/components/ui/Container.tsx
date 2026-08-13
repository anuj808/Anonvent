import React from 'react';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  size = 'md',
  ...props
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div
      className={`w-full mx-auto px-6 ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
