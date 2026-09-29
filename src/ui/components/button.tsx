import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

type Variant = 'default' | 'ghost' | 'primary';

const VARIANTS: Record<Variant, string> = {
  default: 'bg-muted text-foreground hover:bg-accent border',
  ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
};

export function Button({ className, variant = 'default', ...props }: ComponentProps<'button'> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
