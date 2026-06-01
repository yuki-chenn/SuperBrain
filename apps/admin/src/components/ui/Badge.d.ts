import { ReactNode } from 'react';
type Variant = 'default' | 'primary' | 'success' | 'warning' | 'danger';
interface BadgeProps {
    children: ReactNode;
    variant?: Variant;
    className?: string;
}
export declare function Badge({ children, variant, className }: BadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Badge.d.ts.map