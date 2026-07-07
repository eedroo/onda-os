# 🌊 Onda OS v2

Sistema operacional da Onda Digital.

---

## 🚀 Deploy em 4 passos (sem terminal)

### Passo 1 — Criar projeto Firebase

1. Vai a [console.firebase.google.com](https://console.firebase.google.com)
2. Clica **Add project** → nome: `onda-os`
3. Desativa Google Analytics (não precisas) → **Create project**
4. No menu lateral clica **Firestore Database** → **Create database**
   - Escolhe **Start in test mode** → **Next** → **Enable**
5. No menu lateral clica **Project settings** (ícone ⚙️)
6. Em **Your apps** clica o ícone `</>` (Web)
   - App nickname: `onda-os-web` → **Register app**
   - Copia o objeto `firebaseConfig` — vais precisar no Passo 3

---

### Passo 2 — Colocar código no GitHub

1. Vai a [github.com](https://github.com) → **New repository**
   - Nome: `onda-os` → **Private** → **Create repository**
2. Na página do repo clica **uploading an existing file**
3. Arrasta **todos os ficheiros** desta pasta (excepto `node_modules`)
4. Clica **Commit changes**

---

### Passo 3 — Deploy no Vercel

1. Vai a [vercel.com](https://vercel.com) → **Sign Up with GitHub**
2. Clica **Add New Project** → seleciona o repo `onda-os`
3. Clica **Environment Variables** e adiciona estas 6 variáveis
   (com os valores do `firebaseConfig` que copiaste no Passo 1):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

4. Clica **Deploy** — aguarda ~2 minutos
5. O teu link aparece: `onda-os-xxx.vercel.app` 🎉

---

### Passo 4 — Ligar o teu subdomínio

1. No Vercel vai a **Settings → Domains**
2. Adiciona o teu subdomínio: ex. `os.ondadigital.pt`
3. O Vercel dá-te um valor CNAME
4. Vai ao painel da tua hospedagem → DNS → adiciona o registo CNAME
5. Aguarda 5-10 min → o teu subdomínio está ativo ✅

---

## 📁 Estrutura

```
src/
├── app/              # Páginas
│   ├── page.tsx      # Home (funcional)
│   ├── leads/        # Leads Kanban (funcional)
│   └── ...           # Restantes (em desenvolvimento)
├── components/
│   ├── layout/       # Sidebar
│   └── shared/       # Componentes partilhados
└── lib/
    ├── firebase.ts   # Configuração Firebase
    └── db.ts         # Todas as operações de dados
```

## 🛠 Stack

- **Next.js 14** — Framework React
- **Firebase Firestore** — Base de dados
- **Tailwind CSS** — Estilos
- **Vercel** — Deploy
