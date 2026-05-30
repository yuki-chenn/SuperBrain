import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] placeholder:text-[var(--sb-text-muted)] focus:outline-none focus:border-[var(--sb-primary)] focus:ring-1 focus:ring-[var(--sb-primary)]/30 transition-[var(--sb-transition)] ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-[var(--sb-danger)]">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
