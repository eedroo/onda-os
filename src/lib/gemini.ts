// gemini-3.8-flash estava a devolver 503 "high demand" de forma consistente
// (confirmado por testes directos à API, fora desta app) — gemini-2.5-flash
// é o que as outras integrações Gemini desta conta já usam de forma
// estável, por isso ficamos com ele em vez de perseguir o modelo mais
// recente.
const GEMINI_MODEL = 'gemini-2.5-flash'

interface RespostaGemini {
  secoes: { titulo: string; texto: string }[]
  acoes: { prioridade: 'P1' | 'P2' | 'P3'; texto: string }[]
}

// Sem isto, um Gemini lento ou sem resposta deixava o pedido pendurado
// indefinidamente — o botão "Gerar relatório" ficava a girar para sempre,
// porque o fetch nunca chegava a resolver nem a rejeitar.
const TIMEOUT_MS = 25_000
// 503 "high demand" é um erro transitório que a própria Google recomenda
// resolver com retry — uma segunda tentativa, com uma pequena pausa, chega
// para a maioria dos casos sem arriscar o limite de tempo da função.
const TENTATIVAS = 2
const BACKOFF_MS = 3_000

async function pedirAoGemini(prompt: string): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                secoes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { titulo: { type: 'string' }, texto: { type: 'string' } },
                    required: ['titulo', 'texto'],
                  },
                },
                acoes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      prioridade: { type: 'string', enum: ['P1', 'P2', 'P3'] },
                      texto: { type: 'string' },
                    },
                    required: ['prioridade', 'texto'],
                  },
                },
              },
              required: ['secoes', 'acoes'],
            },
          },
        }),
      }
    )
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Gemini não respondeu em ${TIMEOUT_MS / 1000}s`)
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

export async function gerarComGemini(prompt: string): Promise<RespostaGemini> {
  let res: Response | null = null
  let ultimoErro: unknown = null

  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      res = await pedirAoGemini(prompt)
      if (res.ok || res.status !== 503) break
      ultimoErro = new Error(`Gemini API error: ${res.status} ${await res.text()}`)
    } catch (e) {
      ultimoErro = e
      res = null
    }
    if (tentativa < TENTATIVAS) await new Promise(r => setTimeout(r, BACKOFF_MS))
  }

  if (!res) throw ultimoErro
  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`)

  const json = await res.json()
  const texto = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!texto) throw new Error('Resposta vazia do Gemini')

  return JSON.parse(texto) as RespostaGemini
}
