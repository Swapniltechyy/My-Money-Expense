import type { CategoryId } from '../types'
import { useStore } from '../lib/store'
import { resolveCategory } from '../lib/categories'

export function CategoryGlyph({
  category,
  size = 40,
}: {
  category: CategoryId
  size?: number
}) {
  const { data } = useStore()
  const meta = resolveCategory(category, data.customCategories)
  return (
    <span
      className="cat-glyph"
      style={{
        width: size,
        height: size,
        background: `${meta.color}1f`,
        color: meta.color,
        fontSize: size * 0.42,
      }}
      aria-hidden
    >
      {meta.glyph}
    </span>
  )
}
