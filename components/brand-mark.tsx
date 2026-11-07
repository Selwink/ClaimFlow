import { cn } from '@/lib/utils';
import { SparklesIcon } from './icons';

export function BrandMark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground',
        {
          'size-6 rounded-md': size === 'sm',
          'size-8': size === 'md',
          'size-11 rounded-xl': size === 'lg',
        },
        className,
      )}
    >
      <SparklesIcon size={size === 'lg' ? 18 : 14} />
    </span>
  );
}
