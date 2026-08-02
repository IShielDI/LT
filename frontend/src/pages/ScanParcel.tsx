import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../lib/api'
import type { Parcel, PresetLocation } from '../types'
import { useNavigate, Link } from 'react-router-dom'
import { Camera, Upload, CheckCircle, AlertCircle, Loader2, X, ArrowRight } from 'lucide-react'
import { PageHeader, buttonPrimary, buttonSecondary, cardClass } from '../components/ui'

type ScanMode = 'camera' | 'upload'

export default function ScanParcel() {
  const navigate = useNavigate()
  const [scanMode, setScanMode] = useState<ScanMode>('camera')
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [parcel, setParcel] = useState<Parcel | null>(null)
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
    } catch (err) {
      console.error('Failed to fetch parcel:', err)
      setError(`Parcel with tracking ID "${trackingId}" not found.`)
      setScanned(false)
    }
  }

  const resetScan = () => {
    setScanned(false)
    setParcel(null)
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
        description="Scan a QR/barcode to look up parcel details. Assignment happens automatically on intake."
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
            <h3 className="text-lg font-semibold text-zinc-50">Choose Scan Method</h3>
            <p className="mt-1 text-sm text-zinc-400">Use your device camera or upload a QR code image.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {cameraError && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <AlertCircle className="w-5 h-5" />
              {cameraError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => { setScanMode('camera'); startCamera() }}
              disabled={scanning}
              className={`${cardClass} p-6 text-center hover:border-yellow-500/50 hover:shadow-md disabled:opacity-50`}
            >
              <Camera className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
              <h4 className="font-semibold text-zinc-50 mb-1">Camera Scan</h4>
              <p className="text-sm text-zinc-400">Use device camera to scan QR code</p>
            </button>

            <button
              onClick={() => setScanMode('upload')}
              disabled={scanning}
              className={`${cardClass} p-6 text-center hover:border-yellow-500/50 hover:shadow-md disabled:opacity-50`}
            >
              <Upload className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
              <h4 className="font-semibold text-zinc-50 mb-1">Upload Image</h4>
              <p className="text-sm text-zinc-400">Upload a photo of a QR code</p>
            </button>
          </div>

          {scanMode === 'camera' && !scanning && (
            <div className="flex flex-col items-center gap-4">
              <div id="qr-reader" className="w-full max-w-md rounded-xl overflow-hidden border border-zinc-800" />
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
              <Loader2 className="w-12 h-12 animate-spin text-yellow-400" />
              <p className="text-sm text-zinc-400">Scanning...</p>
              <div id="qr-reader" className="w-full max-w-md rounded-xl overflow-hidden border border-zinc-800" />
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
                <h3 className="text-lg font-semibold text-zinc-50">Parcel Found</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-400">Tracking ID</p>
                  <p className="font-mono text-sm font-medium text-zinc-200">{parcel.tracking_id}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Sender</p>
                  <p className="text-sm font-medium text-zinc-200">{parcel.sender_name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Receiver</p>
                  <p className="text-sm font-medium text-zinc-200">{parcel.receiver_name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Receiver Phone</p>
                  <p className="text-sm font-medium text-zinc-200">{parcel.receiver_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Pincode</p>
                  <p className="text-sm font-medium text-zinc-200">{parcel.pincode}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Zone</p>
                  <p className="text-sm font-medium text-zinc-200">{parcel.zone_name || getLocationName(parcel.zone || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Priority</p>
                  <p className="text-sm font-medium text-zinc-200 capitalize">{parcel.priority}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Weight</p>
                  <p className="text-sm font-medium text-zinc-200">{parcel.weight} kg</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Status</p>
                  <p className="text-sm font-medium text-zinc-200 capitalize">{parcel.status.replace(/_/g, ' ')}</p>
                </div>
                {parcel.current_assignment && (
                  <div>
                    <p className="text-sm text-zinc-400">Assigned Rider</p>
                    <Link
                      to={`/riders/${parcel.current_assignment.rider_id}`}
                      className="text-sm font-medium text-yellow-400 hover:text-yellow-300 hover:underline"
                    >
                      {parcel.current_assignment.rider_name}
                    </Link>
                  </div>
                )}
              </div>

              {parcel.is_unassigned && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Unassigned — Needs Attention</p>
                    <p className="text-amber-200">No eligible rider was available when this parcel was created. It remains in 'registered' status until a rider becomes available.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  to={`/parcels/${parcel.tracking_id}`}
                  className={buttonPrimary}
                >
                  View Parcel Details <ArrowRight className="w-4 h-4" />
                </Link>
                <button onClick={resetScan} className={buttonSecondary}>
                  Scan Another
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}