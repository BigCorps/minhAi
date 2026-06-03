# Relatório Técnico — Tour Interativo minhAi
## Guia para criação de novas cenas (Stage 2+)

**Autor:** Claude Sonnet 4.6 (Anthropic)  
**Data:** 02 de Junho de 2026  
**Repositório:** BigCorps/minhAi  
**Stack:** Next.js 14/15 (TypeScript), Tailwind CSS, Supabase, Vercel

---

## 1. Visão Geral da Arquitetura

O tour é uma página pública em `/tour` que demonstra as funcionalidades do SaaS minhAi através de uma sequência de cenas narradas por voz com visuais animados. A página **não usa o layout do dashboard** — tem seu próprio `layout.tsx` completamente limpo.

```
app/
  tour/
    layout.tsx          ← layout limpo, fundo slate-950, sem sidebar
    page.tsx            ← renderiza TourStage1 (ou futuro TourManager)

components/
  tour/
    TourStage1.tsx      ← orquestrador do Stage 1
    TourAssistant.tsx   ← AvatarFace + legenda
    TourControls.tsx    ← dots + prev/next/play-pause
    scenes/
      SceneIntro.tsx
      SceneAssistente.tsx
      SceneWidget.tsx
      SceneWhatsApp.tsx
      SceneInstagram.tsx
      SceneMercadoLivre.tsx
      SceneMCP.tsx
      SceneWhatsAppMCP.tsx

lib/
  tour/
    stage1-script.ts    ← roteiro tipado do Stage 1
```

---

## 2. Componente Central: TourStage1

O `TourStage1` é o orquestrador. Ele:

1. Mantém `sceneIndex` (índice da cena atual)
2. Ao pressionar play, chama `runScene(index)` que:
   - Faz fade-out (300ms) → troca o visual → fade-in
   - Chama `playText(scene.audioText)` via `usePlayText` → `/api/google-tts`
   - Aguarda a Promise do TTS resolver (áudio terminou)
   - Espera 1200ms de pausa
   - Avança para a próxima cena automaticamente
3. Expõe controles manuais (prev/next/goTo) que pausam o TTS atual e navegam
4. Passa `isSpeaking` para as cenas que têm avatar embutido

### Hook de voz

```ts
// hooks/usePlayText.ts — já existente no projeto
const { playText, stopAudio } = usePlayText()
// playText(text) → Promise<void> que resolve quando o áudio termina
// stopAudio() → para imediatamente
// Endpoint: POST /api/google-tts  body: { text, speed: 1.05 }
```

---

## 3. Como Criar uma Nova Cena

### Passo 1 — Adicionar ao roteiro

Edite `lib/tour/stage1-script.ts` (ou crie um novo arquivo para outro stage):

```ts
// Adicione um novo SceneId ao union type
export type SceneId =
  | 'intro'
  | 'assistente'
  | ... 
  | 'minha-nova-cena'  // ← adicionar aqui

// Adicione o objeto no array STAGE1_SCRIPT
{
  id: 'minha-nova-cena',
  label: 'Nome curto',          // exibido nos dots de progresso
  audioText: 'Texto que o avatar vai falar nesta cena.',
  fallbackDuration: 7000,       // ms de espera se o TTS falhar
},
```

### Passo 2 — Criar o componente da cena

Crie `components/tour/scenes/SceneMinhaNovaFuncionalidade.tsx`.

**Template mínimo:**

```tsx
'use client'
// components/tour/scenes/SceneMinhaNovaFuncionalidade.tsx

export default function SceneMinhaNovaFuncionalidade() {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none">
      {/* Seu mock visual aqui */}
    </div>
  )
}
```

**Se a cena tiver seu próprio avatar** (como `SceneAssistente`), receba `isSpeaking`:

```tsx
interface Props { isSpeaking: boolean }

export default function SceneMinhaNovaFuncionalidade({ isSpeaking }: Props) {
  // Use isSpeaking para o AvatarFace interno
}
```

### Passo 3 — Registrar no TourStage1

Em `TourStage1.tsx`, há duas coisas para atualizar:

**A) Se a cena tem avatar próprio**, adicione o id em `SCENES_WITH_OWN_AVATAR`:
```ts
const SCENES_WITH_OWN_AVATAR: SceneId[] = ['assistente', 'minha-nova-cena']
```

**B) Adicione o caso no `SceneRenderer`:**
```tsx
case 'minha-nova-cena':
  return <SceneMinhaNovaFuncionalidade />
  // ou: return <SceneMinhaNovaFuncionalidade isSpeaking={isSpeaking} />
```

---

## 4. Padrões de Design das Cenas

### 4.1 Dimensões e responsividade

O container da cena tem:
- `height: clamp(280px, 50vh, 520px)` 
- `maxWidth: 480px`
- `w-full`

Portanto todos os elementos internos devem usar **tamanhos fluidos**:

```tsx
// ✅ Correto — fonte fluida
style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)' }}

// ✅ Correto — ícone fluido
style={{ width: 'clamp(32px, 6vw, 48px)', height: 'clamp(32px, 6vw, 48px)' }}

// ❌ Evitar — tamanho fixo grande
className="text-2xl"
style={{ width: 200 }}
```

### 4.2 Temas visuais por canal

| Canal | Background | Cor principal | Estilo |
|---|---|---|---|
| Tela/Totem | `#0f172a` (slate-950) | `#3b82f6` (blue-500) | Dark, premium |
| Widget | `#f3f4f6` (gray-100) | `#3b82f6` | Light, site real |
| WhatsApp | `#0b141a` / `#202c33` | `#00a884` (verde WA) | Dark, fiel ao app |
| Instagram | `#000` | gradient roxo/laranja | Dark, fiel ao app |
| Mercado Livre | `#fff` / `#f5f5f5` | `#3483fa` / `#fff159` | Light, fiel ao app |
| MCP/Dev | `#fafafa` | `#10a37f` (verde) | Light, neutro |
| WhatsApp MCP | `#0b141a` | `#00a884` + verde | Dark + badge MCP |

### 4.3 Dados fictícios

Use sempre **dados brasileiros verossímeis**:

```
Empresa: "Café Exemplo", "Loja Demo", "Clínica Exemplo"
Telefone: +55 11 99999-0000
Valores: R$ 89,90 / R$ 149,00
Datas: formatadas pt-BR (12/05, 09h30)
Códigos: PIX-4821, SKU-441, PED-9923
```

### 4.4 Não importar componentes reais

Cenas do tour **nunca** importam componentes reais do assistente (`VoiceAssistantWithWakeWord`, `CategoryCarouselWrapper`, `TextAssistant`, modais, etc). Tudo é **mock visual** em JSX puro.

**Exceção:** `AvatarFace` pode ser importado diretamente nas cenas que têm avatar próprio — ele é standalone e aceita `hasActivePlan={true}` para funcionar sem Supabase.

```tsx
import { AvatarFace } from '@/components/AvatarFace'

<AvatarFace
  isSpeaking={isSpeaking}
  isListening={false}
  isProcessing={false}
  theme="dark"
  avatarType={isSpeaking ? 'orb' : 'face'}
  hasActivePlan={true}
  // Não passar companyId, qrCodeData, pixConfirmationData
/>
```

### 4.5 Animações internas

Para sub-ciclos internos (como `SceneAssistente` que cicla entre modos), use `useEffect` + `useState` local:

```tsx
useEffect(() => {
  const id = setTimeout(() => {
    setSubMode(next)
  }, 3000)
  return () => clearTimeout(id)
}, [subMode])
```

Para transições suaves entre sub-estados, use fade via opacity:

```tsx
const [visible, setVisible] = useState(true)
// fade-out → troca estado → fade-in
setVisible(false)
setTimeout(() => { setSubMode(next); setVisible(true) }, 300)

// No JSX:
<div style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms' }}>
```

---

## 5. TourAssistant e Legendas

O `TourAssistant` recebe:

```tsx
<TourAssistant
  isSpeaking={isSpeaking}      // true enquanto TTS estiver tocando
  caption={currentScene.audioText}  // texto completo da cena
  hideAvatar={hideAvatar}      // true nas cenas com avatar próprio
/>
```

Quando `hideAvatar=true`, o avatar some com transição suave (height colapsa + opacity 0) mas a **legenda permanece visível**. Isso garante que o usuário sempre veja o texto sendo narrado, independente da cena.

---

## 6. Adicionando Novos Stages

Para criar um Stage 2 (ex: demonstração de funcionalidades específicas):

1. Crie `lib/tour/stage2-script.ts` com seu próprio `SceneId` e `STAGE2_SCRIPT`
2. Crie `components/tour/TourStage2.tsx` (pode copiar `TourStage1.tsx` como base)
3. Crie as cenas em `components/tour/scenes/`
4. Adicione navegação entre stages no `app/tour/page.tsx`:

```tsx
// app/tour/page.tsx
'use client'
import { useState } from 'react'
import TourStage1 from '@/components/tour/TourStage1'
import TourStage2 from '@/components/tour/TourStage2'

export default function TourPage() {
  const [stage, setStage] = useState(1)
  
  return stage === 1
    ? <TourStage1 onComplete={() => setStage(2)} />
    : <TourStage2 />
}
```

Para isso, `TourStage1` precisaria receber e chamar `onComplete?: () => void` ao terminar a última cena.

---

## 7. SEO

A rota `/tour` já tem metadata definida em `app/tour/layout.tsx`:

```ts
export const metadata: Metadata = {
  title: 'Tour Interativo — minhAi',
  description: 'Veja ao vivo onde o assistente minhAi pode atuar...',
  alternates: { canonical: 'https://www.minhai.app/tour' },
  openGraph: { ... },
}
```

**Lembrar de:**
- Adicionar `/tour` no `app/sitemap.ts` com `priority: 0.9`
- Confirmar que `app/robots.ts` não bloqueia `/tour`

---

## 8. Gravação de Vídeo

A página foi projetada para gravação direta:

- **YouTube (landscape 16:9):** abrir em desktop fullscreen, gravar tela inteira
- **Instagram/Reels (portrait 9:16):** abrir em mobile ou redimensionar browser para ~390×844, gravar

A legenda sempre visível garante que vídeos sem áudio também comuniquem o conteúdo.

Para gravar sem os controles visíveis, pode-se adicionar um parâmetro de URL:
```
/tour?clean=1  → esconde TourControls para gravação
```
(implementação futura — adicionar `const searchParams = useSearchParams()` no TourStage1)

---

## 9. Checklist para novos agentes

Ao receber a tarefa de criar novas cenas para o tour minhAi:

- [ ] Ler este documento completo
- [ ] Adicionar `SceneId` ao union type em `stage1-script.ts`
- [ ] Adicionar objeto `SceneScript` no array `STAGE1_SCRIPT`
- [ ] Criar `components/tour/scenes/SceneNomeDaCena.tsx`
- [ ] Seguir padrões de design da seção 4 (dimensões fluidas, dados fictícios, sem imports de componentes reais)
- [ ] Registrar no `SceneRenderer` dentro de `TourStage1.tsx`
- [ ] Se a cena tem avatar próprio, adicionar em `SCENES_WITH_OWN_AVATAR`
- [ ] Testar fade de entrada/saída
- [ ] Verificar responsividade (portrait mobile + landscape desktop)
