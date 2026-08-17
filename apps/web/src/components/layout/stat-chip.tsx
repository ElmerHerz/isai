import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tintBackground, tintForeground, tintBorder } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { useCurrentModuleColor } from './use-current-module-color';

interface StatChipProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /**
   * neutral/success/warning = tonos fijos (mismo criterio en cualquier
   * módulo). accent = usa el color del módulo actual (como el chip "Grupos"
   * del proyecto Angular anterior).
   */
  tone?: 'neutral' | 'success' | 'warning' | 'accent';
}

const toneClasses: Record<NonNullable<StatChipProps['tone']>, string> = {
  neutral: 'bg-white text-slate-700 border-slate-200 dark:bg-card dark:text-foreground dark:border-border',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
  accent: '',
};

export function StatChip({ icon: Icon, label, value, tone = 'neutral' }: StatChipProps) {
  const moduleColor = useCurrentModuleColor();
  const isDark = useIsDarkMode();

  const accentStyle =
    tone === 'accent'
      ? {
          backgroundColor: tintBackground(moduleColor, isDark),
          color: tintForeground(moduleColor, isDark),
          borderColor: tintBorder(moduleColor, isDark),
        }
      : undefined;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm',
        toneClasses[tone],
      )}
      style={accentStyle}
    >
      <Icon className="h-4 w-4 opacity-80" />
      <span className="font-medium opacity-75">{label}</span>
      <span className="text-base font-bold">{value}</span>
    </div>
  );
}
