import { useState, useRef } from 'react'
import api from '../lib/api'
import { Search, Package, AlertCircle, CheckCircle, Clock, XCircle, Upload } from 'lucide-react'

interface TrackingResult {
  tracking_id: string
  sender_name: string
  receiver_name: string
  pincode: string
  zone_name: string | null
  priority: string
  priority_display: string
  weight: number
  status: string
  status_display: string
  created_at: string
  updated_at: string
}

const STATUS_ICONS: Record<string, typeof Package> = {
  registered: Package,
  sorted: Package,
  assigned: Clock,
  in_transit: Clock,
  delivered: CheckCircle,
  failed: XCircle,
  reattempt_scheduled: AlertCircle,
}

const STATUS_COLORS: Record<string, string> = {
  registered: 'text-gray-600 bg-gray-100',
  sorted: 'text-blue-600 bg-blue-100',
  assigned: 'text-indigo-600 bg-indigo-100',
  in_transit: 'text-amber-600 bg-amber-100',
  delivered: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
  reattempt_scheduled: 'text-purple-600 bg-purple-100',
}

export default function Tracking() {
  const [trackingId, setTrackingId] = useState('')
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingId.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.get<TrackingResult>(
        `/parcels/parcels/track/?tracking_id=${trackingId}`
      )
      setResult(data)
    } catch {
      setError('Parcel not found. Please check your tracking ID.')
    } finally {
      setLoading(false)
    }
  }

  const handleQRScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setError('')
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await api.post<TrackingResult>('/parcels/parcels/scan/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      setTrackingId(data.tracking_id)
    } catch {
      setError('No QR code found or invalid QR code.')
    } finally {
      setScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const StatusIcon = result ? STATUS_ICONS[result.status] || Package : Package

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Track Your Parcel</h1>
          <p className="text-gray-500 mt-2">Enter your tracking ID to see the latest status</p>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter tracking ID (UUID)..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleQRScan}
                className="hidden"
                id="qr-upload"
              />
              <label
                htmlFor="qr-upload"
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg cursor-pointer hover:bg-gray-200 transition"
              >
                {scanning ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">Scan QR</span>
              </label>
            </div>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Tracking ID</p>
                  <p className="font-mono text-sm">{result.tracking_id}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${STATUS_COLORS[result.status]}`}>
                  <StatusIcon className="w-5 h-5" />
                  <span className="font-medium">{result.status_display}</span>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Sender</p>
                  <p className="font-medium">{result.sender_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Receiver</p>
                  <p className="font-medium">{result.receiver_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pincode</p>
                  <p className="font-medium">{result.pincode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Zone</p>
                  <p className="font-medium">{result.zone_name || 'Unzoned'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Priority</p>
                  <p className="font-medium">{result.priority_display}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Weight</p>
                  <p className="font-medium">{result.weight} kg</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm text-gray-500">
                  <div>
                    <p>Created: {new Date(result.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p>Updated: {new Date(result.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}