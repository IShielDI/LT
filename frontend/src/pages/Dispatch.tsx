import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { Assignment, PaginatedResponse, AssignmentResult } from '../types'
import { Send, AlertCircle, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { EmptyState, PageHeader, TableSkeleton, buttonPrimary, cardClass, tableHeadClass, tableRowClass } from '../components/ui'

export default function Dispatch() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AssignmentResult | null>(null)
  const [error, setError] = useState('')
  const [wsConnected, setWsConnected] = useState(false)

  const { isConnected } = useWebSocket('ws://localhost:8000/ws/dispatch/')

  useEffect(() => {
    setWsConnected(isConnected)
  }, [isConnected])

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get<PaginatedResponse<Assignment>>(
        '/dispatch/assignments/?page_size=100'
      )
      setAssignments(data.results)
    } catch (err) {
      console.error('Failed to fetch', err)
    } finally {
      setLoading(false)
    }
  }

  const runAssignment = async () => {
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.post<AssignmentResult>(
        '/dispatch/assignments/run_assignment/'
      )
      setResult(data)
      fetchAssignments()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { detail?: unknown } } } }
      const detail = error.response?.data?.error?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to run assignment')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return <TableSkeleton columns={4} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch Center"
        description="Run assignment planning and monitor rider-to-parcel allocation in real time."
        actions={
          <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            {wsConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Offline</span>
              </>
            )}
          </div>
        <button
          onClick={runAssignment}
          disabled={running}
          className={buttonPrimary}
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {running ? 'Running...' : 'Run Assignment'}
        </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Assigned ({result.assigned.length})</h3>
            </div>
            <div className="space-y-1 text-sm">
              {result.assigned.map((a) => (
                <div key={a.parcel_id} className="text-green-700">
                  {a.parcel_id.slice(0, 8)}... → {a.rider_name} ({a.zone})
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Unassigned ({result.unassigned.length})</h3>
            </div>
            <div className="space-y-1 text-sm">
              {result.unassigned.map((u) => (
                <div key={u.parcel_id} className="text-red-700">
                  {u.parcel_id.slice(0, 8)}... — {u.reason}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-slate-200 p-6">
          <h3 className="font-semibold text-slate-950">Current Assignments</h3>
          <p className="mt-1 text-sm text-slate-500">Assigned parcels and their current delivery workflow state.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Parcel</th>
                <th className="px-6 py-3">Rider</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Assigned At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState icon={Send} title="No assignments yet" description="Run the assignment engine to match available riders with parcels by zone and capacity." action={<button onClick={runAssignment} disabled={running} className={buttonPrimary}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Run assignment</button>} />
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className={tableRowClass}>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600">{a.parcel_tracking_id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{a.rider_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        a.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        a.status === 'in_transit' ? 'bg-amber-100 text-amber-700' :
                        a.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {a.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(a.assigned_at).toLocaleDateString()}
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