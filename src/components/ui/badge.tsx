import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'secondary'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors'
  const variants = {
    default: 'border-cyan-600 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-700 dark:text-cyan-300',
    outline: 'border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300',
    secondary: 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-200',
  }

  return <div className={cn(base, variants[variant], className)} {...props} />
}
