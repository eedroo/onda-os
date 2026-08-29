'use client'

import { useEffect, useState } from 'react'
import {
  useSensor, useSensors, PointerSensor,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

// Estado e handlers partilhados para um board kanban com múltiplas colunas,
// suportando tanto mover um item entre colunas como reordenar dentro da
// mesma coluna. `onReordenar` só é chamado quando a coluna não muda —
// consumidores sem noção de ordem persistente (ex: leads, propostas) podem
// omiti-lo e só implementar `onMudarColuna`.
export function useKanbanDnd<T>({
  itens, getId, getColuna, colunas, onMudarColuna, onReordenar,
}: {
  itens: T[]
  getId: (item: T) => string
  getColuna: (item: T) => string
  colunas: string[]
  onMudarColuna?: (id: string, novaColuna: string) => void
  onReordenar?: (coluna: string, idsOrdenados: string[]) => void
}) {
  const [grupos, setGrupos] = useState<Record<string, T[]>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => {
    const g: Record<string, T[]> = {}
    colunas.forEach(c => { g[c] = [] })
    itens.forEach(item => {
      const c = getColuna(item)
      if (!g[c]) g[c] = []
      g[c].push(item)
    })
    setGrupos(g)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, colunas.join('|')])

  function encontrarColuna(id: string): string | undefined {
    return Object.keys(grupos).find(c => grupos[c].some(i => getId(i) === id))
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  // Move visualmente o item para a coluna sob o cursor enquanto arrasta,
  // para o board reagir em tempo real (padrão multi-container do dnd-kit).
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const idAtivo = String(active.id)
    const idSobre = String(over.id)
    const colunaAtiva = encontrarColuna(idAtivo)
    const colunaSobre = colunas.includes(idSobre) ? idSobre : encontrarColuna(idSobre)
    if (!colunaAtiva || !colunaSobre || colunaAtiva === colunaSobre) return

    setGrupos(prev => {
      const origem = [...(prev[colunaAtiva] || [])]
      const destino = [...(prev[colunaSobre] || [])]
      const idx = origem.findIndex(i => getId(i) === idAtivo)
      if (idx === -1) return prev
      const [item] = origem.splice(idx, 1)
      const overIdx = destino.findIndex(i => getId(i) === idSobre)
      destino.splice(overIdx >= 0 ? overIdx : destino.length, 0, item)
      return { ...prev, [colunaAtiva]: origem, [colunaSobre]: destino }
    })
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    const idAtivo = String(active.id)
    setActiveId(null)
    if (!over) return
    const idSobre = String(over.id)
    const colunaFinal = colunas.includes(idSobre) ? idSobre : encontrarColuna(idSobre)
    const itemOriginal = itens.find(i => getId(i) === idAtivo)
    if (!colunaFinal || !itemOriginal) return
    const colunaOriginal = getColuna(itemOriginal)

    const listaFinal = grupos[colunaFinal] || []
    const oldIdx = listaFinal.findIndex(i => getId(i) === idAtivo)
    const newIdx = listaFinal.findIndex(i => getId(i) === idSobre)
    const reordenada = oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx ? arrayMove(listaFinal, oldIdx, newIdx) : listaFinal
    if (reordenada !== listaFinal) {
      setGrupos(prev => ({ ...prev, [colunaFinal]: reordenada }))
    }

    if (colunaFinal !== colunaOriginal) {
      onMudarColuna?.(idAtivo, colunaFinal)
    } else {
      onReordenar?.(colunaFinal, reordenada.map(getId))
    }
  }

  return { grupos, activeId, sensors, handleDragStart, handleDragOver, handleDragEnd }
}
