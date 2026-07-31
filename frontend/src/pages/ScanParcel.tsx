import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../lib/api'
import type { Parcel, Rider, PaginatedResponse, PresetLocation } from '../types'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, CheckCircle, AlertCircle, Loader2, UserPlus, Send, X } from 'lucide-react'
import { PageHeader, buttonPrimary, buttonSecondary, cardClass, inputClass } from '../components/ui'

type ScanMode = 'camera' | 'upload'

export default function ScanParcel() {
  const navigate = useNavigate()
  const [scanMode, setScanMode] = useState<ScanMode>('camera')
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [parcel, setParcel] = useState<Parcel | null>(null)
  const [eligibleRiders, setEligibleRiders] = useState<Rider[]>([])
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [locations, setLocations] = useState<PresetLocation[]>([])

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchLocations()
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const fetchLocations = async () => {
    try {
      const { data } = await api.get<PresetLocation[]>('/parcels/zones/preset_locations/')
      setLocations(data)
    } catch (err) {
      console.error('Failed to fetch locations', err)
    }
  }

  const startCamera = async () => {
    setScanning(true)
    setCameraError('')
    try {
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Successfully scanned
          html5QrCode.stop().then(() => {
            setScanning(false)
            handleScannedTrackingId(decodedText)
          }).catch(() => {})
        },
        () => {
          // Ignore scan failures (no QR code in frame)
        }
      )
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Unable to access camera. Please use file upload instead.')
      setScanning(false)
      setScanMode('upload')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setError('')
    try {
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      const decodedText = await html5QrCode.scanFile(file, true)
      await html5QrCode.stop()
      setScanning(false)
      handleScannedTrackingId(decodedText)
    } catch (err) {
      console.error('Scan error:', err)
      setError('No QR code found in the uploaded image. Please try again.')
      setScanning(false)
    }
  }

  const handleScannedTrackingId = async (trackingId: string) => {
    setScanned(true)
    setError('')
    try {
      // Fetch parcel details
      const { data: parcelData } = await api.get<Parcel>(`/parcels/parcels/${trackingId}/`)
      setParcel(parcelData)

      // Fetch eligible riders for this parcel's zone
      const { data: ridersData } = await api.get<PaginatedResponse<Rider>>('/riders/riders/?page_size=100')
      const allRiders = ridersData.results

      // Filter riders: same zone, available, with remaining capacity
      const eligible = allRiders.filter((r) => {
        if (!r.is_available || r.remaining_capacity <= 0) return false
        if (!parcelData.zone || !r.zone) return true
        return r.zone === parcelData.zone
      })

      setEligibleRiders(eligible)
    } catch (err) {
      console.error('Failed to fetch parcel:', err)
      setError(`Parcel with tracking ID "${trackingId}" not found.`)
      setScanned(false)
    }
  }

  const handleAutoAssign = async () => {
    if (!parcel) return
    setAssigning(true)
    setError('')
    try {
      const { data } = await api.post('/dispatch/assignments/run_assignment/')
      if (data.assigned.length > 0) {
        alert(`Auto-assigned to ${data.assigned[0].rider_name}`)
        navigate('/dispatch')
      } else {
        setError('No eligible riders available for auto-assignment.')
      }
    } catch (err) {
      console.error('Auto-assign error:', err)
      setError('Failed to auto-assign parcel.')
    } finally {
      setAssigning(false)
    }
  }

  const handleManualAssign = async () => {
    if (!parcel || !selectedRiderId) return
    setAssigning(true)
    setError('')
    try {
      await api.post('/dispatch/assignments/manual_assign/', {
        parcel: parcel.tracking_id,
        rider: Number(selectedRiderId),
      })
      alert('Parcel assigned successfully!')
      navigate('/dispatch')
    } catch (err) {
      console.error('Manual assign error:', err)
      setError('Failed to assign parcel.')
    } finally {
      setAssigning(false)
    }
  }

  const resetScan = () => {
    setScanned(false)
    setParcel(null)
    setEligibleRiders([])
    setSelectedRiderId('')
    setError('')
    setScanMode('camera')
  }

  const getLocationName = (zoneId: number) => {
    return locations.find((l) => l.zone === zoneId)?.area_name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Parcel"
        description="Scan a QR/barcode to look up parcel details and assign a rider."
        actions={
          <button onClick={() => navigate('/dispatch')} className={buttonSecondary}>
            <X className="w-4 h-4" />
            Back to Dispatch
          </button>
        }
      />

      {!scanned ? (
        <div className={`${cardClass} p-6 space-y-6`}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Choose Scan Method</h3>
            <p className="mt-1 text-sm text-slate-500">Use your device camera or upload a QR code image.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {cameraError && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              <AlertCircle className="w-5 h-5" />
              {cameraError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => { setScanMode('camera'); startCamera() }}
              disabled={scanning}
              className={`${cardClass} p-6 text-center hover:border-primary-300 hover:shadow-md disabled:opacity-50`}
            >
              <Camera className="w-12 h-12 mx-auto mb-3 text-primary-600" />
              <h4 className="font-semibold text-slate-950 mb-1">Camera Scan</h4>
              <p className="text-sm text-slate-500">Use device camera to scan QR code</p>
            </button>

            <button
              onClick={() => setScanMode('upload')}
              disabled={scanning}
              className={`${cardClass} p-6 text-center hover:border-primary-300 hover:shadow-md disabled:opacity-50`}
            >
              <Upload className="w-12 h-12 mx-auto mb-3 text-primary-600" />
              <h4 className="font-semibold text-slate-950 mb-1">Upload Image</h4>
              <p className="text-sm text-slate-500">Upload a photo of a QR code</p>
            </button>
          </div>

          {scanMode === 'camera' && !scanning && (
            <div className="flex flex-col items-center gap-4">
              <div id="qr-reader" className="w-full max-w-md rounded-xl overflow-hidden border border-slate-200" />
              <button onClick={startCamera} className={buttonPrimary}>
                <Camera className="w-4 h-4" />
                Start Camera
              </button>
            </div>
          )}

          {scanMode === 'upload' && (
            <div className="flex flex-col items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className={buttonPrimary}
              >
                <Upload className="w-4 h-4" />
                Choose Image
              </button>
            </div>
          )}

          {scanning && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
              <p className="text-sm text-slate-600">Scanning...</p>
              <div id="qr-reader" className="w-full max-w-md rounded-xl overflow-hidden border border-slate-200" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Parcel Details */}
          {parcel && (
            <div className={`${cardClass} p-6 space-y-4`}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-slate-950">Parcel Found</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Tracking ID</p>
                  <p className="font-mono text-sm font-medium text-slate-800">{parcel.tracking_id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sender</p>
                  <p className="text-sm font-medium text-slate-800">{parcel.sender_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Receiver</p>
                  <p className="text-sm font-medium text-slate-800">{parcel.receiver_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Receiver Phone</p>
                  <p className="text-sm font-medium text-slate-800">{parcel.receiver_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pincode</p>
                  <p className="text-sm font-medium text-slate-800">{parcel.pincode}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Zone</p>
                  <p className="text-sm font-medium text-slate-800">{parcel.zone_name || getLocationName(parcel.zone || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Priority</p>
                  <p className="text-sm font-medium text-slate-800 capitalize">{parcel.priority}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Weight</p>
                  <p className="text-sm font-medium text-slate-800">{parcel.weight} kg</p>
                </div>
              </div>
            </div>
          )}

          {/* Rider Assignment */}
          {parcel && (
            <div className={`${cardClass} p-6 space-y-4`}>
              <h3 className="text-lg font-semibold text-slate-950">Assign Rider</h3>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              {eligibleRiders.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  No eligible riders available for this parcel's zone with remaining capacity.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Select Rider</label>
                      <select
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Choose a rider...</option>
                        {eligibleRiders.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.user_name || r.username} — {r.zone_name || 'No zone'} (Cap: {r.remaining_capacity}/{r.capacity})
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-sm text-slate-500">
                        {eligibleRiders.length} eligible rider(s) in {parcel.zone_name || getLocationName(parcel.zone || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleManualAssign}
                      disabled={!selectedRiderId || assigning}
                      className={buttonPrimary}
                    >
                      {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      {assigning ? 'Assigning...' : 'Assign Selected Rider'}
                    </button>
                    <button
                      onClick={handleAutoAssign}
                      disabled={assigning}
                      className={buttonSecondary}
                    >
                      {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Auto-Assign
                    </button>
                    <button onClick={resetScan} className={buttonSecondary}>
                      Scan Another
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}