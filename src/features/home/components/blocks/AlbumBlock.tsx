import { useRef, useState } from 'react'
import { Image as ImageIcon, Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/features/auth/authShared'
import { publicUrl } from '@/features/home/data/home.repository'
import type { GalleryImageVM } from '@/features/home/home.types'

export interface AlbumActions {
  add: (input: { caption: string; imagePath: string; sortOrder?: number }) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
  swapOrder: (a: GalleryImageVM, b: GalleryImageVM) => Promise<unknown>
  updateCaption: (id: string, caption: string) => Promise<unknown>
  uploadImage: (file: File) => Promise<string>
}

export function AlbumBlock({
  images,
  editable,
  actions,
}: {
  images: GalleryImageVM[]
  editable: boolean
  actions: AlbumActions
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const ordered = images.slice().sort((a, b) => a.sortOrder - b.sortOrder)

  const move = (item: GalleryImageVM, dir: -1 | 1) => {
    const i = ordered.findIndex((x) => x.id === item.id)
    const other = ordered[i + dir]
    if (other) void actions.swapOrder(item, other)
  }

  const onPick = async (file: File) => {
    setUploading(true)
    try {
      const path = await actions.uploadImage(file)
      await actions.add({ caption: '', imagePath: path, sortOrder: ordered.length })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const saveCaption = async (id: string) => {
    await actions.updateCaption(id, caption)
    setEditingId(null)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[var(--color-neo-text-primary)]">
          <ImageIcon size={16} />
          Album
        </h2>
        {editable && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-neo-primary)]">
            <Plus size={14} />
            {uploading ? 'Uploading…' : 'Add image'}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onPick(f)
              }}
            />
          </label>
        )}
      </div>

      {ordered.length === 0 && (
        <p className="mt-4 text-sm text-[var(--color-neo-text-secondary)]">No images yet.</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ordered.map((item) => {
          const url = publicUrl(item.imagePath)
          return (
            <figure
              key={item.id}
              className="overflow-hidden rounded-xl bg-[var(--color-neo-bg)] shadow-[var(--shadow-neo-soft)]"
            >
              {url && <img src={url} alt={item.caption ?? ''} className="h-32 w-full object-cover" />}
              <figcaption className="p-2">
                {editable && editingId === item.id ? (
                  <div>
                    <Field
                      id={`cap-${item.id}`}
                      label="Caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button type="button" variant="primary" onClick={() => saveCaption(item.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-neo-text-secondary)]">{item.caption}</p>
                )}
                {editable && editingId !== item.id && (
                  <div className="mt-1 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Move image ${item.id} up`}
                      onClick={() => move(item, -1)}
                      className="rounded-md p-1 text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)]"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move image ${item.id} down`}
                      onClick={() => move(item, 1)}
                      className="rounded-md p-1 text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)]"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCaption(item.caption ?? '')
                        setEditingId(item.id)
                      }}
                      className="ml-auto flex items-center gap-1 text-xs font-semibold text-[var(--color-neo-primary)]"
                    >
                      <Pencil size={12} />Edit caption
                    </button>
                    <button
                      type="button"
                      onClick={() => void actions.remove(item.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-[var(--color-neo-danger)]"
                    >
                      <Trash2 size={12} />Delete
                    </button>
                  </div>
                )}
              </figcaption>
            </figure>
          )
        })}
      </div>
    </Card>
  )
}
