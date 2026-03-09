'use client'
import { useState } from 'react'
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

export default function Reports() {
  const { t } = useLanguage()
  const [selectedReport, setSelectedReport] = useState('sales')
  const [dateRange, setDateRange] = useState('month')

  const reports = [
    { id: 'sales', name: t('salesReport'), icon: TrendingUp },
    { id: 'payment', name: t('paymentReport'), icon: FileText },
    { id: 'vendor', name: t('vendorReport'), icon: FileText },
  ]

  const handleGenerateReport = () => {
    // Generate report logic
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-text dark:text-text-dark">{t('reports')}</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{t('viewReports')}</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={handleGenerateReport}
            className="dubai-button inline-flex items-center justify-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('generateReport')}
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Report Selection */}
        <div className="dubai-card p-6">
          <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">Report Type</h3>
          <div className="space-y-3">
            {reports.map((report) => {
              const Icon = report.icon
              return (
                <label key={report.id} className="flex items-center">
                  <input
                    type="radio"
                    name="report"
                    value={report.id}
                    checked={selectedReport === report.id}
                    onChange={(e) => setSelectedReport(e.target.value)}
                    className="mr-3"
                  />
                  <Icon className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-text dark:text-text-dark">{report.name}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Date Range */}
        <div className="dubai-card p-6">
          <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">Date Range</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="dateRange"
                value="month"
                checked={dateRange === 'month'}
                onChange={(e) => setDateRange(e.target.value)}
                className="mr-3"
              />
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <span className="text-text dark:text-text-dark">{t('monthlyReport')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="dateRange"
                value="year"
                checked={dateRange === 'year'}
                onChange={(e) => setDateRange(e.target.value)}
                className="mr-3"
              />
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <span className="text-text dark:text-text-dark">{t('yearlyReport')}</span>
            </label>
          </div>
        </div>

        {/* Export Options */}
        <div className="dubai-card p-6">
          <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">Export Options</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-center px-4 py-2 border border-border dark:border-border-dark rounded-card text-text dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              {t('exportPDF')}
            </button>
            <button className="w-full flex items-center justify-center px-4 py-2 border border-border dark:border-border-dark rounded-card text-text dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              {t('exportExcel')}
            </button>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="mt-8 dubai-card p-6">
        <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">Report Preview</h3>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-4" />
          <p>Select report type and generate to view preview</p>
        </div>
      </div>
    </div>
  )
}