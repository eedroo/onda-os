import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { RelatorioPDF, type RelatorioPDFProps } from '@/components/relatorio/RelatorioPDF'

const PAGE_W_MM = 210
const PAGE_H_MM = 297

export async function gerarRelatorioPDF(params: RelatorioPDFProps): Promise<void> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.zIndex = '-1'
  document.body.appendChild(container)

  const root = createRoot(container)
  root.render(createElement(RelatorioPDF, params))
  // Dá tempo ao React para montar e ao browser para calcular o layout
  // antes de capturar as páginas com html2canvas.
  await new Promise(resolve => setTimeout(resolve, 150))

  try {
    const paginas = Array.from(container.querySelectorAll<HTMLElement>('[data-pdf-page]'))
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    for (let i = 0; i < paginas.length; i++) {
      const canvas = await html2canvas(paginas[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      if (i > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, 0, PAGE_W_MM, PAGE_H_MM)
    }

    const nomeMes = new Date(params.projeto.ano, params.projeto.mes - 1).toLocaleString('pt-PT', { month: 'long' })
    const nomeCliente = params.cliente.empresa.replace(/[^a-zA-Z0-9]+/g, '_')
    pdf.save(`Relatorio_${nomeCliente}_${nomeMes}_${params.projeto.ano}.pdf`)
  } finally {
    root.unmount()
    document.body.removeChild(container)
  }
}
