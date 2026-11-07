import { cn } from '@/lib/utils';
import type { WarrantyStatus } from '@/lib/garantie/types';

const styles: Record<WarrantyStatus, string> = {
  actief:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  verloopt:
    'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  verlopen: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

const labels: Record<WarrantyStatus, string> = {
  actief: 'Actief',
  verloopt: 'Verloopt binnenkort',
  verlopen: 'Verlopen',
};

export const statusBarColor: Record<WarrantyStatus, string> = {
  actief: 'bg-emerald-500',
  verloopt: 'bg-amber-500',
  verlopen: 'bg-red-500',
};

export function StatusBadge({
  status,
  className,
}: {
  status: WarrantyStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
