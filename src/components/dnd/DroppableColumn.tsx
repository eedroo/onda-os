'use client'

import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

export function DroppableColumn({ id, items, children }: {
  id: string
  items: string[]
  children: (isOver: boolean) => ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <SortableContext items={items} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef}>{children(isOver)}</div>
    </SortableContext>
  )
}
