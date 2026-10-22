const GEMINI_MODEL = 'gemini-2.0-flash'

interface RespostaGemini {
  secoes: { titulo: string; texto: string }[]
  acoes: { prioridade: 'P1' | 'P2' | 'P3'; texto: string }[]
}

export async function gerarComGemini(prompt: string): Promise<RespostaGemini> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
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

  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`)

  const json = await res.json()
  const texto = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!texto) throw new Error('Resposta vazia do Gemini')

  return JSON.parse(texto) as RespostaGemini
}
