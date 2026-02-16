'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function KioskGuidePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const router = useRouter();

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {/* Botão de Toggle de Tema */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={`fixed top-6 right-6 z-50 p-3 rounded-full backdrop-blur-xl border transition-all hover:scale-110 ${
          theme === 'dark'
            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
        }`}
      >
        {theme === 'dark' ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="container mx-auto py-6 md:py-12 w-full max-w-4xl px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className={`p-2 rounded-lg transition-all ${
              theme === 'dark'
                ? 'hover:bg-white/10 text-white'
                : 'hover:bg-black/5 text-black'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className={`text-2xl md:text-3xl font-bold transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            🔒 Modo Kiosk - Guia Completo
          </h1>
          <div className="w-10" />
        </div>

        {/* Alert Box */}
        <div className={`mb-6 p-4 rounded-lg border transition-colors ${
          theme === 'dark'
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start gap-3">
            <svg className={`h-6 w-6 shrink-0 mt-1 ${
              theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className={`font-semibold ${
                theme === 'dark' ? 'text-yellow-100' : 'text-yellow-900'
              }`}>
                ⚠️ Bloqueio Total Recomendado
              </p>
              <p className={`text-sm mt-1 ${
                theme === 'dark' ? 'text-yellow-200' : 'text-yellow-700'
              }`}>
                O modo Kiosk via navegador tem limitações. Para segurança máxima em ambientes públicos, configure o <strong>Modo Kiosk no Sistema Operacional</strong> seguindo as instruções abaixo.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className={`rounded-2xl shadow-xl p-6 md:p-8 transition-colors ${
          theme === 'dark' 
            ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10' 
            : 'bg-white'
        }`}>
          <div className="h-[70vh] overflow-y-auto pr-4">
            <div className={`prose max-w-none transition-colors ${
              theme === 'dark' ? 'text-white/80 prose-headings:text-white prose-strong:text-white prose-li:text-white/80 prose-p:text-white/80' 
                               : 'text-gray-800'
            }`}>
              <p className={`text-sm mb-4 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                <strong>Última atualização:</strong> Fevereiro 2026
              </p>

              {/* IMPORTANTE */}
              <div className={`p-4 rounded-lg mb-6 border-2 ${
                theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
              }`}>
                <h2 className="!mt-0 !mb-2">⚠️ IMPORTANTE</h2>
                <p className="!mb-2">O modo Kiosk via navegador (JavaScript) tem limitações:</p>
                <ul className="!mb-2">
                  <li>✅ Bloqueia a maioria das saídas</li>
                  <li>❌ F11 pode funcionar em alguns casos</li>
                  <li>❌ Task Manager pode fechar o navegador</li>
                  <li>❌ Botões físicos do dispositivo</li>
                </ul>
                <p className="!mb-0"><strong>Solução:</strong> Configurar Modo Kiosk no Sistema Operacional!</p>
              </div>

              <hr className="my-6" />

              {/* WINDOWS */}
              <h2 id="windows">🪟 WINDOWS</h2>

              <h3>Opção 1: Modo Quiosque Nativo (Windows 10/11 Pro/Enterprise)</h3>
              <p><strong>Melhor para:</strong> Ambientes corporativos, lojas, recepções</p>

              <h4>Passo a Passo:</h4>
              <ol>
                <li>
                  <strong>Criar Conta de Quiosque:</strong>
                  <ul>
                    <li>Abra <strong>Configurações</strong> → <strong>Contas</strong> → <strong>Outras pessoas</strong></li>
                    <li>Clique em <strong>Configurar um quiosque</strong></li>
                    <li>Escolha <strong>Criar uma conta de quiosque</strong></li>
                    <li>Defina nome (ex: "Atendimento")</li>
                  </ul>
                </li>
                <li>
                  <strong>Configurar Aplicativo:</strong>
                  <ul>
                    <li>Selecione <strong>Microsoft Edge</strong> como aplicativo</li>
                    <li>Ou escolha <strong>Chrome</strong> (se instalado)</li>
                    <li>Defina URL: <code>https://seu-assistente.eai.app.br</code></li>
                  </ul>
                </li>
                <li>
                  <strong>Configurações Avançadas:</strong>
                  <ul>
                    <li>Tipo de quiosque: <strong>Aplicativo único</strong></li>
                    <li>Quando fechar: <strong>Reiniciar app</strong></li>
                    <li>Tempo inativo: <strong>Nunca desligar</strong></li>
                  </ul>
                </li>
                <li>
                  <strong>Ativar Quiosque:</strong>
                  <ul>
                    <li>Faça logout da conta atual</li>
                    <li>Faça login na conta de quiosque</li>
                    <li>O navegador abrirá automaticamente em modo kiosk!</li>
                  </ul>
                </li>
              </ol>

              <p><strong>Como Sair:</strong></p>
              <ul>
                <li>Pressione <strong>Ctrl + Alt + Del</strong> → Trocar usuário</li>
                <li>OU configure senha administrativa</li>
              </ul>

              <hr className="my-4" />

              <h3>Opção 2: Chrome em Modo Quiosque (Qualquer Windows)</h3>
              <p><strong>Melhor para:</strong> Configuração rápida</p>

              <h4>Passo a Passo:</h4>
              <ol>
                <li>
                  <strong>Criar Atalho Kiosk:</strong>
                  <ul>
                    <li>Botão direito na área de trabalho → Novo → Atalho</li>
                    <li>Cole este comando:</li>
                  </ul>
                  <pre className={`p-3 rounded text-xs overflow-x-auto ${
                    theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-100'
                  }`}>
{`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk "https://seu-assistente.eai.app.br" --start-fullscreen --disable-pinch --overscroll-history-navigation=0`}
                  </pre>
                </li>
                <li>
                  <strong>Iniciar Automaticamente:</strong>
                  <ul>
                    <li>Pressione <strong>Win + R</strong></li>
                    <li>Digite: <code>shell:startup</code></li>
                    <li>Mova o atalho para esta pasta</li>
                  </ul>
                </li>
                <li>
                  <strong>Bloquear Saídas:</strong>
                  <ul>
                    <li>Baixe <strong><a href="https://www.kioware.com/" target="_blank" rel="noopener noreferrer">Kioware</a></strong> (pago, ~$250/ano)</li>
                    <li>OU <strong><a href="https://www.portagazer.com/" target="_blank" rel="noopener noreferrer">PortaGazer</a></strong> (pago, ~$150/ano)</li>
                    <li>OU use script AutoHotkey (gratuito, ver abaixo)</li>
                  </ul>
                </li>
              </ol>

              <p><strong>Script AutoHotkey (Gratuito):</strong></p>
              <pre className={`p-3 rounded text-xs overflow-x-auto ${
                theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-100'
              }`}>
{`; Bloquear Alt+F4, Ctrl+W, Win, etc
#NoEnv
SendMode Input

; Bloquear teclas do Windows
LWin::Return
RWin::Return
^Esc::Return  ; Ctrl+Esc
!Tab::Return  ; Alt+Tab
!F4::Return   ; Alt+F4
^w::Return    ; Ctrl+W
F11::Return   ; F11

; Manter sempre em foco
SetTimer, CheckFocus, 500
CheckFocus:
WinGetTitle, ActiveWindow, A
IfNotInString, ActiveWindow, Chrome
{
    WinActivate, Chrome
}
return`}
              </pre>
              <p>Salve como <code>kiosk.ahk</code> e execute com <a href="https://www.autohotkey.com/" target="_blank" rel="noopener noreferrer">AutoHotkey</a></p>

              <hr className="my-4" />

              <h3>Opção 3: Softwares Especializados</h3>
              <div className={`overflow-x-auto ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}>
                      <th className="border px-4 py-2 text-left">Software</th>
                      <th className="border px-4 py-2 text-left">Preço</th>
                      <th className="border px-4 py-2 text-left">Características</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-4 py-2"><strong>KioWare</strong></td>
                      <td className="border px-4 py-2">$250-500/ano</td>
                      <td className="border px-4 py-2">Bloqueio total, gerenciamento remoto, inatividade</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>SiteKiosk</strong></td>
                      <td className="border px-4 py-2">€350/ano</td>
                      <td className="border px-4 py-2">Multi-tela, impressão controlada, analytics</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>Porteus Kiosk</strong></td>
                      <td className="border px-4 py-2">Grátis (Linux)</td>
                      <td className="border px-4 py-2">ISO bootável, 100% bloqueado</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>Chrome Enterprise</strong></td>
                      <td className="border px-4 py-2">Grátis</td>
                      <td className="border px-4 py-2">Gerenciamento via Google Admin</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <hr className="my-6" />

              {/* ANDROID */}
              <h2 id="android">🤖 ANDROID</h2>

              <h3>Opção 1: Fixação de Apps (Nativo - Android 5+)</h3>
              <p><strong>Melhor para:</strong> Configuração rápida, tablets</p>

              <h4>Passo a Passo:</h4>
              <ol>
                <li>
                  <strong>Ativar Fixação:</strong>
                  <ul>
                    <li><strong>Configurações</strong> → <strong>Segurança</strong> → <strong>Fixação de apps</strong></li>
                    <li>Ative <strong>Fixação de apps</strong></li>
                    <li>(Opcional) Ative <strong>Solicitar PIN ao desafixar</strong></li>
                  </ul>
                </li>
                <li>
                  <strong>Usar:</strong>
                  <ul>
                    <li>Abra Chrome/Firefox</li>
                    <li>Acesse seu assistente</li>
                    <li>Toque no botão <strong>Recentes</strong> (⊡)</li>
                    <li>Toque no ícone do app no topo</li>
                    <li>Toque em <strong>Fixar</strong></li>
                  </ul>
                </li>
                <li>
                  <strong>Sair:</strong>
                  <ul>
                    <li>Mantenha pressionado <strong>Voltar + Recentes</strong> por 5 segundos</li>
                    <li>Digite PIN (se configurado)</li>
                  </ul>
                </li>
              </ol>

              <p><strong>Limitações:</strong></p>
              <ul>
                <li>⚠️ Barra de notificações acessível</li>
                <li>⚠️ Botões de volume funcionam</li>
              </ul>

              <hr className="my-4" />

              <h3>Opção 2: Modo Quiosque Dedicado (Android 6+)</h3>
              <p><strong>Melhor para:</strong> Dispositivos dedicados permanentes</p>

              <h4>Passo a Passo:</h4>
              <ol>
                <li>
                  <strong>Resetar Dispositivo:</strong>
                  <ul>
                    <li>Faça backup de dados importantes</li>
                    <li><strong>Configurações</strong> → <strong>Sistema</strong> → <strong>Redefinir</strong></li>
                    <li><strong>Redefinir dados de fábrica</strong></li>
                  </ul>
                </li>
                <li>
                  <strong>Configuração Inicial:</strong>
                  <ul>
                    <li>NÃO faça login com Google Account</li>
                    <li>Conecte Wi-Fi</li>
                    <li>Quando aparecer tela de apps, toque 6x no mesmo lugar</li>
                    <li>Selecione <strong>Configurar como quiosque</strong></li>
                  </ul>
                </li>
                <li>
                  <strong>Configurar App:</strong>
                  <ul>
                    <li>Instale Chrome/Firefox</li>
                    <li>Abra seu assistente</li>
                    <li>Defina como página inicial</li>
                  </ul>
                </li>
                <li>
                  <strong>Bloqueio Total:</strong>
                  <ul>
                    <li>Use <strong><a href="https://www.fully-kiosk.com/" target="_blank" rel="noopener noreferrer">Fully Kiosk Browser</a></strong> (€15-50)</li>
                    <li>OU <strong><a href="https://play.google.com/store/apps/details?id=com.procoit.kioskbrowser" target="_blank" rel="noopener noreferrer">Kiosk Browser Lockdown</a></strong> (Grátis)</li>
                  </ul>
                </li>
              </ol>

              <hr className="my-4" />

              <h3>Opção 3: Softwares MDM (Melhor para Múltiplos Dispositivos)</h3>
              <div className={`overflow-x-auto ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}>
                      <th className="border px-4 py-2 text-left">Software</th>
                      <th className="border px-4 py-2 text-left">Preço</th>
                      <th className="border px-4 py-2 text-left">Características</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-4 py-2"><strong>Fully Kiosk Browser</strong></td>
                      <td className="border px-4 py-2">€15-50</td>
                      <td className="border px-4 py-2">Bloqueio total, web remote, câmera</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>Kiosk Browser Lockdown</strong></td>
                      <td className="border px-4 py-2">Grátis</td>
                      <td className="border px-4 py-2">Básico, boa opção gratuita</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>Samsung Knox</strong></td>
                      <td className="border px-4 py-2">$2-6/device/mês</td>
                      <td className="border px-4 py-2">Enterprise, múltiplos apps</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>Google Workspace</strong></td>
                      <td className="border px-4 py-2">$6-18/user/mês</td>
                      <td className="border px-4 py-2">Gerenciamento completo</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>Hexnode MDM</strong></td>
                      <td className="border px-4 py-2">$1-4/device/mês</td>
                      <td className="border px-4 py-2">Multi-plataforma, políticas</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <hr className="my-6" />

              {/* iOS */}
              <h2 id="ios">🍎 iOS / iPadOS</h2>

              <h3>Opção 1: Acesso Guiado (Nativo)</h3>
              <p><strong>Melhor para:</strong> iPad em lojas, restaurantes</p>

              <h4>Passo a Passo:</h4>
              <ol>
                <li>
                  <strong>Ativar Acesso Guiado:</strong>
                  <ul>
                    <li><strong>Configurações</strong> → <strong>Acessibilidade</strong></li>
                    <li>Role até <strong>Acesso Guiado</strong></li>
                    <li>Ative <strong>Acesso Guiado</strong></li>
                    <li>Toque em <strong>Ajustes de Código</strong> → Defina senha</li>
                  </ul>
                </li>
                <li>
                  <strong>Configurar Restrições:</strong>
                  <ul>
                    <li><strong>Botões de Hardware</strong>: Desative</li>
                    <li><strong>Teclado</strong>: Mantenha ativo</li>
                    <li><strong>Toque</strong>: Mantenha ativo</li>
                    <li><strong>Movimento</strong>: Desative</li>
                  </ul>
                </li>
                <li>
                  <strong>Usar:</strong>
                  <ul>
                    <li>Abra Safari</li>
                    <li>Acesse seu assistente</li>
                    <li>Pressione <strong>3x o botão lateral</strong> (ou Home)</li>
                    <li>Toque em <strong>Iniciar</strong></li>
                  </ul>
                </li>
                <li>
                  <strong>Sair:</strong>
                  <ul>
                    <li>Pressione <strong>3x o botão lateral</strong> novamente</li>
                    <li>Digite senha</li>
                  </ul>
                </li>
              </ol>

              <p><strong>Configurações Recomendadas:</strong></p>
              <ul>
                <li>✅ Desabilitar controle de volume</li>
                <li>✅ Desabilitar botão de suspensão</li>
                <li>✅ Definir limite de tempo (opcional)</li>
              </ul>

              <hr className="my-4" />

              <h3>Opção 2: Modo Supervisado (Enterprise)</h3>
              <p><strong>Melhor para:</strong> Empresas com múltiplos iPads</p>

              <p>Requer:</p>
              <ul>
                <li>Apple Business Manager / Apple School Manager</li>
                <li>Mac com Apple Configurator 2</li>
                <li>MDM (Mobile Device Management)</li>
              </ul>

              <h4>Passo a Passo (Simplificado):</h4>
              <ol>
                <li>
                  <strong>Apple Configurator 2:</strong>
                  <ul>
                    <li>Instale no Mac</li>
                    <li>Conecte iPad via cabo</li>
                    <li>Selecione <strong>Preparar</strong></li>
                    <li>Escolha <strong>Supervisionar dispositivos</strong></li>
                  </ul>
                </li>
                <li>
                  <strong>Configurar Modo Quiosque:</strong>
                  <ul>
                    <li>Defina <strong>Modo App Único</strong> (Single App Mode)</li>
                    <li>Escolha Safari ou Chrome</li>
                    <li>Defina URL inicial</li>
                    <li>Desabilite botões físicos</li>
                  </ul>
                </li>
                <li>
                  <strong>MDM:</strong>
                  <ul>
                    <li>Use Jamf, Hexnode, ou Microsoft Intune</li>
                    <li>Crie perfil de configuração</li>
                    <li>Implante em dispositivos</li>
                  </ul>
                </li>
              </ol>

              <p><strong>Custo:</strong> ~$300-1000/ano (dependendo MDM)</p>

              <hr className="my-6" />

              {/* LINUX */}
              <h2 id="linux">🐧 LINUX</h2>

              <h3>Opção 1: Cage (Wayland Compositor)</h3>
              <p><strong>Melhor para:</strong> Kiosk ultra-minimalista</p>

              <pre className={`p-3 rounded text-xs overflow-x-auto ${
                theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-100'
              }`}>
{`# Ubuntu/Debian
sudo apt install cage chromium-browser

# Criar script de inicialização
sudo nano /usr/local/bin/kiosk.sh`}
              </pre>

              <p><strong>Conteúdo do script:</strong></p>
              <pre className={`p-3 rounded text-xs overflow-x-auto ${
                theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-100'
              }`}>
{`#!/bin/bash
cage -d chromium-browser --kiosk --no-first-run \\
  --disable-pinch \\
  --overscroll-history-navigation=0 \\
  "https://seu-assistente.eai.app.br"`}
              </pre>

              <pre className={`p-3 rounded text-xs overflow-x-auto ${
                theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-100'
              }`}>
{`# Dar permissão
sudo chmod +x /usr/local/bin/kiosk.sh

# Iniciar automaticamente
sudo nano /etc/systemd/system/kiosk.service`}
              </pre>

              <p><strong>Conteúdo do service:</strong></p>
              <pre className={`p-3 rounded text-xs overflow-x-auto ${
                theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-100'
              }`}>
{`[Unit]
Description=Kiosk Mode
After=graphical.target

[Service]
Type=simple
User=kiosk
ExecStart=/usr/local/bin/kiosk.sh
Restart=always

[Install]
WantedBy=graphical.target`}
              </pre>

              <pre className={`p-3 rounded text-xs overflow-x-auto ${
                theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-100'
              }`}>
{`# Ativar
sudo systemctl enable kiosk.service
sudo systemctl start kiosk.service`}
              </pre>

              <hr className="my-4" />

              <h3>Opção 2: Porteus Kiosk (Distro Dedicada)</h3>
              <p><strong>Melhor para:</strong> Máximo controle e segurança</p>

              <ol>
                <li>
                  <strong>Baixar ISO:</strong>
                  <ul>
                    <li>Acesse: <a href="https://porteus-kiosk.org/" target="_blank" rel="noopener noreferrer">https://porteus-kiosk.org/</a></li>
                    <li>Baixe versão gratuita ou paga ($25/device)</li>
                  </ul>
                </li>
                <li>
                  <strong>Criar USB Bootável:</strong>
                  <ul>
                    <li>Use Rufus (Windows) ou dd (Linux)</li>
                    <li>Grave ISO no USB</li>
                  </ul>
                </li>
                <li>
                  <strong>Configurar:</strong>
                  <ul>
                    <li>Boot pelo USB</li>
                    <li>Wizard de configuração</li>
                    <li>Defina URL do assistente</li>
                    <li>Configura bloqueios</li>
                  </ul>
                </li>
                <li>
                  <strong>Instalar no HD (Opcional):</strong>
                  <ul>
                    <li>Para instalação permanente</li>
                    <li>Dispositivo bootará direto no kiosk</li>
                  </ul>
                </li>
              </ol>

              <p><strong>Vantagens:</strong></p>
              <ul>
                <li>✅ 100% bloqueado</li>
                <li>✅ Não precisa Windows/licença</li>
                <li>✅ Read-only filesystem (impossível hackear)</li>
                <li>✅ Atualizações remotas</li>
              </ul>

              <hr className="my-6" />

              {/* COMPARAÇÃO */}
              <h2>📊 COMPARAÇÃO RÁPIDA</h2>
              <div className={`overflow-x-auto ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className={theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}>
                      <th className="border px-4 py-2 text-left">SO</th>
                      <th className="border px-4 py-2 text-left">Solução Gratuita</th>
                      <th className="border px-4 py-2 text-left">Solução Paga</th>
                      <th className="border px-4 py-2 text-left">Facilidade</th>
                      <th className="border px-4 py-2 text-left">Segurança</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-4 py-2"><strong>Windows</strong></td>
                      <td className="border px-4 py-2">Chrome Kiosk + AutoHotkey</td>
                      <td className="border px-4 py-2">KioWare, SiteKiosk</td>
                      <td className="border px-4 py-2">⭐⭐⭐</td>
                      <td className="border px-4 py-2">⭐⭐⭐⭐</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>Android</strong></td>
                      <td className="border px-4 py-2">Fixação de Apps</td>
                      <td className="border px-4 py-2">Fully Kiosk</td>
                      <td className="border px-4 py-2">⭐⭐⭐⭐⭐</td>
                      <td className="border px-4 py-2">⭐⭐⭐</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>iOS/iPad</strong></td>
                      <td className="border px-4 py-2">Acesso Guiado</td>
                      <td className="border px-4 py-2">Modo Supervisado</td>
                      <td className="border px-4 py-2">⭐⭐⭐⭐</td>
                      <td className="border px-4 py-2">⭐⭐⭐⭐⭐</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2"><strong>Linux</strong></td>
                      <td className="border px-4 py-2">Cage / Porteus Kiosk</td>
                      <td className="border px-4 py-2">-</td>
                      <td className="border px-4 py-2">⭐⭐</td>
                      <td className="border px-4 py-2">⭐⭐⭐⭐⭐</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <hr className="my-6" />

              {/* RECOMENDAÇÕES */}
              <h2>🎯 RECOMENDAÇÕES POR CENÁRIO</h2>

              <h3>🏪 Loja / Varejo:</h3>
              <ul>
                <li><strong>Desktop:</strong> Windows Kiosk + KioWare</li>
                <li><strong>Tablet:</strong> iPad + Acesso Guiado</li>
                <li><strong>Custo:</strong> $0-500/ano</li>
              </ul>

              <h3>🍔 Restaurante / Food Service:</h3>
              <ul>
                <li><strong>Tablet:</strong> Android + Fully Kiosk Browser</li>
                <li><strong>Totem:</strong> Porteus Kiosk (Linux)</li>
                <li><strong>Custo:</strong> €15-50 único</li>
              </ul>

              <h3>🏢 Recepção Corporativa:</h3>
              <ul>
                <li><strong>Desktop:</strong> Windows Enterprise Kiosk</li>
                <li><strong>Tablet:</strong> iPad Supervisado + MDM</li>
                <li><strong>Custo:</strong> $300-1000/ano</li>
              </ul>

              <h3>🏥 Hospital / Clínica:</h3>
              <ul>
                <li><strong>Totem:</strong> Porteus Kiosk (segurança máxima)</li>
                <li><strong>Tablet:</strong> iPad + Acesso Guiado</li>
                <li><strong>Custo:</strong> $25-100/device</li>
              </ul>

              <h3>🎓 Escola / Biblioteca:</h3>
              <ul>
                <li><strong>Desktop:</strong> Chrome Enterprise (Google Admin)</li>
                <li><strong>Tablet:</strong> Android + Knox ou Workspace</li>
                <li><strong>Custo:</strong> $0-18/user/mês</li>
              </ul>

              <hr className="my-6" />

              {/* CONFIGURAÇÕES EXTRAS */}
              <h2>🔧 CONFIGURAÇÕES EXTRAS RECOMENDADAS</h2>

              <h3>Para TODOS os Sistemas:</h3>
              <ol>
                <li>
                  <strong>Desabilitar Sleep/Screensaver:</strong>
                  <ul>
                    <li>Manter tela sempre ligada</li>
                    <li>Desabilitar senha ao acordar</li>
                  </ul>
                </li>
                <li>
                  <strong>Boot Automático:</strong>
                  <ul>
                    <li>Ligar device automaticamente após queda de energia</li>
                    <li>Abrir navegador automaticamente</li>
                  </ul>
                </li>
                <li>
                  <strong>Atualizações Noturnas:</strong>
                  <ul>
                    <li>Agendar updates para 3-4 AM</li>
                    <li>Reinício automático</li>
                  </ul>
                </li>
                <li>
                  <strong>Monitoramento Remoto:</strong>
                  <ul>
                    <li>TeamViewer, AnyDesk, ou Chrome Remote Desktop</li>
                    <li>Alertas de inatividade</li>
                  </ul>
                </li>
                <li>
                  <strong>Backup de Energia:</strong>
                  <ul>
                    <li>No-break/UPS</li>
                    <li>Bateria interna (tablets)</li>
                  </ul>
                </li>
              </ol>

              <hr className="my-6" />

              {/* APPS RECOMENDADOS */}
              <h2>📱 APPS RECOMENDADOS</h2>

              <h3>Android:</h3>
              <ul>
                <li><strong><a href="https://play.google.com/store/apps/details?id=de.ozerov.fully" target="_blank" rel="noopener noreferrer">Fully Kiosk Browser</a></strong> - €15-50 (MELHOR)</li>
                <li><strong><a href="https://play.google.com/store/apps/details?id=com.procoit.kioskbrowser" target="_blank" rel="noopener noreferrer">Kiosk Browser Lockdown</a></strong> - Grátis</li>
                <li><strong><a href="https://scalefusion.com/" target="_blank" rel="noopener noreferrer">Scalefusion</a></strong> - $2/device/mês (MDM)</li>
              </ul>

              <h3>iOS:</h3>
              <ul>
                <li>Nativo: <strong>Acesso Guiado</strong> (Grátis)</li>
                <li>Enterprise: <strong>Jamf</strong> ($4-12/device/mês)</li>
              </ul>

              <h3>Desktop (Windows):</h3>
              <ul>
                <li><strong><a href="https://www.kioware.com/" target="_blank" rel="noopener noreferrer">KioWare</a></strong> - $250-500/ano</li>
                <li><strong><a href="https://www.provisio.com/sitekiosk" target="_blank" rel="noopener noreferrer">SiteKiosk</a></strong> - €350/ano</li>
                <li><strong><a href="https://www.portagazer.com/" target="_blank" rel="noopener noreferrer">PortaGazer</a></strong> - $150/ano</li>
              </ul>

              <hr className="my-6" />

              {/* SUPORTE */}
              <h2>🆘 SUPORTE E LINKS ÚTEIS</h2>

              <h3>Documentação Oficial:</h3>
              <ul>
                <li><strong>Windows Kiosk:</strong> <a href="https://learn.microsoft.com/pt-br/windows/configuration/kiosk-methods" target="_blank" rel="noopener noreferrer">Microsoft Docs</a></li>
                <li><strong>Android Enterprise:</strong> <a href="https://www.android.com/enterprise/management/" target="_blank" rel="noopener noreferrer">Android Enterprise</a></li>
                <li><strong>iOS Guided Access:</strong> <a href="https://support.apple.com/pt-br/HT202612" target="_blank" rel="noopener noreferrer">Apple Support</a></li>
                <li><strong>Chrome Kiosk:</strong> <a href="https://support.google.com/chrome/a/answer/3273084?hl=pt-BR" target="_blank" rel="noopener noreferrer">Google Chrome Help</a></li>
              </ul>

              <h3>Comunidades:</h3>
              <ul>
                <li><strong>Reddit r/kiosk:</strong> <a href="https://reddit.com/r/kiosk" target="_blank" rel="noopener noreferrer">https://reddit.com/r/kiosk</a></li>
                <li><strong>Spiceworks:</strong> <a href="https://community.spiceworks.com/" target="_blank" rel="noopener noreferrer">https://community.spiceworks.com/</a></li>
              </ul>

              <h3>Suporte Comercial:</h3>
              <ul>
                <li><strong>KioWare:</strong> support@kioware.com</li>
                <li><strong>Fully Kiosk:</strong> support@fully-kiosk.com</li>
                <li><strong>Porteus:</strong> <a href="https://porteus-kiosk.org/support.html" target="_blank" rel="noopener noreferrer">https://porteus-kiosk.org/support.html</a></li>
              </ul>

              <hr className="my-6" />

              {/* CHECKLIST */}
              <h2>✅ CHECKLIST FINAL</h2>
              <p>Antes de colocar em produção:</p>

              <div className={`space-y-2 ${theme === 'dark' ? 'text-white/80' : 'text-gray-800'}`}>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>Modo Kiosk do SO configurado</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>Senha/PIN definida</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>Botões físicos bloqueados</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>Sleep/screensaver desabilitado</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>Boot automático configurado</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>URL do assistente testada</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>Internet estável verificada</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>Backup de energia instalado</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>Monitoramento remoto ativo</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" />
                  <span>Procedimento de emergência documentado</span>
                </label>
              </div>

              <hr className="my-6" />

              <div className={`text-center text-sm ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                <p><strong>Criado por:</strong> BigCorps / eAi App</p>
                <p className="mt-2"><strong>Atualizado:</strong> Fevereiro 2026</p>
                <p className="mt-2"><strong>Suporte:</strong> <a href="https://eai.app.br/suporte" className="text-blue-500 underline">https://eai.app.br/suporte</a></p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="https://learn.microsoft.com/pt-br/windows/configuration/kiosk-methods" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`w-full sm:w-auto px-6 py-3 rounded-lg border transition-all font-medium text-center ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Windows Kiosk (Microsoft)
          </a>
          <a 
            href="https://support.apple.com/pt-br/HT202612" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`w-full sm:w-auto px-6 py-3 rounded-lg border transition-all font-medium text-center ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            iOS Acesso Guiado (Apple)
          </a>
          <a 
            href="https://www.android.com/enterprise/management/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`w-full sm:w-auto px-6 py-3 rounded-lg border transition-all font-medium text-center ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Android Enterprise
          </a>
        </div>
      </div>
    </div>
  );
}
