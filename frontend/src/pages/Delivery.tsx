import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import type { DeliveryAttempt, PaginatedResponse } from '../types'
import { Truck, AlertCircle } from 'lucide-react'
import { EmptyState, PageHeader, TableSkeleton, buttonPrimary, cardClass, inputClass, tableHeadClass, tableRowClass } from '../components/ui'

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
    return <TableSkeleton columns={5} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Updates"
        description="Record delivery attempts, failures, reattempt schedules and successful handoffs."
        actions={
        <button
          onClick={() => setShowForm(!showForm)}
          className={buttonPrimary}
        >
          <Truck className="w-4 h-4" />
          Record Attempt
        </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>
      )}

      {showForm && (
        <form onSubmit={handleRecord} className={`${cardClass} space-y-5 p-6`}>
          <div>
            <h3 className="text-lg font-semibold text-zinc-50">Record Delivery Attempt</h3>
            <p className="mt-1 text-sm text-zinc-400">Update parcel delivery status and capture operational notes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Parcel Tracking ID</label>
              <input name="parcel" required className={inputClass} placeholder="UUID" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Status</label>
              <select name="status" className={inputClass}>
                <option value="success">Delivered Successfully</option>
                <option value="failed">Failed</option>
                <option value="reattempt_scheduled">Reattempt Scheduled</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Failure Reason</label>
              <select name="failure_reason" className={inputClass}>
                <option value="">—</option>
                <option value="customer_unavailable">Customer Unavailable</option>
                <option value="wrong_address">Wrong Address</option>
                <option value="damaged">Damaged Parcel</option>
                <option value="reattempt_required">Reattempt Required</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Notes</label>
              <input name="notes" className={inputClass} />
            </div>
          </div>
          <button type="submit" className={buttonPrimary}>
            Submit
          </button>
        </form>
      )}

      <div className={`${cardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Parcel</th>
                <th className="px-6 py-3">Attempt #</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Failure Reason</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={Truck} title="No delivery attempts yet" description="Record the first delivery attempt once a rider reaches the customer location." action={<button onClick={() => setShowForm(true)} className={buttonPrimary}><Truck className="h-4 w-4" /> Record attempt</button>} />
                  </td>
                </tr>
              ) : (
                attempts.map((a) => (
                  <tr key={a.id} className={tableRowClass}>
                    <td className="px-6 py-4">
                      <Link
                        to={`/parcels/${a.parcel_tracking_id}`}
                        className="font-mono text-sm font-medium text-yellow-400 hover:text-yellow-300 hover:underline"
                      >
                        {a.parcel_tracking_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-200">{a.attempt_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        a.status === 'success' ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30' :
                        a.status === 'failed' ? 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30' :
                        'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/30'
                      }`}>
                        {a.status_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">{a.failure_reason_display || '—'}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
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