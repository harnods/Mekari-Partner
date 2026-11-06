import jsPDF from 'jspdf'

/**
 * Demo stand-in for an uploaded identity document (NPWP / KTP) — the prototype
 * stores only the filename, so the preview renders a simple PDF of the values
 * the partner submitted. Returns an object URL (caller revokes it).
 */
export function idDocPdfUrl(o: { type: 'NPWP' | 'KTP'; number: string; name: string; address: string }): string {
  const doc = new jsPDF({ unit: 'pt', format: [420, 264] })
  doc.setDrawColor(200, 205, 208); doc.roundedRect(12, 12, 396, 240, 10, 10)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text(o.type === 'NPWP' ? 'NPWP — Nomor Pokok Wajib Pajak' : 'KTP — Kartu Tanda Penduduk', 32, 48)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120, 128, 130)
  doc.text('Sample document · Mekari Partner prototype', 32, 64)
  const rows: [string, string][] = [[o.type === 'NPWP' ? 'NPWP' : 'NIK', o.number], [o.type === 'NPWP' ? 'Name' : 'Full name', o.name], ['Address', o.address]]
  let y = 100
  for (const [k, v] of rows) {
    doc.setTextColor(120, 128, 130); doc.setFontSize(9); doc.text(k, 32, y)
    doc.setTextColor(8, 13, 14); doc.setFontSize(11)
    const lines = doc.splitTextToSize(v || '—', 340) as string[]
    doc.text(lines, 32, y + 14)
    y += 22 + lines.length * 13
  }
  return URL.createObjectURL(doc.output('blob'))
}
