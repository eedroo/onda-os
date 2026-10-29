import { NextRequest, NextResponse } from 'next/server'
import { gerarRelatorio } from '@/lib/relatorioGenerator'

// Num dia em que gera os 3 relatórios (diário + semanal à segunda + mensal
// no dia 1), isto pode significar 3 chamadas sequenciais ao Gemini — dar
// margem suficiente para não ser cortado a meio pela Vercel.
export const maxDuration = 300

// Um único cron job diário (mantém-se dentro do limite de qualquer plano do
// Vercel) que gera sempre o relatório diário e, nos dias certos, também o
// semanal (segunda-feira) e o mensal (dia 1).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const gerados: string[] = []
  const erros: string[] = []

  async function tentar(tipo: 'diario' | 'semanal' | 'mensal') {
    try {
      await gerarRelatorio(tipo)
      gerados.push(tipo)
    } catch (e) {
      console.error(e)
      erros.push(`${tipo}: ${String(e)}`)
    }
  }

  await tentar('diario')
  if (hoje.getUTCDay() === 1) await tentar('semanal') // segunda-feira
  if (hoje.getUTCDate() === 1) await tentar('mensal') // dia 1 do mês

  return NextResponse.json({ ok: erros.length === 0, gerados, erros })
}
