import type React from 'react'
import type { LucideIcon } from 'lucide-react'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">Operations</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-700/80 ${className}`} />
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <Skeleton className="h-5 w-44" />
      </div>
      <div className="divide-y divide-zinc-800">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-400 ring-1 ring-yellow-500/20">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-zinc-50">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-sm shadow-yellow-900/20 transition-all hover:-translate-y-0.5 hover:bg-yellow-400 hover:shadow-md disabled:pointer-events-none disabled:opacity-60'

export const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-300 shadow-sm transition-all hover:-translate-y-0.5 hover:border-yellow-500/40 hover:bg-yellow-400/10 hover:text-yellow-300'

export const inputClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 shadow-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/20'

export const cardClass =
  'rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm shadow-black/25 transition-all hover:shadow-md hover:shadow-black/35'

export const tableHeadClass =
  'bg-zinc-950 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400'

export const tableRowClass =
  'transition-colors hover:bg-yellow-400/10'