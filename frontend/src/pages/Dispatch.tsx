import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { Assignment, PaginatedResponse, AssignmentResult } from '../types'
import { Send, AlertCircle, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Dispatch Center</h1>
          <div className="flex items-center gap-1 text-sm">
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
        </div>
        <button
          onClick={runAssignment}
          disabled={running}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {running ? 'Running...' : 'Run Assignment'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold">Current Assignments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parcel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No assignments yet. Run the assignment engine to assign parcels to riders.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono">{a.parcel_tracking_id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 text-sm">{a.rider_name}</td>
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
                    <td className="px-6 py-4 text-sm text-gray-500">
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