'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function SortableItem({ id, children, disabled }: { id: string; children: ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    cursor: disabled ? 'default' : 'grab',
    // Sem isto, o toque num cartão fica ambíguo entre "arrastar" e "scroll
    // nativo da página" em touchscreens — o browser e o dnd-kit disputam o
    // gesto, o que pode deixar o toque preso e a página a parecer travada.
    touchAction: disabled ? undefined : 'none',
  }
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
      {children}
    </div>
  )
}
