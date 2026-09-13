import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import webpush from 'web-push'
import { getAdminDb } from '@/lib/firebaseAdmin'

const DESTINATARIO = 'carlinhos686@gmail.com'

interface RespostaEmail { label: string; valor: string | string[] }

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function enviarEmail(nomeAssociado: string, categoriaLabel: string, categoriaIcon: string, linkFicha: string | null, respostas: RespostaEmail[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { console.error('RESEND_API_KEY não configurada'); return false }

  const linhasRespostas = respostas.map(r => `
    <tr>
      <td style="padding:8px 0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(r.label)}</td>
    </tr>
    <tr>
      <td style="padding:0 0 14px;font-size:14px;color:#222;">${escapeHtml(Array.isArray(r.valor) ? (r.valor.join(', ') || '—') : (r.valor || '—'))}</td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="font-size:16px;">${categoriaIcon} Briefing respondido — ${escapeHtml(categoriaLabel)}</h2>
      <p style="font-size:14px;color:#444;">${escapeHtml(nomeAssociado)} acabou de responder ao formulário de briefing.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">${linhasRespostas}</table>
      ${linkFicha ? `<p style="margin-top:16px;"><a href="${linkFicha}" style="font-size:13px;color:#0066ff;">Abrir ficha no Onda OS →</a></p>` : ''}
    </div>
  `

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: 'Onda OS <onboarding@resend.dev>',
      to: DESTINATARIO,
      subject: `Briefing respondido — ${nomeAssociado}`,
      html,
    })
    if (error) { console.error(error); return false }
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}

async function enviarPush(nomeAssociado: string, categoriaLabel: string, categoriaIcon: string, linkFicha: string | null): Promise<number> {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) return 0

  webpush.setVapidDetails(`mailto:${DESTINATARIO}`, vapidPublic, vapidPrivate)

  try {
    const db = getAdminDb()
    const snap = await db.collection('pushSubscriptions').get()
    const payload = JSON.stringify({
      title: `${categoriaIcon} Briefing respondido`,
      body: `${nomeAssociado} — ${categoriaLabel}`,
      url: linkFicha || '/briefings',
    })

    let enviados = 0
    await Promise.all(snap.docs.map(async d => {
      const sub = d.data() as { endpoint: string; keys: { p256dh: string; auth: string } }
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        enviados++
      } catch (e: unknown) {
        const statusCode = (e as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) await d.ref.delete()
        else console.error(e)
      }
    }))
    return enviados
  } catch (e) {
    console.error(e)
    return 0
  }
}

export async function POST(req: NextRequest) {
  const { nomeAssociado, categoriaLabel, categoriaIcon, linkFicha, respostas } = await req.json() as {
    nomeAssociado: string; categoriaLabel: string; categoriaIcon: string
    linkFicha: string | null; respostas: RespostaEmail[]
  }

  if (!nomeAssociado || !categoriaLabel || !Array.isArray(respostas)) {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 })
  }

  const [emailEnviado, pushEnviados] = await Promise.all([
    enviarEmail(nomeAssociado, categoriaLabel, categoriaIcon, linkFicha, respostas),
    enviarPush(nomeAssociado, categoriaLabel, categoriaIcon, linkFicha),
  ])

  return NextResponse.json({ ok: true, emailEnviado, pushEnviados })
}
