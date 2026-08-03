import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import type { Rider } from '../types'
import { 
  User, Mail, Shield, Phone, Calendar, Bike, Package, 
  TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle 
} from 'lucide-react'
import { PageHeader, Skeleton, cardClass, tableHeadClass, tableRowClass } from '../components/ui'

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-gray-100 text-zinc-300',
  sorted: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30',
  assigned: 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30',
  in_transit: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30',
  failed: 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30',
  reattempt_scheduled: 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/30',
}

export default function Profile() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [rider, setRider] = useState<Rider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role === 'rider') {
      fetchRiderProfile()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchRiderProfile = async () => {
    try {
      const { data } = await api.get<Rider>('/riders/me/')
      setRider(data)
    } catch (err) {
      console.error('Failed to fetch rider profile', err)
      setError('Unable to load rider profile.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile Error" description={error} />
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300">
          ← Back
        </button>
      </div>
    )
  }

  const isRider = user?.role === 'rider'
  const perf = rider?.performance
  const capacityPct = rider && rider.capacity > 0 
    ? Math.round((rider.current_load / rider.capacity) * 100) 
    : 0
  const overCapacity = rider && rider.current_load > rider.capacity
  const highFailureRate = perf && perf.failure_rate > 30

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Profile" 
        description={`${user?.first_name} ${user?.last_name}`}
      />

      {/* Account Information */}
      <div className={`${cardClass} p-6 space-y-5`}>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
          <User className="w-5 h-5 text-yellow-400" /> Account Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Username</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-200">
              {user?.username}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-200">
              <Mail className="w-3.5 h-3.5 text-zinc-500" /> {user?.email}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-200">
              <Shield className="w-3.5 h-3.5 text-zinc-500" /> {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Phone</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-200">
              <Phone className="w-3.5 h-3.5 text-zinc-500" /> {user?.phone_number || 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Member Since</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-200">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" /> {user?.date_joined 
                ? new Date(user.date_joined).toLocaleDateString() 
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</p>
            <p className="mt-1 text-sm font-medium text-zinc-200">
              {user?.is_active ? (
                <span className="text-emerald-400">Active</span>
              ) : (
                <span className="text-red-400">Inactive</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Rider-specific content */}
      {isRider && rider && (
        <>
          {/* Flags */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {overCapacity && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold">Over Capacity</p>
                  <p className="text-red-200">Current load ({rider.current_load}) exceeds capacity ({rider.capacity}). Needs review.</p>
                </div>
              </div>
            )}
            {highFailureRate && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold">High Failure Rate</p>
                  <p className="text-amber-200">Failure rate ({perf?.failure_rate}%) is notably higher than average. Worth reviewing delivery patterns.</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Rider Information */}
            <div className={`${cardClass} p-6 space-y-5`}>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
                <Bike className="w-5 h-5 text-yellow-400" /> My Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Zone</p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-200">
                    {rider.zone_name || 'No Zone'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Vehicle</p>
                  <p className="mt-1 text-sm font-medium capitalize text-zinc-200">{rider.vehicle_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Capacity</p>
                  <p className="mt-1 text-sm font-medium text-zinc-200">{rider.current_load}/{rider.capacity}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Remaining</p>
                  <p className="mt-1 text-sm font-medium text-zinc-200">{rider.remaining_capacity}</p>
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-zinc-400">Load</span>
                  <span className={`font-medium ${capacityPct >= 90 ? 'text-red-300' : capacityPct >= 70 ? 'text-amber-300' : 'text-zinc-200'}`}>
                    {capacityPct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      capacityPct >= 90 ? 'bg-red-500/100' : capacityPct >= 70 ? 'bg-amber-500/100' : 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                    }`}
                    style={{ width: `${Math.min(capacityPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className={`${cardClass} p-6`}>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-50">
                <TrendingUp className="w-5 h-5 text-yellow-400" /> My Performance
              </h3>
              {perf ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-zinc-950 p-4">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <CheckCircle className="w-3.5 h-3.5" /> Total Deliveries
                    </p>
                    <p className="mt-1 text-2xl font-bold text-zinc-50">{perf.total_deliveries}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-950 p-4">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <TrendingUp className="w-3.5 h-3.5" /> Success Rate
                    </p>
                    <p className="mt-1 text-2xl font-bold text-zinc-50">{perf.success_rate}%</p>
                  </div>
                  <div className="rounded-xl bg-zinc-950 p-4">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <XCircle className="w-3.5 h-3.5" /> Failed
                    </p>
                    <p className="mt-1 text-2xl font-bold text-zinc-50">{perf.failed}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-950 p-4">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <Clock className="w-3.5 h-3.5" /> Avg Delivery
                    </p>
                    <p className="mt-1 text-2xl font-bold text-zinc-50">{perf.avg_delivery_minutes}m</p>
                  </div>
                  <div className="rounded-xl bg-zinc-950 p-4">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <Package className="w-3.5 h-3.5" /> Today
                    </p>
                    <p className="mt-1 text-2xl font-bold text-zinc-50">{perf.delivered_today}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-950 p-4">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <Package className="w-3.5 h-3.5" /> This Week
                    </p>
                    <p className="mt-1 text-2xl font-bold text-zinc-50">{perf.delivered_this_week}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400">No delivery performance data available yet.</p>
              )}
            </div>
          </div>

          {/* Assigned Parcels */}
          {rider.assigned_parcels && rider.assigned_parcels.length > 0 && (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-zinc-800 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
                  <Package className="w-5 h-5 text-yellow-400" />
                  Currently Assigned Parcels ({rider.assigned_parcels.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
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
                  <tbody className="divide-y divide-zinc-800">
                    {rider.assigned_parcels.map((parcel) => (
                      <tr key={parcel.tracking_id} className={tableRowClass}>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-yellow-400">
                            {parcel.tracking_id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-200">{parcel.receiver_name}</td>
                        <td className="px-6 py-4 text-sm text-zinc-400">{parcel.zone_name || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            parcel.priority === 'express' ? 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {parcel.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[parcel.status] || 'bg-gray-100 text-zinc-300'}`}>
                            {parcel.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}