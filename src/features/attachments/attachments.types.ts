export interface AttachmentVM {
  id: string
  fileName: string
  sizeBytes: number | null
  storagePath: string
  uploadedByName: string | null
  createdAt: string
}
