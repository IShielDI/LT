import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import type { Assignment, PaginatedResponse, AssignmentResult, Parcel, Rider } from '../types'
import { Send, AlertCircle, CheckCircle, Loader2, Wifi, WifiOff, UserPlus, X } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { EmptyState, PageHeader, TableSkeleton, buttonPrimary, buttonSecondary, cardClass, inputClass, tableHeadClass, tableRowClass } from '../components/ui'

export default function Dispatch() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AssignmentResult | null>(null)
  const [error, setError] = useState('')
  const [wsConnected, setWsConnected] = useState(false)

  // Manual assignment state
  const [showManualForm, setShowManualForm] = useState(false)
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [selectedParcelId, setSelectedParcelId] = useState('')
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [manualError, setManualError] = useState('')
  const [manualAssigning, setManualAssigning] = useState(false)

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

  const fetchManualAssignData = async () => {
    try {
      const [parcelsRes, ridersRes] = await Promise.all([
        api.get<PaginatedResponse<Parcel>>('/parcels/parcels/?page_size=100'),
        api.get<PaginatedResponse<Rider>>('/riders/?page_size=100'),
      ])
      // Only show parcels that are in 'registered' or 'sorted' state (assignable)
      setParcels(parcelsRes.data.results.filter((p) => p.status === 'registered' || p.status === 'sorted'))
      setRiders(ridersRes.data.results)
    } catch (err) {
      console.error('Failed to fetch manual assign data', err)
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

  const handleManualAssign = async () => {
    if (!selectedParcelId || !selectedRiderId) {
      setManualError('Please select both a parcel and a rider.')
      return
    }
    setManualAssigning(true)
    setManualError('')
    try {
      await api.post('/dispatch/assignments/manual_assign/', {
        parcel: selectedParcelId,
        rider: Number(selectedRiderId),
      })
      setShowManualForm(false)
      setSelectedParcelId('')
      setSelectedRiderId('')
      fetchAssignments()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setManualError(error.response?.data?.error || 'Failed to assign parcel')
    } finally {
      setManualAssigning(false)
    }
  }

  const openManualForm = () => {
    setShowManualForm(true)
    setSelectedParcelId('')
    setSelectedRiderId('')
    setManualError('')
    fetchManualAssignData()
  }

  // Get the selected parcel to filter riders by zone
  const selectedParcel = parcels.find((p) => p.tracking_id === selectedParcelId)

  // Filter riders: same zone as the selected parcel, available, and with remaining capacity
  const eligibleRiders = riders.filter((r) => {
    if (!r.is_available || r.remaining_capacity <= 0) return false
    if (!selectedParcel) return true // show all if no parcel selected yet
    if (!selectedParcel.zone || !r.zone) return true // show if either has no zone
    return r.zone === selectedParcel.zone
  })

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

      {/* Manual Assignment Section */}
      <div className={`${cardClass} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-950">Manual Assignment</h3>
            <p className="mt-1 text-sm text-slate-500">Assign a specific parcel to a specific rider. Riders are filtered to match the parcel's zone and show only those with remaining capacity.</p>
          </div>
          <button onClick={openManualForm} className={buttonSecondary}>
            <UserPlus className="w-4 h-4" />
            Assign Manually
          </button>
        </div>
      </div>

      {/* Manual Assignment Form */}
      {showManualForm && (
        <div className={`${cardClass} p-6 space-y-5`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-950">Manual Parcel Assignment</h3>
            <button onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          {manualError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{manualError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Select Parcel</label>
              <select
                value={selectedParcelId}
                onChange={(e) => { setSelectedParcelId(e.target.value); setSelectedRiderId('') }}
                className={inputClass}
              >
                <option value="">Choose a parcel...</option>
                {parcels.map((p) => (
                  <option key={p.tracking_id} value={p.tracking_id}>
                    {p.tracking_id.slice(0, 8)}... — {p.receiver_name} ({p.zone_name || 'No zone'})
                  </option>
                ))}
              </select>
              {selectedParcel && (
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Zone: <strong className="text-slate-800">{selectedParcel.zone_name || 'No zone'}</strong>
                  {' · '}Pincode: <strong className="text-slate-800">{selectedParcel.pincode}</strong>
                  {' · '}Priority: <strong className="text-slate-800">{selectedParcel.priority}</strong>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Select Rider {selectedParcel && <span className="text-xs text-slate-400">(filtered by zone & capacity)</span>}
              </label>
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className={inputClass}
                disabled={!selectedParcelId}
              >
                <option value="">Choose a rider...</option>
                {eligibleRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.user_name || r.username} — {r.zone_name || 'No zone'} (Cap: {r.remaining_capacity}/{r.capacity})
                  </option>
                ))}
              </select>
              {selectedParcelId && eligibleRiders.length === 0 && (
                <p className="mt-2 text-sm text-amber-600">No eligible riders available for this parcel's zone with remaining capacity.</p>
              )}
              {selectedParcelId && eligibleRiders.length > 0 && (
                <p className="mt-2 text-sm text-slate-500">{eligibleRiders.length} eligible rider(s) available.</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleManualAssign}
              disabled={!selectedParcelId || !selectedRiderId || manualAssigning}
              className={buttonPrimary}
            >
              {manualAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {manualAssigning ? 'Assigning...' : 'Assign Parcel'}
            </button>
            <button onClick={() => setShowManualForm(false)} className={buttonSecondary}>
              Cancel
            </button>
          </div>
        </div>
      )}

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
                    <td className="px-6 py-4">
                      <Link
                        to={`/parcels/${a.parcel_tracking_id}`}
                        className="font-mono text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline"
                      >
                        {a.parcel_tracking_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/riders/${a.rider}`}
                        className="text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline"
                      >
                        {a.rider_name}
                      </Link>
                    </td>
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