import { ChevronLeft, ChevronRight } from 'lucide-react'
import { memo } from 'react'

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export const Pagination = memo(function Pagination({ onPageChange, page, pageSize, total }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (totalPages <= 1) return null

  return (
    <div className="rp-pagination">
      <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Página anterior">
        <ChevronLeft size={16} />
      </button>
      <span>{page} / {totalPages}</span>
      <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="Página siguiente">
        <ChevronRight size={16} />
      </button>
    </div>
  )
})
