import { cn } from '../lib/cn';

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onValueChange: (value: T) => void;
  'aria-label'?: string;
}

export function Segmented<T extends string>({ value, options, onValueChange, ...props }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" className="inline-flex rounded-lg bg-muted p-0.5" {...props}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onValueChange(option.value)}
          className={cn(
            'h-7 rounded-md px-3 text-[12.5px] whitespace-nowrap font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
            option.value === value
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
