import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { gerarRelatorio } from '@/lib/relatorioGenerator'

const TIPOS_VALIDOS = ['diario', 'semanal', 'mensal'] as const

async function autorizado(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer /, '')
  if (!token) return false
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true
  try {
    getAdminDb() // garante a app Admin inicializada antes de usar getAuth()
    await getAuth().verifyIdToken(token)
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!(await autorizado(req))) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 })
  }

  const { tipo } = await req.json() as { tipo?: string }
  if (!tipo || !TIPOS_VALIDOS.includes(tipo as typeof TIPOS_VALIDOS[number])) {
    return NextResponse.json({ ok: false, erro: 'tipo inválido' }, { status: 400 })
  }

  try {
    const relatorio = await gerarRelatorio(tipo as typeof TIPOS_VALIDOS[number])
    return NextResponse.json({ ok: true, relatorio })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, erro: String(e) }, { status: 500 })
  }
}
