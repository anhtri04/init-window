import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand-green/35 disabled:cursor-not-allowed disabled:opacity-50';

  const variants = {
    primary: 'bg-brand-green text-ink active:bg-brand-green-dark active:text-on-dark',
    secondary: 'bg-canvas text-ink border border-hairline-strong active:bg-surface',
    danger: 'bg-red-50 text-red-700 border border-red-200 active:bg-red-100',
    ghost: 'bg-transparent text-ink active:bg-surface',
  };

  const sizes = {
    sm: 'min-h-8 px-3 py-1 text-sm',
    md: 'min-h-10 px-5 py-2 text-sm',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
