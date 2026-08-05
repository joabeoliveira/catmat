import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select className={cn('flex h-10 w-full appearance-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

export function SelectTrigger(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-sm text-slate-400">{placeholder}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 space-y-1">{children}</div>
}

export function SelectItem({ children, value }: { children: React.ReactNode; value: string }) {
  return <option value={value}>{children}</option>
}
