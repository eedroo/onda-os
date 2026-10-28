import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { AuthProvider } from '@/lib/auth'
import AuthGate from '@/components/auth/AuthGate'
import { Toaster } from 'sonner'

// Depois de um novo deploy, um separador que já tinha código antigo em cache
// pode falhar a carregar um chunk JS (inclusive o do próprio layout, durante
// a hidratação inicial) — nesse caso a página fica com o HTML do servidor
// mas sem nenhum evento ligado: parece "travada", qualquer clique não faz
// nada, e não há tempo para um componente React correr, porque é a própria
// hidratação que falhou. Por isso isto corre como script puro, inline, antes
// de qualquer bundle da app — não depende do React ter arrancado.
const SCRIPT_RECUPERACAO_CHUNK = `
(function () {
  var CHAVE = 'onda-chunk-reload-em-curso';
  function pareceErroDeChunk(erro) {
    if (!erro) return false;
    var nome = erro.name || '';
    var mensagem = erro.message || '';
    return nome === 'ChunkLoadError' || /Loading (chunk|CSS chunk) .+ failed/i.test(mensagem);
  }
  function recarregarUmaVez() {
    if (sessionStorage.getItem(CHAVE)) return;
    sessionStorage.setItem(CHAVE, '1');
    location.reload();
  }
  window.addEventListener('error', function (e) { if (pareceErroDeChunk(e.error)) recarregarUmaVez(); });
  window.addEventListener('unhandledrejection', function (e) { if (pareceErroDeChunk(e.reason)) recarregarUmaVez(); });
  setTimeout(function () { sessionStorage.removeItem(CHAVE); }, 5000);
})();
`

export const metadata: Metadata = {
  title: 'Onda OS',
  description: 'Sistema operacional da Onda Digital',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Onda OS',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_RECUPERACAO_CHUNK }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AuthGate>{children}</AuthGate>
          </AuthProvider>
          <Toaster
            theme="system"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
