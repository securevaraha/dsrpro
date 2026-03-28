import * as XLSX from 'xlsx-js-style'

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
  const colWidths = columns.map(col => ({ wch: col.width || 20 }))
  worksheet['!cols'] = colWidths
  
  // Set row heights
  const rowHeights: any[] = []
  if (title) {
    rowHeights[0] = { hpt: 35 } // Title
    rowHeights[1] = { hpt: 15 } // Empty spacer
    rowHeights[2] = { hpt: 25 } // Header
  } else {
    rowHeights[0] = { hpt: 25 } // Header
  }
  
  for (let r = 0; r < data.length; r++) {
    rowHeights.push({ hpt: 22 }) // Data rows
  }
  worksheet['!rows'] = rowHeights

  // Style the header row
  const headerRowIndex = title ? 2 : 0
  columns.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: colIndex })
    if (!worksheet[cellAddress]) worksheet[cellAddress] = {}
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4F46E5' } }, // Professional Indigo header
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'medium', color: { rgb: '4F46E5' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
      },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
    }
  })
  
  // Style title if exists
  if (title) {
    const titleCell = worksheet['A1']
    if (titleCell) {
      titleCell.s = {
        font: { bold: true, sz: 16, color: { rgb: '111827' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }]
  }
  
  // Add borders and center text to all data cells
  const dataStartRow = title ? 3 : 1
  for (let row = dataStartRow; row < dataStartRow + data.length; row++) {
    columns.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex })
      if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '' }
      
      const isAlternate = (row - dataStartRow) % 2 === 1
      worksheet[cellAddress].s = {
        fill: isAlternate ? { fgColor: { rgb: 'F9FAFB' } } : { fgColor: { rgb: 'FFFFFF' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } }
        },
        alignment: { 
          horizontal: 'center',
          vertical: 'center',
          wrapText: true
        }
      }
    })
  }
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
    { key: 'paymentNumber', label: t('paymentId'), width: 22 },
    { key: 'date', label: t('date'), width: 18 },
    { key: 'agentName', label: t('agent'), width: 25 },
    { key: 'paymentMethod', label: t('paymentMethod'), width: 18 },
    { key: 'amount', label: t('amount'), width: 20 },
    { key: 'description', label: t('description'), width: 40 }
  ],
  
  transactions: (t: (key: string) => string) => [
    { key: 'transactionId', label: t('batchId'), width: 25 },
    { key: 'date', label: t('date'), width: 18 },
    { key: 'clientName', label: t('client'), width: 25 },
    { key: 'amount', label: t('amount'), width: 20 },
    { key: 'commission', label: t('commission'), width: 20 },
    { key: 'status', label: t('status'), width: 15 }
  ],
  
  receiptsAgent: (t: (key: string) => string) => [
    { key: 'receiptNumber', label: 'Receipt No.', width: 22 },
    { key: 'date', label: t('date'), width: 18 },
    { key: 'posMachineInfo', label: 'POS Machine', width: 25 },
    { key: 'amount', label: t('amount'), width: 20 },
    { key: 'description', label: t('description'), width: 40 }
  ],

  receiptsAdmin: (t: (key: string) => string) => [
    { key: 'receiptNumber', label: 'Receipt No.', width: 22 },
    { key: 'date', label: t('date'), width: 18 },
    { key: 'posMachineInfo', label: 'POS Machine', width: 25 },
    { key: 'margin', label: 'Margin', width: 20 },
    { key: 'bankCharges', label: 'Bank Charges', width: 20 },
    { key: 'vat', label: 'VAT', width: 18 },
    { key: 'amount', label: t('amount'), width: 20 },
    { key: 'createdBy', label: 'Created By', width: 25 },
    { key: 'updatedBy', label: 'Updated By', width: 25 },
    { key: 'createdAtDate', label: 'Created Date', width: 22 },
    { key: 'updatedAtDate', label: 'Updated Date', width: 22 },
    { key: 'description', label: t('description'), width: 40 }
  ],

  reportsAgent: (t: (key: string) => string) => [
    { key: 'batchId', label: 'Batch ID', width: 20 },
    { key: 'date', label: 'Date', width: 15 },
    { key: 'posMachine', label: 'POS Machine', width: 25 },
    { key: 'posReceiptAmount', label: 'POS/Receipt Amount', width: 20 },
    { key: 'netReceived', label: 'Net Received', width: 18 },
    { key: 'description', label: 'Description', width: 40 }
  ],

  reportsAdmin: (t: (key: string) => string) => [
    { key: 'batchId', label: 'Batch ID', width: 15 },
    { key: 'date', label: 'Date', width: 15 },
    { key: 'agent', label: 'Agent', width: 20 },
    { key: 'posMachine', label: 'POS Machine', width: 25 },
    { key: 'posReceiptAmount', label: 'POS/Receipt Amount', width: 20 },
    { key: 'marginPercent', label: 'Margin %', width: 12 },
    { key: 'marginAmount', label: 'Margin Amount', width: 15 },
    { key: 'bankChargesPercent', label: 'Bank Charges %', width: 15 },
    { key: 'bankChargesAmount', label: 'Bank Charges Amount', width: 18 },
    { key: 'vatPercent', label: 'VAT %', width: 10 },
    { key: 'vatAmount', label: 'VAT Amount', width: 12 },
    { key: 'netReceived', label: 'Net Received', width: 15 },
    { key: 'toPayAmount', label: 'To Pay Amount', width: 15 },
    { key: 'finalMargin', label: 'Margin', width: 12 },
    { key: 'paid', label: 'Paid', width: 12 },
    { key: 'balance', label: 'Balance', width: 12 },
    { key: 'createdBy', label: 'Created By', width: 15 },
    { key: 'updatedBy', label: 'Updated By', width: 15 },
    { key: 'createdAtDate', label: 'Created Date', width: 18 },
    { key: 'updatedAtDate', label: 'Updated Date', width: 18 },
    { key: 'description', label: 'Description', width: 30 }
  ]
}