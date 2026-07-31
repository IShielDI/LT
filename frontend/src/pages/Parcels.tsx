import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { ParcelList, PaginatedResponse } from '../types'
import { useAuthStore } from '../store/auth'
import { Plus, Search, Package } from 'lucide-react'
import { EmptyState, PageHeader, TableSkeleton, buttonPrimary, buttonSecondary, cardClass, inputClass, tableHeadClass, tableRowClass } from '../components/ui'

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
  const [parcels, setParcels] = useState<ParcelList[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const canCreate = user?.role === 'admin' || user?.role === 'hub_manager'

  useEffect(() => {
    fetchData()
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

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData)
    try {
      await api.post('/parcels/parcels/', data)
      setShowForm(false)
      fetchData()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { detail?: unknown } } } }
      const detail = error.response?.data?.error?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to create parcel')
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
        description="Register, search, and monitor every parcel moving through your delivery network."
        actions={canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className={buttonPrimary}
          >
            <Plus className="w-4 h-4" />
            New Parcel
          </button>
        )}
      />

      {showForm && canCreate && (
        <form onSubmit={handleCreate} className={`${cardClass} space-y-5 p-6`}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Register New Parcel</h3>
            <p className="mt-1 text-sm text-slate-500">Capture sender, receiver, pincode, weight and priority details.</p>
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Sender Name</label>
              <input name="sender_name" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Sender Address</label>
              <input name="sender_address" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Receiver Name</label>
              <input name="receiver_name" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Receiver Address</label>
              <input name="receiver_address" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Receiver Phone</label>
              <input name="receiver_phone" required pattern="[0-9]+" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Pincode</label>
              <input name="pincode" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Weight (kg)</label>
              <input name="weight" type="number" step="0.01" min="0" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Priority</label>
              <select name="priority" className={inputClass}>
                <option value="standard">Standard</option>
                <option value="express">Express</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={buttonPrimary}>
              Create Parcel
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={buttonSecondary}>
              Cancel
            </button>
          </div>
        </form>
      )}

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
                      description={search ? 'Try another tracking ID, sender, or receiver name.' : 'Register your first parcel and it will appear in this operations table.'}
                      action={!search && canCreate ? <button onClick={() => setShowForm(true)} className={buttonPrimary}><Plus className="h-4 w-4" /> Register first parcel</button> : undefined}
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