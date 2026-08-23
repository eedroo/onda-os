import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  onBack,
  actions,
}: {
  title: ReactNode
  subtitle?: string
  icon?: LucideIcon
  onBack?: () => void
  actions?: ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: subtitle ? 'flex-start' : 'center', justifyContent: 'space-between',
      gap: 16, padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-surface)', flexShrink: 0, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {onBack && (
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '4px 8px', flexShrink: 0 }}>
            <ArrowLeft size={14} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 19, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {Icon && <Icon size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  )
}
