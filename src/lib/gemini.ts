const GEMINI_MODEL = 'gemini-3.8-flash'

interface RespostaGemini {
  secoes: { titulo: string; texto: string }[]
  acoes: { prioridade: 'P1' | 'P2' | 'P3'; texto: string }[]
}

// Sem isto, um Gemini lento ou sem resposta deixava o pedido pendurado
// indefinidamente — o botão "Gerar relatório" ficava a girar para sempre,
// porque o fetch nunca chegava a resolver nem a rejeitar.
const TIMEOUT_MS = 45_000

export async function gerarComGemini(prompt: string): Promise<RespostaGemini> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            // Isto não é raciocínio complexo, é extração/síntese estruturada
            // a partir de dados já tratados — "low" evita o tempo extra do
            // "thinking" (que por omissão é "medium" neste modelo e foi o
            // que levava a chamada a ultrapassar os 45s).
            thinkingConfig: { thinkingLevel: 'low' },
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

  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`)

  const json = await res.json()
  const texto = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!texto) throw new Error('Resposta vazia do Gemini')

  return JSON.parse(texto) as RespostaGemini
}
