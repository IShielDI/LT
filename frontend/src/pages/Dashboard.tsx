import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import type { ParcelList, PaginatedResponse } from '../types'
import { Package, CheckCircle, XCircle, Clock, TrendingUp, ArrowUpRight, Activity, AlertTriangle } from 'lucide-react'
import { CardSkeleton, EmptyState, PageHeader, Skeleton, TableSkeleton, cardClass, tableHeadClass, tableRowClass } from '../components/ui'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  registered: '#64748b',
  sorted: '#0ea5e9',
  assigned: '#0369a1',
  in_transit: '#f59e0b',
  delivered: '#22c55e',
  failed: '#ef4444',
  reattempt_scheduled: '#a855f7',
}

export default function Dashboard() {
  const [parcels, setParcels] = useState<ParcelList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get<PaginatedResponse<ParcelList>>('/parcels/parcels/?page_size=100')
        setParcels(data.results)
      } catch (err) {
        console.error('Failed to fetch dashboard data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const delivered = parcels.filter((p) => p.status === 'delivered').length
  const failed = parcels.filter((p) => p.status === 'failed').length
  const inTransit = parcels.filter((p) => p.status === 'in_transit').length
  const total = parcels.length
  const unassigned = parcels.filter((p) => p.status === 'registered' || p.status === 'sorted')

  const statusData = Object.entries(
    parcels.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const zoneData = Object.entries(
    parcels.reduce((acc, p) => {
      const zone = p.zone_name || 'Unzoned'
      acc[zone] = (acc[zone] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([zone, count]) => ({ zone, count }))

  const stats = [
    { label: 'Total Parcels', value: total, icon: Package, color: 'from-primary-700 to-primary-500', trend: '+12.4%', to: '/parcels' },
    { label: 'Delivered', value: delivered, icon: CheckCircle, color: 'from-emerald-600 to-teal-500', trend: '+8.2%', to: '/parcels?status=delivered' },
    { label: 'Failed', value: failed, icon: XCircle, color: 'from-red-600 to-rose-500', trend: failed === 0 ? '0 issues' : 'Needs review', to: '/parcels?status=failed' },
    { label: 'In Transit', value: inTransit, icon: Clock, color: 'from-amber-600 to-orange-500', trend: 'Live', to: '/parcels?status=in_transit' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <CardSkeleton />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <TableSkeleton columns={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A real-time snapshot of parcel movement, delivery outcomes, and zone workload across the hub."
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="block cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70 transition-all hover:-translate-y-1 hover:border-primary-400 hover:shadow-xl hover:shadow-slate-200/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{stat.value}</p>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {stat.trend}
                </div>
              </div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                <stat.icon className="h-7 w-7 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Unassigned parcels needing attention */}
      {unassigned.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-900">
              Unassigned Parcels ({unassigned.length})
            </h3>
          </div>
          <p className="mb-4 text-sm text-amber-700">
            These parcels could not be auto-assigned because no eligible rider was available in their zone. They need attention.
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.slice(0, 8).map((parcel) => (
              <Link
                key={parcel.tracking_id}
                to={`/parcels/${parcel.tracking_id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 shadow-sm transition-all hover:border-amber-400 hover:bg-amber-100"
              >
                <span className="font-mono text-xs">{parcel.tracking_id.slice(0, 8)}...</span>
                <span className="text-amber-600">→</span>
                <span>{parcel.receiver_name}</span>
              </Link>
            ))}
            {unassigned.length > 8 && (
              <Link
                to="/parcels"
                className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm transition-all hover:bg-amber-100"
              >
                View all {unassigned.length} unassigned →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${cardClass} p-6`}>
          <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-950"><Activity className="h-5 w-5 text-primary-700" /> Parcels by Status</h3>
          <p className="mb-4 text-sm text-slate-500">Distribution across current fulfillment stages.</p>
          {statusData.length === 0 ? (
            <EmptyState icon={Package} title="No parcel status yet" description="Register parcels to see live status distribution here." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={(entry) => `${entry.name}: ${entry.value}`}>
                  {statusData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#64748b'} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`${cardClass} p-6`}>
          <h3 className="mb-1 text-lg font-semibold text-slate-950">Zone-wise Parcel Count</h3>
          <p className="mb-4 text-sm text-slate-500">Workload breakdown by operating zone.</p>
          {zoneData.length === 0 ? (
            <EmptyState icon={Package} title="No zone activity yet" description="Zone workloads will appear once parcels are registered and assigned." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={zoneData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="zone" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#075985" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent parcels */}
      <div className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-slate-200 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <TrendingUp className="h-5 w-5 text-primary-700" />
            Recent Parcels
          </h3>
        </div>
        {parcels.length === 0 ? (
          <EmptyState icon={Package} title="No parcels yet" description="Register your first parcel to begin tracking hub operations and performance metrics." />
        ) : <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Tracking ID</th>
                <th className="px-6 py-3">Receiver</th>
                <th className="px-6 py-3">Zone</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parcels.slice(0, 10).map((parcel) => (
                <tr key={parcel.tracking_id} className={tableRowClass}>
                  <td className="px-6 py-4">
                    <Link
                      to={`/parcels/${parcel.tracking_id}`}
                      className="font-mono text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline"
                    >
                      {parcel.tracking_id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{parcel.receiver_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{parcel.zone_name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      parcel.priority === 'express'
                        ? 'bg-accent-100 text-accent-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {parcel.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-1 text-xs rounded-full text-white"
                      style={{ backgroundColor: STATUS_COLORS[parcel.status] || '#94a3b8' }}
                    >
                      {parcel.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  )
}