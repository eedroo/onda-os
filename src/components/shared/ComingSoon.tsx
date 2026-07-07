import { Construction } from 'lucide-react'

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-sky-950 flex items-center justify-center">
        <Construction size={24} className="text-accent-blue" />
      </div>
      <div className="text-center">
        <div className="text-[16px] font-medium text-text-primary mb-1">{title}</div>
        <div className="text-[13px] text-text-muted">Esta página está a ser construída.</div>
      </div>
      <span className="pill pill-blue">Em desenvolvimento</span>
    </div>
  )
}
