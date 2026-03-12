import * as XLSX from 'xlsx'

interface ExcelColumn {
  key: string
  label: string
  width?: number
}

interface ExcelExportOptions {
  filename: string
  sheetName: string
  columns: ExcelColumn[]
  data: any[]
  title?: string
  isRTL?: boolean
}

export const exportToExcel = ({
  filename,
  sheetName,
  columns,
  data,
  title,
  isRTL = false
}: ExcelExportOptions) => {
  const workbook = XLSX.utils.book_new()
  
  // Prepare headers
  const headers = columns.map(col => col.label)
  
  // Prepare data rows
  const rows = data.map(item => 
    columns.map(col => item[col.key] || '')
  )
  
  // Create worksheet data
  const wsData = [
    ...(title ? [[title], []] : []),
    headers,
    ...rows
  ]
  
  const worksheet = XLSX.utils.aoa_to_sheet(wsData)
  
  // Set column widths
  const colWidths = columns.map(col => ({ wch: col.width || 15 }))
  worksheet['!cols'] = colWidths
  
  // Style the header row
  const headerRowIndex = title ? 2 : 0
  columns.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: colIndex })
    if (!worksheet[cellAddress]) worksheet[cellAddress] = {}
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'C9A96E' } },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  })
  
  // Style title if exists
  if (title) {
    const titleCell = worksheet['A1']
    if (titleCell) {
      titleCell.s = {
        font: { bold: true, size: 16, color: { rgb: 'C9A96E' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }
    // Merge title cells
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }]
  }
  
  // Add borders to all data cells
  const dataStartRow = title ? 3 : 1
  for (let row = dataStartRow; row < dataStartRow + data.length; row++) {
    columns.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex })
      if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '' }
      worksheet[cellAddress].s = {
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        },
        alignment: { 
          horizontal: isRTL ? 'right' : 'left',
          vertical: 'center'
        }
      }
    })
  }
  
  // Set RTL if needed
  if (isRTL) {
    worksheet['!dir'] = 'rtl'
  }
  
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const finalFilename = `${filename}_${timestamp}.xlsx`
  
  XLSX.writeFile(workbook, finalFilename)
}

// Predefined column configurations for different reports
export const reportColumns = {
  payments: (t: (key: string) => string) => [
    { key: 'paymentNumber', label: t('paymentId'), width: 15 },
    { key: 'date', label: t('date'), width: 12 },
    { key: 'agentName', label: t('agent'), width: 20 },
    { key: 'paymentMethod', label: t('paymentMethod'), width: 15 },
    { key: 'amount', label: t('amount'), width: 15 },
    { key: 'description', label: t('description'), width: 25 }
  ],
  
  transactions: (t: (key: string) => string) => [
    { key: 'transactionId', label: t('transactionId'), width: 18 },
    { key: 'date', label: t('date'), width: 12 },
    { key: 'clientName', label: t('client'), width: 20 },
    { key: 'amount', label: t('amount'), width: 15 },
    { key: 'commission', label: t('commission'), width: 15 },
    { key: 'status', label: t('status'), width: 12 }
  ]
}