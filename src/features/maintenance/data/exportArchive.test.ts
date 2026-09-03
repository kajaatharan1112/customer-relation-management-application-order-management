import JSZip from 'jszip'
import { buildArchiveZip, type ArchiveBill } from '@/features/maintenance/data/exportArchive'

const bill: ArchiveBill = {
  billNumber: 'BILL-1',
  customerName: 'Ravi',
  orderDate: '2024-01-01',
  total: 1000,
  paidAmount: 1000,
  rows: [{ detail: 'A', amount: 1000, orderTypeName: 'Print' }],
  history: [{ stage: 'Printing', at: '2024-01-02', note: null }],
  comments: [{ author: 'Sam', body: 'done', at: '2024-01-03' }],
  attachments: [{ filename: 'proof.png', storagePath: 'bills/BILL-1/proof.png' }],
}

it('assembles a ZIP with a manifest, per-bill PDF and raw attachments', async () => {
  const deps = {
    fetchAttachment: async () => new Blob(['fake-image-bytes']),
    renderBillPdf: async (b: ArchiveBill) => new Blob([`PDF for ${b.billNumber}`]),
  }
  const zipBlob = await buildArchiveZip([bill], deps)
  expect(zipBlob).toBeInstanceOf(Blob)

  const zip = await JSZip.loadAsync(zipBlob)
  expect(zip.file('index.pdf')).not.toBeNull()
  expect(zip.file('bills/BILL-1.pdf')).not.toBeNull()
  expect(zip.file('attachments/BILL-1/proof.png')).not.toBeNull()

  const pdfText = await zip.file('bills/BILL-1.pdf')!.async('string')
  expect(pdfText).toContain('BILL-1')
})

it('an empty bill list still produces a manifest', async () => {
  const zip = await JSZip.loadAsync(
    await buildArchiveZip([], {
      fetchAttachment: async () => new Blob([]),
      renderBillPdf: async () => new Blob([]),
    }),
  )
  expect(zip.file('index.pdf')).not.toBeNull()
})
