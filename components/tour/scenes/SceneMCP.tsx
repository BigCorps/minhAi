'use client'
// components/tour/scenes/SceneMCP.tsx
// Chat branco genérico com card de tool call MCP.
// Os logos de Claude, ChatGPT, Cursor e Manus aparecem em rotação.

import { useEffect, useState } from 'react'

// ── Ícones SVG ────────────────────────────────────────────────────────────────
function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  )
}

function CursorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 1.5L21.5 8.5L12.5 11.5L9.5 20.5L4.5 1.5Z" />
    </svg>
  )
}

function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.74 19.946a4.5 4.5 0 0 1-6.14-1.642zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.075 14.02A4.5 4.5 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387 2.02-1.168a.076.076 0 0 1 .071 0l4.742 2.738a4.5 4.5 0 0 1-.695 8.118v-5.681a.79.79 0 0 0-.305-.62zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.74-2.738a4.5 4.5 0 0 1 6.69 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  )
}

function ManusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd">
      <g transform="scale(32)">
        <clipPath id="manus-clip">
          <path d="M0 0h16v16H0z"/>
        </clipPath>
        <g clipPath="url(#manus-clip)">
          <path d="M5.365.775a.627.627 0 01.604-.782c.287 0 .54.2.606.48.042.17.088.338.134.506l.003.011c.105.387.21.773.277 1.18a.628.628 0 01-.615.726.626.626 0 01-.616-.522c-.057-.345-.135-.633-.23-.982v-.001c-.05-.183-.105-.382-.163-.616zm-2.918 1.06a.627.627 0 00.285.835c.445.218.83.433 1.212.863a.624.624 0 00.933-.828c-.544-.613-1.104-.914-1.596-1.155a.627.627 0 00-.834.285zM10.448 14.19c-.113-.025-.237-.05-.364-.079-.467-.101-1.1-.243-1.398-.342l-.022-.007-.021-.008a6.875 6.875 0 00-.727-.189l-.069-.015c-.32-.073-.713-.163-1.086-.275-.386-.118-.863-.292-1.269-.575-.425-.297-.91-.821-.936-1.608a3.215 3.215 0 01.006-.34 1.814 1.814 0 01-.433-.827 1.755 1.755 0 01.02-.85c.055-.211.14-.396.21-.533.024-.047.049-.093.074-.137a8.607 8.607 0 01-.756-.275c-.335-.143-.812-.38-1.168-.76a1.867 1.867 0 01-.473-.885 1.7 1.7 0 01.15-1.12c.403-.806 1.172-1.09 1.855-1.115.618-.022 1.275.15 1.864.357.536.188 1.303.538 1.955.843.215-.353.498-.75.766-1.072l.053-.063.062-.056a2.285 2.285 0 011.373-.592c.237-.017.475.001.706.054l.024.005.015.005h.004l-.318 1.191.319-1.19.139.038.126.068c.643.344.826.937.874 1.25.03.2.028.403-.006.603l-.002.012v.003l-1.238-.247 1.238.248-.007.036-.2.793a1.649 1.649 0 00-.041.365.186.186 0 00.01.071c.009.02.029.064.103.176l.096.143.039.056c.053.078.116.171.182.274.416.647.456 1.268.454 1.666v.018l.158.052.069.021.102.033c.05.016.115.037.178.06.073-.135.271-.424.63-.424.468 0 .66.658.66.658.183 1.225-.653 5.342-1.863 6.109-.924.587-1.608-.285-2.117-1.625zM5.813 8.578c.079-.08.314-.247.758-.297a2.893 2.893 0 011.485.243c.415.184.702.606.822 1.112.059.247.07.487.044.683-.027.207-.085.31-.113.34-.033.04-.152.105-.48.036a2.262 2.262 0 01-.51-.177l-.004-.002a.627.627 0 00-.903.559c0 .229.127.44.33.549l.002.001.021.01a3.547 3.547 0 00.804.28c.41.087 1.167.153 1.68-.435.247-.282.366-.653.41-1a3.199 3.199 0 00-.066-1.132c-.179-.752-.651-1.574-1.532-1.965a4.145 4.145 0 00-2.13-.342 3.11 3.11 0 00-1.126.336l-.014-.004H5.29C4.5 7.149 2.93 6.701 3.318 5.927c.293-.586 1.095-.538 2.183-.156.442.155 1.056.432 1.636.701.18.083.356.167.522.245l.65.302c.462-.554.641-.86.8-1.13.108-.185.208-.353.382-.574l.016-.022.098-.12.013-.011c.428-.378.926-.24.926-.24.285.152.212.537.212.537l-.197.786c-.19.924.02 1.23.364 1.733.06.089.126.183.194.289.274.428.261.84.251 1.176-.007.216-.013.402.06.54.15.283.707.46 1.073.574.088.028.165.052.222.074l.04.015c-.052.16-.099.326-.146.491-.208.736-.415 1.468-1.033 1.687-.421.15-.842.143-1.14.104-.524-.113-1.144-.253-1.377-.33-.242-.09-.581-.167-.95-.251-.877-.2-1.922-.438-2.22-.975a.65.65 0 01-.084-.298c-.017-.493.156-.936.156-.936s-.268.001-.456-.18a.567.567 0 01-.159-.287.892.892 0 01-.017-.294c.006 0 .008-.005.008-.018 0-.156.156-.468.468-.78zM9.385.403a.627.627 0 01.21.856c-.237.39-.374.788-.524 1.388a.626.626 0 01-.607.479.627.627 0 01-.604-.782c.162-.647.336-1.185.668-1.732a.627.627 0 01.857-.21z"/>
        </g>
      </g>
    </svg>
  )
}

// ── Dados das plataformas ─────────────────────────────────────────────────────
const LOGOS = [
  {
    name: 'Claude',
    color: '#c96a2d',
    bgLight: '#fff7ed',
    iconBg: '#c96a2d',        // fundo do círculo = color
    icon: <ClaudeIcon className="w-5 h-5" />,
  },
  {
    name: 'ChatGPT',
    color: '#10a37f',
    bgLight: '#f0fdf4',
    iconBg: '#10a37f',
    icon: <ChatGPTIcon className="w-5 h-5" />,
  },
  {
    name: 'Cursor',
    color: '#334155',
    bgLight: '#f8fafc',
    iconBg: '#334155',
    icon: <CursorIcon className="w-5 h-5" />,
  },
  {
    name: 'Manus',
    color: '#1e293b',
    bgLight: '#f8fafc',
    iconBg: '#ffffff',        // ← fundo branco só pro Manus
    icon: <ManusIcon className="w-5 h-5" />,
  },
]

// ── Sequência de ferramentas reais ────────────────────────────────────────────
const TOOL_SCENES = [
  {
    userMsg: 'Gerar um PIX de R$ 150,00 para o cliente João.',
    toolName: 'minhai · gerar_pix',
    toolArgs: [{ label: 'valor', value: '150.00' }, { label: 'descricao', value: 'Pagamento João' }],
    response: '💰 PIX Gerado! R$ 150,00\n📷 QR Code disponível\nCópia e cola: 00020126...',
    accentColor: '#16a34a',
    accentBg: '#f0fdf4',
    accentBorder: '#bbf7d0',
  },
  {
    userMsg: 'Consulta o CPF 123.456.789-09',
    toolName: 'minhai · consultar_cpf',
    toolArgs: [{ label: 'cpf', value: '123.456.789-09' }, { label: 'data_nasc.', value: '15/03/1985' }],
    response: '👤 Consulta CPF\n\nNome: JOÃO DA SILVA\nSituação: Regular\nData nasc.: 15/03/1985',
    accentColor: '#2563eb',
    accentBg: '#eff6ff',
    accentBorder: '#bfdbfe',
  },
  {
    userMsg: 'Verifica se esse boleto é fraude: 23793.38128 60007.827136 95000.063305 5 94350000015000',
    toolName: 'minhai · identificar_fraude',
    toolArgs: [{ label: 'conteudo', value: '23793.38128...' }],
    response: '✅ LEGÍTIMO — Score: 8/100\n\nBoleto verificado. Emissor válido. Pode pagar com segurança.',
    accentColor: '#16a34a',
    accentBg: '#f0fdf4',
    accentBorder: '#bbf7d0',
  },
]

export default function SceneMCP() {
  const [activeLogo, setActiveLogo]   = useState(0)
  const [activeTool, setActiveTool]   = useState(0)
  const [phase, setPhase]             = useState<'user' | 'tool' | 'response'>('user')

  // Rotaciona logo a cada 1.8s
  useEffect(() => {
    const t = setInterval(() => setActiveLogo(p => (p + 1) % LOGOS.length), 1800)
    return () => clearInterval(t)
  }, [])

  // Anima as fases: user → tool → response → (próxima ferramenta)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    if (phase === 'user') {
      t = setTimeout(() => setPhase('tool'), 1200)
    } else if (phase === 'tool') {
      t = setTimeout(() => setPhase('response'), 1200)
    } else {
      // response: espera 2.5s e avança para próxima ferramenta
      t = setTimeout(() => {
        setActiveTool(p => (p + 1) % TOOL_SCENES.length)
        setPhase('user')
      }, 2500)
    }
    return () => clearTimeout(t)
  }, [phase, activeTool])

  const logo  = LOGOS[activeLogo]
  const scene = TOOL_SCENES[activeTool]

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#fafafa' }}
    >
      {/* ── Header com logo rotativo ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b"
        style={{ borderColor: '#e5e7eb', background: '#fff' }}
      >
        <div
          className="rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-500"
          style={{ width: 32, height: 32, background: logo.iconBg, color: logo.iconBg === '#ffffff' ? logo.color : 'white' }}
        >
          {logo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-none transition-all duration-300" style={{ color: '#111' }}>
            {logo.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">minhAi MCP conectado</p>
        </div>
        <div
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0"
          style={{ background: '#ecfdf5', color: '#059669' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          MCP ativo
        </div>
      </div>

      {/* ── Conversa ── */}
      <div className="flex-1 flex flex-col justify-end gap-3 px-4 py-4 overflow-hidden">

        {/* Mensagem do usuário */}
        {(phase === 'user' || phase === 'tool' || phase === 'response') && (
          <div className="flex justify-end">
            <div
              className="rounded-2xl rounded-tr-sm px-3 py-2 max-w-[78%]"
              style={{ background: '#e5e7eb', fontSize: 'clamp(0.68rem, 1.7vw, 0.8rem)', color: '#111' }}
            >
              {scene.userMsg}
            </div>
          </div>
        )}

        {/* Tool call card */}
        {(phase === 'tool' || phase === 'response') && (
          <div
            className="rounded-xl border px-3 py-2.5 flex flex-col gap-1.5"
            style={{ background: scene.accentBg, borderColor: scene.accentBorder }}
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke={scene.accentColor} strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-mono" style={{ color: scene.accentColor }}>{scene.toolName}</span>
            </div>
            {scene.toolArgs.map((arg, i) => (
              <div key={i} className="font-mono text-xs text-gray-500 pl-5">
                {arg.label}: <span className="text-gray-800">{arg.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Resposta do assistente */}
        {phase === 'response' && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-tl-sm px-3 py-2 max-w-[82%] whitespace-pre-line"
              style={{ background: '#fff', border: '1px solid #e5e7eb', fontSize: 'clamp(0.68rem, 1.7vw, 0.8rem)', color: '#111' }}
            >
              {scene.response}
            </div>
          </div>
        )}
      </div>

      {/* ── Indicador de ferramenta ativa ── */}
      <div
        className="flex items-center justify-center gap-1.5 px-4 py-2 border-t flex-shrink-0"
        style={{ borderColor: '#e5e7eb', background: '#fff' }}
      >
        {TOOL_SCENES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeTool ? 16 : 6,
              height: 6,
              background: i === activeTool ? scene.accentColor : '#d1d5db',
            }}
          />
        ))}
      </div>

      {/* ── Logos dos apps embaixo ── */}
      <div
        className="flex items-center justify-center gap-3 px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: '#e5e7eb', background: '#fff' }}
      >
        {LOGOS.map((l, i) => (
          <div
            key={l.name}
            className="flex flex-col items-center gap-1 transition-all duration-300"
            style={{ opacity: i === activeLogo ? 1 : 0.3 }}
          >
            <div
              className="rounded-lg flex items-center justify-center"
              style={{ width: 28, height: 28, background: l.iconBg, color: l.iconBg === '#ffffff' ? l.color : 'white' }}
            >
              {l.icon}
            </div>
            <span className="text-gray-400" style={{ fontSize: '0.6rem' }}>
              {l.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
