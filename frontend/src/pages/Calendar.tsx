import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import type { CalendarDayDetail, CalendarMonthResponse, ParcelList } from '../types'
import { ChevronLeft, ChevronRight, CalendarDays, Package, CheckCircle2, Clock, X } from 'lucide-react'
import { EmptyState, PageHeader, Skeleton, buttonSecondary, cardClass, tableHeadClass, tableRowClass } from '../components/ui'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-gray-100 text-zinc-300',
  sorted: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30',
  assigned: 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30',
  in_transit: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30',
  failed: 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30',
  reattempt_scheduled: 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/30',
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export default function CalendarPage() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-based
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())

  const [monthData, setMonthData] = useState<CalendarMonthResponse | null>(null)
  const [monthLoading, setMonthLoading] = useState(true)

  const [dayDetail, setDayDetail] = useState<CalendarDayDetail | null>(null)
  const [dayLoading, setDayLoading] = useState(false)

  // Fetch month summary
  useEffect(() => {
    let cancelled = false
    const fetchMonth = async () => {
      setMonthLoading(true)
      try {
        const { data } = await api.get<CalendarMonthResponse>(
          `/parcels/parcels/calendar/?year=${viewYear}&month=${viewMonth + 1}`
        )
        if (!cancelled) setMonthData(data)
      } catch (err) {
        console.error('Failed to fetch calendar month', err)
      } finally {
        if (!cancelled) setMonthLoading(false)
      }
    }
    fetchMonth()
    return () => {
      cancelled = true
    }
  }, [viewYear, viewMonth])

  // Fetch day detail when a day is selected
  useEffect(() => {
    if (selectedDay == null) {
      setDayDetail(null)
      return
    }
    let cancelled = false
    const fetchDay = async () => {
      setDayLoading(true)
      try {
        const { data } = await api.get<CalendarDayDetail>(
          `/parcels/parcels/calendar/?year=${viewYear}&month=${viewMonth + 1}&day=${selectedDay}`
        )
        if (!cancelled) setDayDetail(data)
      } catch (err) {
        console.error('Failed to fetch calendar day detail', err)
      } finally {
        if (!cancelled) setDayLoading(false)
      }
    }
    fetchDay()
    return () => {
      cancelled = true
    }
  }, [viewYear, viewMonth, selectedDay])

  const goPrevMonth = () => {
    setSelectedDay(null)
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    setSelectedDay(null)
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const goToday = () => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setSelectedDay(now.getDate())
  }

  // Build a lookup of date -> counts
  const dayMap = useMemo(() => {
    const map = new Map<string, { scheduled: number; delivered: number }>()
    monthData?.days.forEach((d) => {
      map.set(d.date, { scheduled: d.scheduled, delivered: d.delivered })
    })
    return map
  }, [monthData])

  // Build the calendar grid (6 weeks x 7 days)
  const grid = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const startWeekday = firstOfMonth.getDay() // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const cells: Array<{ day: number | null; iso: string | null }> = []
    // Leading blanks
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: null, iso: null })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, iso: isoDate(viewYear, viewMonth, d) })
    }
    // Trailing blanks to fill out the last week
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, iso: null })
    }
    return cells
  }, [viewYear, viewMonth])

  const isToday = (day: number | null) =>
    day != null &&
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day

  const totals = useMemo(() => {
    const scheduled = monthData?.days.reduce((sum, d) => sum + d.scheduled, 0) ?? 0
    const delivered = monthData?.days.reduce((sum, d) => sum + d.delivered, 0) ?? 0
    return { scheduled, delivered }
  }, [monthData])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Calendar"
        description="A month view of parcels scheduled for delivery and parcels actually delivered each day. Click a day to see the parcel lists."
        actions={
          <button onClick={goToday} className={buttonSecondary}>
            <CalendarDays className="h-4 w-4" />
            Today
          </button>
        }
      />

      {/* Month navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevMonth}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 shadow-sm transition hover:border-yellow-500/40 hover:bg-yellow-400/10 hover:text-yellow-300"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goNextMonth}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 shadow-sm transition hover:border-yellow-500/40 hover:bg-yellow-400/10 hover:text-yellow-300"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <h2 className="ml-2 text-xl font-bold tracking-tight text-zinc-50">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-200">
            <Clock className="h-4 w-4" />
            Scheduled: {monthLoading ? '…' : totals.scheduled}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Delivered: {monthLoading ? '…' : totals.delivered}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Calendar grid */}
        <div className={`${cardClass} xl:col-span-2`}>
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="px-2 py-3">
                {w}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {grid.map((cell, idx) => {
              if (cell.day == null) {
                return <div key={idx} className="min-h-[112px] border-b border-r border-zinc-800 bg-zinc-950/40" />
              }
              const counts = dayMap.get(cell.iso!) ?? { scheduled: 0, delivered: 0 }
              const hasActivity = counts.scheduled > 0 || counts.delivered > 0
              const selected = selectedDay === cell.day
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(cell.day)}
                  className={`min-h-[112px] border-b border-r border-zinc-800 p-2 text-left align-top transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-500 ${
                    selected
                      ? 'bg-yellow-400/10 ring-2 ring-inset ring-yellow-500'
                      : 'hover:bg-yellow-400/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday(cell.day)
                          ? 'bg-yellow-500 text-white'
                          : 'text-zinc-300'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {isToday(cell.day) && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-yellow-400">Today</span>
                    )}
                  </div>

                  {hasActivity && (
                    <div className="mt-2 space-y-1">
                      {counts.scheduled > 0 && (
                        <div className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200">
                          <Clock className="h-3 w-3" />
                          {counts.scheduled}
                        </div>
                      )}
                      {counts.delivered > 0 && (
                        <div className="ml-1 inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {counts.delivered}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-zinc-800 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-50">
                {selectedDay != null
                  ? new Date(viewYear, viewMonth, selectedDay).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Select a day'}
              </h3>
              {selectedDay != null && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-400"
                  aria-label="Clear selected day"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Scheduled = expected by priority (Express: same day, Standard: next day). Delivered = successful attempts on this date.
            </p>
          </div>

          {selectedDay == null ? (
            <EmptyState
              icon={CalendarDays}
              title="No day selected"
              description="Click any day in the calendar to view the parcels scheduled and delivered on that date."
            />
          ) : dayLoading ? (
            <div className="space-y-4 p-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : dayDetail ? (
            <div className="divide-y divide-zinc-800">
              <DaySection
                title="Scheduled / Expected"
                icon={<Clock className="h-4 w-4 text-amber-300" />}
                parcels={dayDetail.scheduled}
                emptyMessage="No parcels scheduled for this day."
              />
              <DaySection
                title="Delivered"
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                parcels={dayDetail.delivered}
                emptyMessage="No parcels delivered on this day."
              />
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="No data"
              description="Could not load parcels for this day."
            />
          )}
        </div>
      </div>
    </div>
  )
}

function DaySection({
  title,
  icon,
  parcels,
  emptyMessage,
}: {
  title: string
  icon: React.ReactNode
  parcels: ParcelList[]
  emptyMessage: string
}) {
  return (
    <div className="p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-300">{title}</h4>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
          {parcels.length}
        </span>
      </div>

      {parcels.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-3 py-2">Tracking ID</th>
                <th className="px-3 py-2">Receiver</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {parcels.map((parcel) => (
                <tr key={parcel.tracking_id} className={tableRowClass}>
                  <td className="px-3 py-3">
                    <Link
                      to={`/parcels/${parcel.tracking_id}`}
                      className="font-mono text-sm font-medium text-yellow-400 hover:text-yellow-300 hover:underline"
                    >
                      {parcel.tracking_id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-zinc-200">{parcel.receiver_name}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        parcel.priority === 'express' ? 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {parcel.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[parcel.status] || 'bg-gray-100 text-zinc-300'}`}>
                      {parcel.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}