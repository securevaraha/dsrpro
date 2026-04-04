import * as XLSX from 'xlsx-js-style'

interface ExcelColumn {
  key: string
  label: string
  header?: string
  width?: number
}

interface ExcelExportOptions {
  filename: string
  sheetName: string
  columns: ExcelColumn[]
  data: any[]
  title?: string
  isRTL?: boolean
  grandTotals?: {
    enabled: boolean
    summary?: string
  }
}

export const exportToExcel = ({
  filename,
  sheetName,
  columns,
  data,
  title,
  isRTL = false,
  grandTotals
}: ExcelExportOptions) => {
  const workbook = XLSX.utils.book_new()
  
  // Prepare headers
  const headers = columns.map(col => col.label || col.header || col.key)
  
  // Prepare data rows
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key]
      return value ?? ''
    })
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
      fill: { fgColor: { rgb: 'B8960C' } }, // DSR Info gold header
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
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'D4AF37' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }]
  }
  
  // Add borders and center text to all data cells
  const dataStartRow = title ? 3 : 1
  const grandTotalRowIndex = dataStartRow + data.length - 1
  
  for (let row = dataStartRow; row < dataStartRow + data.length; row++) {
    columns.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex })
      if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '' }
      
      const isGrandTotalRow = grandTotals?.enabled && row === grandTotalRowIndex
      const isAlternate = (row - dataStartRow) % 2 === 1
      
      worksheet[cellAddress].s = {
        fill: isGrandTotalRow 
          ? { fgColor: { rgb: 'FEF3C7' } } // Yellow background for grand total
          : isAlternate 
            ? { fgColor: { rgb: 'F9FAFB' } } 
            : { fgColor: { rgb: 'FFFFFF' } },
        font: isGrandTotalRow ? { bold: true, color: { rgb: '92400E' } } : {},
        border: {
          top: { style: isGrandTotalRow ? 'medium' : 'thin', color: { rgb: isGrandTotalRow ? '92400E' : 'E5E7EB' } },
          bottom: { style: isGrandTotalRow ? 'medium' : 'thin', color: { rgb: isGrandTotalRow ? '92400E' : 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } }
        },
        alignment: { 
          horizontal: 'left',
          vertical: 'center',
          wrapText: false
        }
      }
    })
  }
  if (isRTL) {
    worksheet['!dir'] = 'rtl'
  }
  
  // Add grand totals summary if provided
  if (grandTotals?.enabled && grandTotals.summary) {
    const summaryRowIndex = dataStartRow + data.length + 1
    const summaryCell = XLSX.utils.encode_cell({ r: summaryRowIndex, c: 0 })
    worksheet[summaryCell] = { v: grandTotals.summary }
    worksheet[summaryCell].s = {
      font: { bold: true, sz: 12, color: { rgb: '1F2937' } },
      fill: { fgColor: { rgb: 'F3F4F6' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    }
    
    // Merge the summary across all columns
    if (!worksheet['!merges']) worksheet['!merges'] = []
    worksheet['!merges'].push({ 
      s: { r: summaryRowIndex, c: 0 }, 
      e: { r: summaryRowIndex, c: columns.length - 1 } 
    })
  }
  
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const finalFilename = `${filename}_${timestamp}.xlsx`
  
  XLSX.writeFile(workbook, finalFilename)
}

interface MultiSheetExportOptions {
  filename: string
  sheets: {
    sheetName: string
    data: any[]
    title?: string
    grandTotals?: {
      enabled: boolean
      summary?: string
    }
  }[]
  columns: ExcelColumn[]
  isRTL?: boolean
}

export const exportMultiSheetExcel = ({
  filename,
  sheets,
  columns,
  isRTL = false
}: MultiSheetExportOptions) => {
  const workbook = XLSX.utils.book_new()
  
  sheets.forEach((sheet, sheetIndex) => {
    // Prepare headers
    const headers = columns.map(col => col.label || col.header || col.key)
    
    // Prepare data rows
    const rows = sheet.data.map(item =>
      columns.map(col => {
        const value = item[col.key]
        return value ?? ''
      })
    )
    
    // Create worksheet data
    const wsData = [
      ...(sheet.title ? [[sheet.title], []] : []),
      headers,
      ...rows
    ]
    
    const worksheet = XLSX.utils.aoa_to_sheet(wsData)
    
    // Set column widths
    const colWidths = columns.map(col => ({ wch: col.width || 20 }))
    worksheet['!cols'] = colWidths
    
    // Set row heights
    const rowHeights: any[] = []
    if (sheet.title) {
      rowHeights[0] = { hpt: 35 } // Title
      rowHeights[1] = { hpt: 15 } // Empty spacer
      rowHeights[2] = { hpt: 25 } // Header
    } else {
      rowHeights[0] = { hpt: 25 } // Header
    }
    
    for (let r = 0; r < sheet.data.length; r++) {
      rowHeights.push({ hpt: 22 }) // Data rows
    }
    worksheet['!rows'] = rowHeights

    // Style the header row
    const headerRowIndex = sheet.title ? 2 : 0
    columns.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: colIndex })
      if (!worksheet[cellAddress]) worksheet[cellAddress] = {}
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'B8960C' } }, // DSR Info gold header
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
    if (sheet.title) {
      const titleCell = worksheet['A1']
      if (titleCell) {
        titleCell.s = {
          font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: 'D4AF37' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
      worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }]
    }
    
    // Add borders and styling to all data cells
    const dataStartRow = sheet.title ? 3 : 1
    const grandTotalRowIndex = dataStartRow + sheet.data.length - 1
    
    for (let row = dataStartRow; row < dataStartRow + sheet.data.length; row++) {
      columns.forEach((_, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex })
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '' }
        
        const isGrandTotalRow = sheet.grandTotals?.enabled && row === grandTotalRowIndex
        const isAlternate = (row - dataStartRow) % 2 === 1
        
        worksheet[cellAddress].s = {
          fill: isGrandTotalRow 
            ? { fgColor: { rgb: 'FEF3C7' } }
            : isAlternate 
              ? { fgColor: { rgb: 'F9FAFB' } } 
              : { fgColor: { rgb: 'FFFFFF' } },
          font: isGrandTotalRow ? { bold: true, color: { rgb: '92400E' } } : {},
          border: {
            top: { style: isGrandTotalRow ? 'medium' : 'thin', color: { rgb: isGrandTotalRow ? '92400E' : 'E5E7EB' } },
            bottom: { style: isGrandTotalRow ? 'medium' : 'thin', color: { rgb: isGrandTotalRow ? '92400E' : 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } }
          },
          alignment: { 
            horizontal: 'left',
            vertical: 'center',
            wrapText: false
          }
        }
      })
    }
    
    if (isRTL) {
      worksheet['!dir'] = 'rtl'
    }
    
    // Add grand totals summary if provided
    if (sheet.grandTotals?.enabled && sheet.grandTotals.summary) {
      const summaryRowIndex = dataStartRow + sheet.data.length + 1
      const summaryCell = XLSX.utils.encode_cell({ r: summaryRowIndex, c: 0 })
      worksheet[summaryCell] = { v: sheet.grandTotals.summary }
      worksheet[summaryCell].s = {
        font: { bold: true, sz: 12, color: { rgb: '1F2937' } },
        fill: { fgColor: { rgb: 'F3F4F6' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      }
      
      // Merge the summary across all columns
      if (!worksheet['!merges']) worksheet['!merges'] = []
      worksheet['!merges'].push({ 
        s: { r: summaryRowIndex, c: 0 }, 
        e: { r: summaryRowIndex, c: columns.length - 1 } 
      })
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName)
  })
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const finalFilename = `${filename}_${timestamp}.xlsx`
  
  XLSX.writeFile(workbook, finalFilename)
}

// Predefined column configurations for different reports
export const reportColumns = {
  payments: (t: (key: string) => string) => [
    { key: 'paymentNumber', label: 'Batch ID', width: 24 },
    { key: 'agentName', label: t('agent'), width: 25 },
    { key: 'date', label: t('date'), width: 18 },
    { key: 'paymentMethod', label: t('paymentMethod'), width: 18 },
    { key: 'status', label: 'Status', width: 14 },
    { key: 'amount', label: t('amount'), width: 20 },
    { key: 'createdByDate', label: 'Created By / Date', width: 36 },
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
    { key: 'receiptNumber', label: 'Batch ID', width: 22 },
    { key: 'posMachineInfo', label: 'POS Machine', width: 25 },
    { key: 'date', label: t('date'), width: 18 },
    { key: 'amount', label: 'Receipt Amount', width: 20 },
    { key: 'description', label: t('description'), width: 40 }
  ],

  receiptsAdmin: (t: (key: string) => string) => [
    { key: 'receiptNumber', label: 'Batch ID', width: 22 },
    { key: 'agent', label: 'Agent', width: 22 },
    { key: 'posMachineInfo', label: 'POS Machine', width: 25 },
    { key: 'date', label: t('date'), width: 18 },
    { key: 'amount', label: 'Receipt Amount', width: 20 },
    { key: 'bankCharges', label: 'Bank Charges', width: 22 },
    { key: 'vat', label: 'VAT', width: 20 },
    { key: 'margin', label: 'Margin', width: 20 },
    { key: 'createdByDate', label: 'Created By / Date', width: 36 },
    { key: 'updatedByDate', label: 'Updated By / Date', width: 36 },
    { key: 'description', label: t('description'), width: 40 }
  ],

  reportsAgent: (t: (key: string) => string) => [
    { key: 'batchId', label: 'Batch ID', width: 20 },
    { key: 'posMachine', label: 'POS Machine', width: 25 },
    { key: 'date', label: 'Date', width: 15 },
    { key: 'posReceiptAmount', label: 'POS/Receipt Amount', width: 20 },
    { key: 'netReceived', label: 'Net Received', width: 18 },
    { key: 'description', label: 'Description', width: 40 }
  ],

  reportsAdmin: (t: (key: string) => string) => [
    { key: 'batchId', label: 'Batch ID', width: 15 },
    { key: 'posMachine', label: 'POS Machine', width: 25 },
    { key: 'agent', label: 'Agent', width: 20 },
    { key: 'date', label: 'Date', width: 15 },
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
    { key: 'description', label: 'Description', width: 30 }
  ]
}