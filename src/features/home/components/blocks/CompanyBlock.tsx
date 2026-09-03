import { useState } from 'react'
import { Building2, Pencil } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/features/auth/authShared'
import { publicUrl } from '@/features/home/data/home.repository'
import type { CompanyVM } from '@/features/home/home.types'

type SaveInput = Omit<CompanyVM, 'name'>

export function CompanyBlock({
  company,
  editable,
  onSave,
  onUploadLogo,
}: {
  company: CompanyVM
  editable: boolean
  onSave: (input: SaveInput) => Promise<void>
  onUploadLogo: (file: File) => Promise<string>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SaveInput>(strip(company))
  const [logoPath, setLogoPath] = useState(company.logoPath)

  const set = (k: keyof SaveInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      await onSave({ ...form, logoPath })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const logoUrl = publicUrl(logoPath)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[var(--color-neo-text-primary)]">
          <Building2 size={16} />
          {company.name}
        </h2>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => {
              setForm(strip(company))
              setLogoPath(company.logoPath)
              setEditing(true)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-neo-primary)]"
          >
            <Pencil size={14} />Edit
          </button>
        )}
      </div>

      {!editing ? (
        <div className="mt-3 space-y-2 text-sm text-[var(--color-neo-text-secondary)]">
          {logoUrl && <img src={logoUrl} alt="" className="max-h-20 rounded-lg" />}
          {company.tagline && <p className="text-[var(--color-neo-text-primary)]">{company.tagline}</p>}
          {company.about && <p>{company.about}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-[13px]">
            {company.address && <span>{company.address}</span>}
            {company.phone && <span>{company.phone}</span>}
            {company.email && <span>{company.email}</span>}
            {company.hours && <span>{company.hours}</span>}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <Field id="c-tagline" label="Tagline" value={form.tagline} onChange={set('tagline')} />
          <Field id="c-about" label="About" value={form.about} onChange={set('about')} />
          <Field id="c-address" label="Address" value={form.address} onChange={set('address')} />
          <Field id="c-phone" label="Phone" value={form.phone} onChange={set('phone')} />
          <Field id="c-email" label="Email" value={form.email} onChange={set('email')} />
          <Field id="c-hours" label="Hours" value={form.hours} onChange={set('hours')} />
          <label className="mb-4 block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--color-neo-text-primary)]">Logo</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) setLogoPath(await onUploadLogo(f))
              }}
              className="text-xs text-[var(--color-neo-text-secondary)]"
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function strip(c: CompanyVM): SaveInput {
  const { name: _name, ...rest } = c
  return rest
}
