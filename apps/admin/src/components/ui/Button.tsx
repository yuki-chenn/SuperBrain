import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-[var(--sb-primary)] hover:bg-[var(--sb-primary-hover)] text-white border-transparent',
  secondary: 'bg-[var(--sb-bg-elevated)] hover:bg-[var(--sb-bg-muted)] text-[var(--sb-text-primary)] border-[var(--sb-border)]',
  ghost: 'bg-transparent hover:bg-[var(--sb-bg-muted)] text-[var(--sb-text-secondary)] border-transparent',
  danger: 'bg-[var(--sb-danger)] hover:bg-[var(--sb-danger)]/90 text-white border-transparent',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium border transition-[var(--sb-transition)] rounded-[var(--sb-radius-button)] hover:-translate-y-[1px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
