import { useMutation, useQueryClient } from '@tanstack/react-query'
import { homeRepository } from '@/features/home/data/home.repository'
import type {
  BlockType,
  CompanyVM,
  HomeBlockVM,
  ProductVM,
  PromotionVM,
} from '@/features/home/home.types'

type ListTable = 'products' | 'promotions' | 'gallery_images'

export function useHomeMutations() {
  const qc = useQueryClient()
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['home'] })

  const setBlockVisible = useMutation({
    mutationFn: (v: { type: BlockType; isVisible: boolean }) =>
      homeRepository.setBlockVisible(v.type, v.isVisible),
    onSuccess,
  })
  const swapBlockOrder = useMutation({
    mutationFn: (v: { a: HomeBlockVM; b: HomeBlockVM }) => homeRepository.swapBlockOrder(v.a, v.b),
    onSuccess,
  })
  const saveCompany = useMutation({
    mutationFn: (v: Omit<CompanyVM, 'name'>) => homeRepository.saveCompany(v),
    onSuccess,
  })
  const upsertProduct = useMutation({
    mutationFn: (v: Partial<ProductVM> & { id?: string }) => homeRepository.upsertProduct(v),
    onSuccess,
  })
  const deleteProduct = useMutation({
    mutationFn: (id: string) => homeRepository.deleteProduct(id),
    onSuccess,
  })
  const upsertPromotion = useMutation({
    mutationFn: (v: Partial<PromotionVM> & { id?: string }) => homeRepository.upsertPromotion(v),
    onSuccess,
  })
  const deletePromotion = useMutation({
    mutationFn: (id: string) => homeRepository.deletePromotion(id),
    onSuccess,
  })
  const addGalleryImage = useMutation({
    mutationFn: (v: { caption: string; imagePath: string; sortOrder?: number }) =>
      homeRepository.addGalleryImage(v),
    onSuccess,
  })
  const updateGalleryCaption = useMutation({
    mutationFn: (v: { id: string; caption: string }) =>
      homeRepository.updateGalleryCaption(v.id, v.caption),
    onSuccess,
  })
  const deleteGalleryImage = useMutation({
    mutationFn: (id: string) => homeRepository.deleteGalleryImage(id),
    onSuccess,
  })
  const swapListOrder = useMutation({
    mutationFn: (v: {
      table: ListTable
      a: { id: string; sortOrder: number }
      b: { id: string; sortOrder: number }
    }) => homeRepository.swapListOrder(v.table, v.a, v.b),
    onSuccess,
  })
  const uploadImage = useMutation({
    mutationFn: (v: { file: File; kind: 'product' | 'promo' | 'gallery' | 'logo' }) =>
      homeRepository.uploadImage(v.file, v.kind),
  })

  return {
    setBlockVisible,
    swapBlockOrder,
    saveCompany,
    upsertProduct,
    deleteProduct,
    upsertPromotion,
    deletePromotion,
    addGalleryImage,
    updateGalleryCaption,
    deleteGalleryImage,
    swapListOrder,
    uploadImage,
  }
}
