import { useState } from 'react'
import api from '../lib/api'
import { FileText, Download, Calendar } from 'lucide-react'

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
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          Date Range Filter
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{report.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{report.desc}</p>
                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                    {report.format}
                  </span>
                </div>
              </div>
              <button
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                onClick={() => handleExport(report.endpoint, `${report.id}.${report.format.toLowerCase()}`)}
                disabled={loading}
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
