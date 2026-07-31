import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import type { ParcelList, PaginatedResponse, PresetLocation } from '../types'
import { useAuthStore } from '../store/auth'
import { Search, Package, Scan } from 'lucide-react'
import { EmptyState, PageHeader, TableSkeleton, buttonPrimary, cardClass, inputClass, tableHeadClass, tableRowClass } from '../components/ui'

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-gray-100 text-gray-700',
  sorted: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  in_transit: 'bg-amber-100 text-amber-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  reattempt_scheduled: 'bg-purple-100 text-purple-700',
}

export default function Parcels() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [parcels, setParcels] = useState<ParcelList[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const canCreate = user?.role === 'admin' || user?.role === 'hub_manager'

  useEffect(() => {
    fetchData()
    fetchLocations()
  }, [])

  const fetchData = async () => {
    try {
      const { data } = await api.get<PaginatedResponse<ParcelList>>('/parcels/parcels/?page_size=100')
      setParcels(data.results)
    } catch (err) {
      console.error('Failed to fetch', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      await api.get<PresetLocation[]>('/parcels/zones/preset_locations/')
    } catch (err) {
      console.error('Failed to fetch preset locations', err)
    }
  }

  const filtered = parcels.filter(
    (p) =>
      p.tracking_id.toLowerCase().includes(search.toLowerCase()) ||
      p.receiver_name.toLowerCase().includes(search.toLowerCase()) ||
      p.sender_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <TableSkeleton columns={6} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcels"
        description="View and search parcels. Parcels are created via QR/barcode scan on the Dispatch page."
        actions={canCreate && (
          <button
            onClick={() => navigate('/dispatch')}
            className={buttonPrimary}
          >
            <Scan className="w-4 h-4" />
            Scan Parcel
          </button>
        )}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by tracking ID, sender, or receiver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} pl-10`}
        />
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Tracking ID</th>
                <th className="px-6 py-3">Sender</th>
                <th className="px-6 py-3">Receiver</th>
                <th className="px-6 py-3">Zone</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Package}
                      title={search ? 'No parcels match your search' : 'No parcels yet'}
                      description={search ? 'Try another tracking ID, sender, or receiver name.' : 'Parcels appear here after being scanned on the Dispatch page.'}
                      action={!search && canCreate ? <button onClick={() => navigate('/dispatch')} className={buttonPrimary}><Scan className="h-4 w-4" /> Go to Scan</button> : undefined}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((parcel) => (
                  <tr key={parcel.tracking_id} className={tableRowClass}>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600">
                      {parcel.tracking_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{parcel.sender_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{parcel.receiver_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{parcel.zone_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        parcel.priority === 'express' ? 'bg-accent-100 text-accent-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {parcel.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[parcel.status] || 'bg-gray-100'}`}>
                        {parcel.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}