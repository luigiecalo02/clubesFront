function csvCell(value: string | number): string {
  const text = String(value)
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv(fileName: string, rows: Array<Array<string | number>>) {
  const content = rows.map((row) => row.map(csvCell).join(';')).join('\n')
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
