import { useState } from 'react'
import api from '../lib/api'
import { FileText, Download, Calendar, Loader2 } from 'lucide-react'
import { PageHeader, buttonSecondary, cardClass, inputClass } from '../components/ui'

export default function Reports() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  const reports = [
    { id: 'daily-dispatch', label: 'Daily Dispatch Summary', desc: 'Summary of all dispatches for the day', format: 'PDF', endpoint: '/reports/daily-dispatch/' },
    { id: 'rider-performance', label: 'Rider Performance Report', desc: 'Performance metrics for all riders', format: 'PDF', endpoint: '/reports/rider-performance/' },
    { id: 'parcel-csv', label: 'Parcel List Export', desc: 'Full parcel list with filters', format: 'CSV', endpoint: '/reports/parcel-csv/' },
    { id: 'delivery-excel', label: 'Delivery Performance', desc: 'Delivery performance over a date range', format: 'Excel', endpoint: '/reports/delivery-excel/' },
  ]

  const handleExport = async (endpoint: string, filename: string) => {
    setLoading(true)
    try {
      const { data } = await api.get(endpoint, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export report', err)
      alert('Failed to export report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Export dispatch, rider performance, parcel and delivery reports for operational reviews."
      />

      <div className={`${cardClass} p-6`}>
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-zinc-50">
          <Calendar className="w-5 h-5 text-yellow-400" />
          Date Range Filter
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <div key={report.id} className={`${cardClass} p-6 hover:-translate-y-1`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-400 ring-1 ring-yellow-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-50">{report.label}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{report.desc}</p>
                  <span className="mt-3 inline-block rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400">
                    {report.format}
                  </span>
                </div>
              </div>
              <button
                className={`${buttonSecondary} disabled:opacity-50`}
                onClick={() => handleExport(report.endpoint, `${report.id}.${report.format.toLowerCase()}`)}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
