import * as XLSX from 'xlsx-js-style'

interface ExcelColumn {
  key: string
  label: string
  header?: string
  width?: number
}

interface GrandTotalRow {
  /** Map of column key -> value to show. Non-numeric or omitted keys show '' */
  values: Record<string, string | number>
  label?: string  // shown in first cell if provided
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
    summary?: string          // legacy single-cell summary (still supported)
    row?: GrandTotalRow       // per-column grand total row
  }
}

const TABLE_BORDER = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } }
}

const TITLE_BORDER = {
  top: { style: 'medium', color: { rgb: '000000' } },
  bottom: { style: 'medium', color: { rgb: '000000' } },
  left: { style: 'medium', color: { rgb: '000000' } },
  right: { style: 'medium', color: { rgb: '000000' } }
}

function applySheetStyles(
  worksheet: any,
  columns: ExcelColumn[],
  data: any[],
  title: string | undefined,
  grandTotals: ExcelExportOptions['grandTotals']
) {
  const headerRowIndex = title ? 2 : 0
  const dataStartRow = title ? 3 : 1

  // Title row
  if (title) {
    columns.forEach((_, c) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (!worksheet[addr]) worksheet[addr] = { v: '' }
      worksheet[addr].s = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'D4AF37' } },
        border: TITLE_BORDER,
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    })
    worksheet['A1'].v = title
    if (!worksheet['!merges']) worksheet['!merges'] = []
    worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } })
  }

  // Header row
  columns.forEach((_, c) => {
    const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c })
    if (!worksheet[addr]) worksheet[addr] = {}
    worksheet[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'B8960C' } },
      border: TABLE_BORDER,
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
    }
  })

  // Data rows
  for (let row = dataStartRow; row < dataStartRow + data.length; row++) {
    const isAlternate = (row - dataStartRow) % 2 === 1
    columns.forEach((_, c) => {
      const addr = XLSX.utils.encode_cell({ r: row, c })
      if (!worksheet[addr]) worksheet[addr] = { v: '' }
      worksheet[addr].s = {
        fill: { fgColor: { rgb: isAlternate ? 'F9FAFB' : 'FFFFFF' } },
        font: {},
        border: TABLE_BORDER,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: false }
      }
    })
  }

  // Grand total row — placed immediately after last data row (no gap)
  if (grandTotals?.enabled) {
    const gtRowIndex = dataStartRow + data.length

    if (grandTotals.row) {
      const { values, label } = grandTotals.row
      columns.forEach((col, c) => {
        const addr = XLSX.utils.encode_cell({ r: gtRowIndex, c })
        const rawVal = values[col.key]
        const isAmountCol = rawVal !== undefined && rawVal !== ''
        const cellValue = c === 0 && label
          ? label
          : isAmountCol
            ? `AED ${Number(rawVal).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : ''
        worksheet[addr] = { v: cellValue }
        worksheet[addr].s = {
          font: {
            bold: true,
            sz: 11,
            color: { rgb: c === 0 ? 'B8960C' : isAmountCol ? 'B8960C' : '6B7280' }
          },
          fill: { fgColor: { rgb: 'FEF9E7' } },
          border: TABLE_BORDER,
          alignment: { horizontal: c === 0 ? 'left' : 'center', vertical: 'center' }
        }
      })
    } else if (grandTotals.summary) {
      columns.forEach((_, c) => {
        const addr = XLSX.utils.encode_cell({ r: gtRowIndex, c })
        if (!worksheet[addr]) worksheet[addr] = { v: '' }
        worksheet[addr].s = {
          font: { bold: true, sz: 11, color: { rgb: 'B8960C' } },
          fill: { fgColor: { rgb: 'FEF9E7' } },
          border: TABLE_BORDER,
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      })
      const firstAddr = XLSX.utils.encode_cell({ r: gtRowIndex, c: 0 })
      worksheet[firstAddr] = { v: grandTotals.summary }
      if (!worksheet['!merges']) worksheet['!merges'] = []
      worksheet['!merges'].push({ s: { r: gtRowIndex, c: 0 }, e: { r: gtRowIndex, c: columns.length - 1 } })
    }
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
  const headers = columns.map(col => col.label || col.header || col.key)
  const rows = data.map(item => columns.map(col => item[col.key] ?? ''))

  // Build grand total row for wsData
  const gtDataRow = grandTotals?.enabled && grandTotals.row
    ? columns.map((col, c) => {
        if (c === 0 && grandTotals.row!.label) return grandTotals.row!.label
        const v = grandTotals.row!.values[col.key]
        if (v === undefined || v === '') return ''
        return `AED ${Number(v).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      })
    : grandTotals?.enabled && grandTotals.summary
      ? [grandTotals.summary, ...columns.slice(1).map(() => '')]
      : null

  const wsData = [
    ...(title ? [[title], []] : []),
    headers,
    ...rows,
    ...(gtDataRow ? [gtDataRow] : [])
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(wsData)

  worksheet['!cols'] = columns.map(col => ({ wch: col.width || 20 }))

  const rowHeights: any[] = []
  if (title) { rowHeights[0] = { hpt: 35 }; rowHeights[1] = { hpt: 15 }; rowHeights[2] = { hpt: 25 } }
  else { rowHeights[0] = { hpt: 25 } }
  for (let r = 0; r < data.length; r++) rowHeights.push({ hpt: 22 })
  if (grandTotals?.enabled) rowHeights.push({ hpt: 24 })
  worksheet['!rows'] = rowHeights

  applySheetStyles(worksheet, columns, data, title, grandTotals)
  if (isRTL) worksheet['!dir'] = 'rtl'

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`)
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
      row?: GrandTotalRow
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
  const headers = columns.map(col => col.label || col.header || col.key)

  sheets.forEach(sheet => {
    const rows = sheet.data.map(item => columns.map(col => item[col.key] ?? ''))

    const gtDataRow = sheet.grandTotals?.enabled && sheet.grandTotals.row
      ? columns.map((col, c) => {
          if (c === 0 && sheet.grandTotals!.row!.label) return sheet.grandTotals!.row!.label
          const v = sheet.grandTotals!.row!.values[col.key]
          if (v === undefined || v === '') return ''
          return `AED ${Number(v).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        })
      : sheet.grandTotals?.enabled && sheet.grandTotals.summary
        ? [sheet.grandTotals.summary, ...columns.slice(1).map(() => '')]
        : null

    const wsData = [
      ...(sheet.title ? [[sheet.title], []] : []),
      headers,
      ...rows,
      ...(gtDataRow ? [gtDataRow] : [])
    ]
    const worksheet = XLSX.utils.aoa_to_sheet(wsData)

    worksheet['!cols'] = columns.map(col => ({ wch: col.width || 20 }))

    const rowHeights: any[] = []
    if (sheet.title) { rowHeights[0] = { hpt: 35 }; rowHeights[1] = { hpt: 15 }; rowHeights[2] = { hpt: 25 } }
    else { rowHeights[0] = { hpt: 25 } }
    for (let r = 0; r < sheet.data.length; r++) rowHeights.push({ hpt: 22 })
    if (sheet.grandTotals?.enabled) rowHeights.push({ hpt: 24 })
    worksheet['!rows'] = rowHeights

    applySheetStyles(worksheet, columns, sheet.data, sheet.title, sheet.grandTotals)
    if (isRTL) worksheet['!dir'] = 'rtl'

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName)
  })

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`)
}

// Predefined column configurations for different reports
export const reportColumns = {
  payments: (t: (key: string) => string) => [
    { key: 'entryType', label: 'Entry Type', width: 16 },
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
    { key: 'chargesPercent', label: 'Charges %', width: 14 },
    { key: 'charges', label: 'Charges', width: 18 },
    { key: 'bankChargesPercent', label: 'Bank Charges %', width: 16 },
    { key: 'bankCharges', label: 'Bank Charges', width: 18 },
    { key: 'vatPercent', label: 'VAT %', width: 12 },
    { key: 'vat', label: 'VAT', width: 16 },
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
    { key: 'agent', label: 'Agent', width: 20 },
    { key: 'posMachine', label: 'POS Machine', width: 25 },
    { key: 'date', label: 'Date', width: 15 },
    { key: 'posReceiptAmount', label: 'Receipt Amount', width: 20 },
    { key: 'chargesPercent', label: 'Charges %', width: 12 },
    { key: 'chargesAmount', label: 'Charges', width: 16 },
    { key: 'bankChargesPercent', label: 'Bank Charges %', width: 14 },
    { key: 'bankChargesAmount', label: 'Bank Charges', width: 18 },
    { key: 'vatPercent', label: 'VAT %', width: 10 },
    { key: 'vatAmount', label: 'VAT', width: 12 },
    { key: 'netReceived', label: 'Net Received', width: 15 },
    { key: 'toPayAmount', label: 'To Pay Amount', width: 15 },
    { key: 'marginAmount', label: 'Margin', width: 12 },
    { key: 'paid', label: 'Paid', width: 12 },
    { key: 'balance', label: 'Balance', width: 12 },
    { key: 'createdBy', label: 'Created By', width: 15 },
    { key: 'updatedBy', label: 'Updated By', width: 15 },
    { key: 'description', label: 'Description', width: 30 }
  ]
}
