import JSZip from 'jszip'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { APP_NAME } from '@/shared/constants/app'

export interface ArchiveBill {
  billNumber: string
  customerName: string
  orderDate: string
  total: number
  paidAmount: number
  rows: { detail: string; amount: number; orderTypeName: string | null }[]
  history: { stage: string; at: string; note: string | null }[]
  comments: { author: string; body: string; at: string }[]
  attachments: { filename: string; storagePath: string }[]
}

export interface ArchiveDeps {
  /** Fetch one attachment's raw bytes by its Storage path. */
  fetchAttachment: (storagePath: string) => Promise<Blob>
  /** Render one bill to a PDF Blob. Defaults to the @react-pdf/renderer impl. */
  renderBillPdf?: (bill: ArchiveBill) => Promise<Blob>
}

/** Real PDF renderer — pulled in lazily so the module imports cleanly under jsdom. */
async function defaultRenderBillPdf(bill: ArchiveBill): Promise<Blob> {
  const { pdf, Document, Page, View, Text } = await import('@react-pdf/renderer')
  const line = (label: string, value: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
      <Text style={{ fontSize: 10, color: '#666' }}>{label}</Text>
      <Text style={{ fontSize: 10 }}>{value}</Text>
    </View>
  )
  const doc = (
    <Document>
      <Page size="A4" style={{ padding: 32, fontSize: 11 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>{bill.billNumber}</Text>
        {line('Customer', bill.customerName)}
        {line('Order date', bill.orderDate)}
        {line('Total', formatCurrency(bill.total))}
        {line('Paid', formatCurrency(bill.paidAmount))}
        <Text style={{ marginTop: 12, marginBottom: 4, fontWeight: 'bold' }}>Line items</Text>
        {bill.rows.map((r, i) => (
          <View key={i}>{line(`${r.detail} (${r.orderTypeName ?? '—'})`, formatCurrency(r.amount))}</View>
        ))}
        <Text style={{ marginTop: 12, marginBottom: 4, fontWeight: 'bold' }}>Stage history</Text>
        {bill.history.map((hst, i) => (
          <Text key={i} style={{ fontSize: 9, marginBottom: 1 }}>
            {hst.at} — {hst.stage}
            {hst.note ? ` — ${hst.note}` : ''}
          </Text>
        ))}
        <Text style={{ marginTop: 12, marginBottom: 4, fontWeight: 'bold' }}>Comments</Text>
        {bill.comments.map((c, i) => (
          <Text key={i} style={{ fontSize: 9, marginBottom: 1 }}>
            {c.at} — {c.author}: {c.body}
          </Text>
        ))}
        {bill.attachments.length > 0 && (
          <>
            <Text style={{ marginTop: 12, marginBottom: 4, fontWeight: 'bold' }}>Attachments</Text>
            {bill.attachments.map((a, i) => (
              <Text key={i} style={{ fontSize: 9 }}>
                {a.filename} (see attachments/{bill.billNumber}/)
              </Text>
            ))}
          </>
        )}
      </Page>
    </Document>
  )
  return pdf(doc).toBlob()
}

async function buildIndexPdf(
  bills: ArchiveBill[],
  renderBillPdf: (bill: ArchiveBill) => Promise<Blob>,
): Promise<Blob> {
  // Reuse the bill renderer for a simple manifest "bill".
  const manifest: ArchiveBill = {
    billNumber: `${APP_NAME} archive — ${bills.length} bill(s)`,
    customerName: bills.length
      ? `${bills[0]!.orderDate} … ${bills[bills.length - 1]!.orderDate}`
      : '(none)',
    orderDate: new Date().toISOString().slice(0, 10),
    total: bills.reduce((s, b) => s + b.total, 0),
    paidAmount: bills.reduce((s, b) => s + b.paidAmount, 0),
    rows: bills.map((b) => ({ detail: b.billNumber, amount: b.total, orderTypeName: null })),
    history: [],
    comments: [],
    attachments: [],
  }
  return renderBillPdf(manifest)
}

export async function buildArchiveZip(bills: ArchiveBill[], deps: ArchiveDeps): Promise<Blob> {
  const renderBillPdf = deps.renderBillPdf ?? defaultRenderBillPdf
  const zip = new JSZip()

  zip.file('index.pdf', await buildIndexPdf(bills, renderBillPdf))

  for (const b of bills) {
    zip.file(`bills/${b.billNumber}.pdf`, await renderBillPdf(b))
    for (const a of b.attachments) {
      zip.file(`attachments/${b.billNumber}/${a.filename}`, await deps.fetchAttachment(a.storagePath))
    }
  }

  return zip.generateAsync({ type: 'blob' })
}
