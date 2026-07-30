import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { ParcelList, PaginatedResponse } from '../types'
import { useAuthStore } from '../store/auth'
import { Plus, Search, Package } from 'lucide-react'

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parcels</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            New Parcel
          </button>
        )}
      </div>

      {showForm && canCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
          <h3 className="font-semibold">Register New Parcel</h3>
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sender Name</label>
              <input name="sender_name" required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sender Address</label>
              <input name="sender_address" required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Receiver Name</label>
              <input name="receiver_name" required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Receiver Address</label>
              <input name="receiver_address" required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Receiver Phone</label>
              <input name="receiver_phone" required pattern="[0-9]+" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pincode</label>
              <input name="pincode" required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weight (kg)</label>
              <input name="weight" type="number" step="0.01" min="0" required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select name="priority" className="w-full px-3 py-2 border rounded-lg">
                <option value="standard">Standard</option>
                <option value="express">Express</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
              Create Parcel
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">
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
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receiver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    No parcels found
                  </td>
                </tr>
              ) : (
                filtered.map((parcel) => (
                  <tr key={parcel.tracking_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {parcel.tracking_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm">{parcel.sender_name}</td>
                    <td className="px-6 py-4 text-sm">{parcel.receiver_name}</td>
                    <td className="px-6 py-4 text-sm">{parcel.zone_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        parcel.priority === 'express' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
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