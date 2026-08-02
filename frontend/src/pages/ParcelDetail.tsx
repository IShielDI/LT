import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import type { Parcel } from '../types'
import { ArrowLeft, Package, MapPin, User, Phone, Weight, AlertTriangle, QrCode, Bike } from 'lucide-react'
import { PageHeader, Skeleton, cardClass } from '../components/ui'

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-gray-100 text-zinc-300',
  sorted: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30',
  assigned: 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30',
  in_transit: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30',
  failed: 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30',
  reattempt_scheduled: 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/30',
}

export default function ParcelDetail() {
  const { trackingId } = useParams<{ trackingId: string }>()
  const navigate = useNavigate()
  const [parcel, setParcel] = useState<Parcel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchParcel()
  }, [trackingId])

  const fetchParcel = async () => {
    try {
      const { data } = await api.get<Parcel>(`/parcels/parcels/${trackingId}/`)
      setParcel(data)
    } catch (err) {
      console.error('Failed to fetch parcel', err)
      setError('Parcel not found.')
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

  if (error || !parcel) {
    return (
      <div className="space-y-6">
        <PageHeader title="Parcel Not Found" description={error} />
        <button onClick={() => navigate('/parcels')} className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300">
          <ArrowLeft className="w-4 h-4" /> Back to Parcels
        </button>
      </div>
    )
  }

  const history = [...(parcel.status_history || [])].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  )

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <PageHeader
        title={`Parcel ${parcel.tracking_id.slice(0, 8)}...`}
        description={`Full lifecycle view for tracking ID ${parcel.tracking_id}`}
        actions={
          <span className={`px-3 py-1.5 text-sm rounded-full ${STATUS_COLORS[parcel.status] || 'bg-gray-100 text-zinc-300'}`}>
            {parcel.status.replace(/_/g, ' ')}
          </span>
        }
      />

      {parcel.is_unassigned && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Unassigned — Needs Attention</p>
            <p className="text-amber-200">No eligible rider was available when this parcel was created. It remains in 'registered' status until a rider becomes available.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Parcel Info */}
        <div className={`${cardClass} p-6 space-y-5`}>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
            <Package className="w-5 h-5 text-yellow-400" /> Parcel Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tracking ID</p>
              <p className="mt-1 font-mono text-sm font-medium text-zinc-200">{parcel.tracking_id}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Priority</p>
              <p className="mt-1 text-sm font-medium capitalize text-zinc-200">{parcel.priority}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Weight</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-200">
                <Weight className="w-3.5 h-3.5 text-zinc-500" /> {parcel.weight} kg
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Zone</p>
              <p className="mt-1 text-sm font-medium text-zinc-200">{parcel.zone_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pincode</p>
              <p className="mt-1 text-sm font-medium text-zinc-200">{parcel.pincode}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Created</p>
              <p className="mt-1 text-sm font-medium text-zinc-200">
                {new Date(parcel.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <User className="w-3.5 h-3.5" /> Sender
            </p>
            <p className="text-sm font-semibold text-zinc-200">{parcel.sender_name}</p>
            <p className="mt-1 text-sm text-zinc-400">{parcel.sender_address}</p>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <MapPin className="w-3.5 h-3.5" /> Receiver
            </p>
            <p className="text-sm font-semibold text-zinc-200">{parcel.receiver_name}</p>
            <p className="mt-1 text-sm text-zinc-400">{parcel.receiver_address}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-zinc-400">
              <Phone className="w-3.5 h-3.5" /> {parcel.receiver_phone}
            </p>
          </div>
        </div>

        {/* Assigned Rider + QR */}
        <div className="space-y-6">
          <div className={`${cardClass} p-6`}>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-50">
              <Bike className="w-5 h-5 text-yellow-400" /> Assigned Rider
            </h3>
            {parcel.current_assignment ? (
              <Link
                to={`/riders/${parcel.current_assignment.rider_id}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 p-4 transition-all hover:border-yellow-500/50 hover:bg-yellow-400/10"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-600 to-yellow-400">
                  <Bike className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-50">{parcel.current_assignment.rider_name}</p>
                  <p className="text-sm text-zinc-400">
                    Assigned {new Date(parcel.current_assignment.assigned_at).toLocaleString()}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-zinc-400">No rider assigned to this parcel yet.</p>
            )}
          </div>

          <div className={`${cardClass} p-6`}>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-50">
              <QrCode className="w-5 h-5 text-yellow-400" /> QR Code
            </h3>
            {parcel.qr_code ? (
              <img
                src={parcel.qr_code}
                alt={`QR code for parcel ${parcel.tracking_id}`}
                className="mx-auto h-48 w-48 rounded-xl border border-zinc-800"
              />
            ) : (
              <p className="text-sm text-zinc-400">No QR code generated for this parcel.</p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className={`${cardClass} p-6`}>
        <h3 className="mb-6 text-lg font-semibold text-zinc-50">Lifecycle Timeline</h3>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-400">No status history recorded for this parcel yet.</p>
        ) : (
          <div className="relative space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-700">
            {history.map((entry, index) => {
              const isLast = index === history.length - 1
              return (
                <div key={entry.id} className="relative flex gap-4 pl-8">
                  <span
                    className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white shadow ${
                      isLast ? 'bg-yellow-500' : 'bg-zinc-600'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[entry.status] || 'bg-gray-100 text-zinc-300'}`}>
                        {entry.status_display}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(entry.changed_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="mt-1 text-sm text-zinc-400">{entry.notes}</p>
                    )}
                    {entry.rider_id && entry.rider_name && (
                      <Link
                        to={`/riders/${entry.rider_id}`}
                        className="mt-1 inline-block text-xs font-semibold text-yellow-400 hover:text-yellow-300"
                      >
                        Rider: {entry.rider_name}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}