import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlbumBlock } from '@/features/home/components/blocks/AlbumBlock'
import type { GalleryImageVM } from '@/features/home/home.types'

const img = (o: Partial<GalleryImageVM>): GalleryImageVM => ({
  id: 'x', caption: 'A photo', imagePath: 'gallery/x.png', sortOrder: 0, ...o,
})

const actions = {
  add: vi.fn().mockResolvedValue('new'),
  remove: vi.fn().mockResolvedValue(undefined),
  swapOrder: vi.fn().mockResolvedValue(undefined),
  updateCaption: vi.fn().mockResolvedValue(undefined),
  uploadImage: vi.fn().mockResolvedValue('gallery/new.png'),
}
beforeEach(() => vi.clearAllMocks())

it('renders the gallery images with captions and no controls for viewers', () => {
  render(
    <AlbumBlock
      images={[img({ id: '1', caption: 'First' }), img({ id: '2', caption: 'Second' })]}
      editable={false}
      actions={actions}
    />,
  )
  expect(screen.getByText('First')).toBeInTheDocument()
  expect(screen.getByText('Second')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
})

it('admin can edit a caption inline', async () => {
  render(<AlbumBlock images={[img({ id: '1', caption: 'Old' })]} editable actions={actions} />)
  await userEvent.click(screen.getByRole('button', { name: /edit caption/i }))
  const input = screen.getByLabelText(/caption/i)
  await userEvent.clear(input)
  await userEvent.type(input, 'New caption')
  await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
  expect(actions.updateCaption).toHaveBeenCalledWith('1', 'New caption')
})

it('admin can delete an image', async () => {
  render(<AlbumBlock images={[img({ id: '1' })]} editable actions={actions} />)
  await userEvent.click(screen.getByRole('button', { name: /delete/i }))
  expect(actions.remove).toHaveBeenCalledWith('1')
})
