import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { DeliveryAttempt, PaginatedResponse } from '../types'
import { Truck, AlertCircle } from 'lucide-react'

export default function Delivery() {
  const [attempts, setAttempts] = useState<DeliveryAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchAttempts()
  }, [])

  const fetchAttempts = async () => {
    try {
      const { data } = await api.get<PaginatedResponse<DeliveryAttempt>>(
        '/delivery/attempts/?page_size=100'
      )
      setAttempts(data.results)
    } catch (err) {
      console.error('Failed to fetch', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData)
    try {
      await api.post('/delivery/attempts/record_attempt/', data)
      setSuccess('Delivery attempt recorded successfully')
      setShowForm(false)
      fetchAttempts()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { detail?: unknown } } } }
      const detail = error.response?.data?.error?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to record attempt')
    }
  }

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
        <h1 className="text-2xl font-bold">Delivery Updates</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Truck className="w-4 h-4" />
          Record Attempt
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-4 rounded-lg">{success}</div>
      )}

      {showForm && (
        <form onSubmit={handleRecord} className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
          <h3 className="font-semibold">Record Delivery Attempt</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Parcel Tracking ID</label>
              <input name="parcel" required className="w-full px-3 py-2 border rounded-lg" placeholder="UUID" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" className="w-full px-3 py-2 border rounded-lg">
                <option value="success">Delivered Successfully</option>
                <option value="failed">Failed</option>
                <option value="reattempt_scheduled">Reattempt Scheduled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Failure Reason</label>
              <select name="failure_reason" className="w-full px-3 py-2 border rounded-lg">
                <option value="">—</option>
                <option value="customer_unavailable">Customer Unavailable</option>
                <option value="wrong_address">Wrong Address</option>
                <option value="damaged">Damaged Parcel</option>
                <option value="reattempt_required">Reattempt Required</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <input name="notes" className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
            Submit
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parcel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempt #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failure Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No delivery attempts recorded yet.
                  </td>
                </tr>
              ) : (
                attempts.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono">{a.parcel_tracking_id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 text-sm">{a.attempt_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        a.status === 'success' ? 'bg-green-100 text-green-700' :
                        a.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {a.status_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{a.failure_reason_display || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(a.attempted_at).toLocaleDateString()}
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