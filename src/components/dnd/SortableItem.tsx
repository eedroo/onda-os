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
  }
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
      {children}
    </div>
  )
}
