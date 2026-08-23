'use client'

import { Suspense, useState, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { leadsService, type LeadStatus, type Origem, type PlanoRec } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

const ORIGENS: { id: Origem; label: string }[] = [
  { id: 'INSTAGRAM', label: 'Instagram' }, { id: 'LANDING', label: 'Landing page' },
  { id: 'INDICACAO', label: 'Indicação' }, { id: 'COLD', label: 'Cold outreach' }, { id: 'OUTRO', label: 'Outro' },
]
const PLANOS: { id: PlanoRec; label: string }[] = [
  { id: 'ONE', label: 'One' }, { id: 'PRESENCE', label: 'Presence' }, { id: 'GROWTH', label: 'Growth' }, { id: 'PERSONALIZADO', label: 'Personalizado' },
]

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

function NovoLeadForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusInicial = (searchParams.get('status') as LeadStatus) || 'NOVO'

  const [empresa, setEmpresa] = useState('')
  const [contacto, setContacto] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [origem, setOrigem] = useState<Origem>('INSTAGRAM')
  const [planoRec, setPlanoRec] = useState<PlanoRec | ''>('')
  const [score, setScore] = useState(1)
  const [proximaAcao, setProximaAcao] = useState('')
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)

  const valido = empresa.trim().length > 0

  async function guardar() {
    if (!valido) return
    setSalvando(true)
    try {
      const id = await leadsService.create({
        empresa: empresa.trim(), contacto: contacto.trim() || undefined, email: email.trim() || undefined,
        telefone: telefone.trim() || undefined, website: website.trim() || undefined, instagram: instagram.trim() || undefined,
        origem, status: statusInicial, planoRec: planoRec || undefined, score,
        proximaAcao: proximaAcao.trim() || undefined, notas: notas.trim() || undefined,
      })
      router.push(`/leads/${id}`)
    } catch (e) { console.error(e) }
    finally { setSalvando(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Novo lead" onBack={() => router.back()} />

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div className="card" style={{ padding: 20, maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Empresa *</label>
            <input className="input" value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Nome da empresa" autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>Contacto</label><input className="input" value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Nome da pessoa" /></div>
            <div><label style={labelStyle}>Telefone</label><input className="input" value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>Email</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><label style={labelStyle}>Website</label><input className="input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></div>
          </div>

          <div><label style={labelStyle}>Instagram</label><input className="input" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@utilizador" /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Origem</label>
              <select className="select" value={origem} onChange={e => setOrigem(e.target.value as Origem)}>
                {ORIGENS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Plano recomendado</label>
              <select className="select" value={planoRec} onChange={e => setPlanoRec(e.target.value as PlanoRec)}>
                <option value="">—</option>
                {PLANOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Score inicial</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setScore(n)}
                  style={{ width: 30, height: 30, borderRadius: 6, border: score === n ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: score === n ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: score === n ? 'var(--accent-blue)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div><label style={labelStyle}>Próxima ação</label><input className="input" value={proximaAcao} onChange={e => setProximaAcao(e.target.value)} placeholder="Ex: Ligar amanhã" /></div>

          <div><label style={labelStyle}>Notas</label><textarea className="input" rows={3} value={notas} onChange={e => setNotas(e.target.value)} style={{ resize: 'vertical' }} /></div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
            <button onClick={() => router.back()} className="btn btn-ghost">Cancelar</button>
            <button onClick={guardar} disabled={!valido || salvando} className="btn btn-primary" style={{ opacity: (!valido || salvando) ? 0.6 : 1 }}>
              {salvando ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NovoLeadPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>}>
      <NovoLeadForm />
    </Suspense>
  )
}
