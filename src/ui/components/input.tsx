import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function Input({ className, 'aria-invalid': invalid, ...props }: ComponentProps<'input'>) {
  return (
    <input
      aria-invalid={invalid}
      className={cn(
        'h-8 min-w-0 rounded-lg border bg-muted px-2.5 text-[13px] text-foreground outline-none placeholder:text-subtle-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500/70',
        className,
      )}
      {...props}
    />
  );
}
