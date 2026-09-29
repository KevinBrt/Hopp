import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-kbd px-1.5 font-sans text-[11px] leading-none font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/** Renders "Ctrl+Shift+K" as separate keys. */
export function KeyCombo({ combo, className }: { combo: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {combo.split('+').map((key, index) => (
        <Kbd key={index}>{key}</Kbd>
      ))}
    </span>
  );
}
