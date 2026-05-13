import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}

export function PageContainer({ children, wide = false, className = '' }: PageContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-4 md:px-6 lg:px-8 py-8 ${wide ? 'max-w-[1440px]' : 'max-w-[1200px]'} ${className}`}
    >
      {children}
    </div>
  );
}
