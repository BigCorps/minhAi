'use client';

// app/form/full/page.tsx
// Formulário pós-fechamento do Plano Full. Link enviado manualmente pelo
// Ith após o cliente fechar negócio — não faz parte da navegação pública
// do site. Tema claro fixo (não segue o tema escuro do resto do site).
// Envia por email via Edge Function (supabase/functions/enviar-formulario-full),
// sem gravar em banco de dados por enquanto.

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

// ─── Listas de opções ─────────────────────────────────────────────────
const SEGMENTOS = [
  'Clínica / Consultório', 'Restaurante / Food Service', 'Advocacia',
  'Academia / Estúdio', 'E-commerce', 'Loja física', 'Imobiliária',
  'Escola / Educação', 'Franquia', 'Farmácia', 'Salão de Beleza / Estética',
  'Pet Shop', 'Outro',
];

const CATEGORIAS_FUNCOES = [
  'IA / ChatGPT (perguntas gerais, orçamentos, tradução)',
  'Pagamentos (PIX, NFC, TEF)',
  'Fila de Atendimento',
  'Agendamento (Google Calendar)',
  'Produtos e Vendas (catálogo, carrinho, pedidos)',
  'Cadastro e Biometria',
  'Consultas e Compliance (CPF, CNPJ, placa)',
  'Visão Computacional / OCR',
  'Imagens e Documentos (editar, converter, remover fundo)',
  'Impressão (térmica, remota)',
  'Mídia e Entretenimento (vídeos, playlists — útil pra totem)',
  'Contatos / Redes Sociais (QR Codes)',
  'Utilidades e Produtividade (lembretes, alarmes, conversores)',
];

const ESPECIALISTAS_IA = [
  'Assistente de Vendas', 'Assistente de Orçamentos', 'Criador de Posts',
  'Gestor de Agenda', 'Auxiliar Fiscal', 'Auxiliar de Cadastro',
  'Auxiliar de Produção', 'Investigador Antifraude', 'Auxiliar de Relatórios',
  'Gerenciador de Funções',
];

const CANAIS = [
  'WhatsApp Business', 'Instagram Direct', 'Facebook Messenger',
  'Totem físico', 'WebApp (PWA)', 'App próprio (Play Store)',
];

interface FormState {
  razaoSocial: string;
  nomeFantasia: string;
  cnpjCpf: string;
  segmento: string;
  segmentoOutro: string;
  endereco: string;
  horarioFuncionamento: string;
  siteAtual: string;
  nomeAssistente: string;
  personalidade: string;
  palavraAtivacao: string;
  coresMarca: string;
  fraseSaudacao: string;
  logoBase64: string;
  logoNome: string;
  canais: string[];
  whatsappTipo: 'existente' | 'novo' | '';
  whatsappNumero: string;
  instagramHandle: string;
  facebookLink: string;
  temDominio: 'sim' | 'nao' | '';
  subdominioDesejado: string;
  nomeApp: string;
  funcoesDesejadas: string[];
  operadorasAtuais: string;
  especialistas: string[];
  integracoes: string[];
  sistemasAtuais: string;
  produtosObs: string;
  responsavelNome: string;
  responsavelContato: string;
  responsavelHorario: string;
  prazoDesejado: string;
  observacoes: string;
}

const initialState: FormState = {
  razaoSocial: '', nomeFantasia: '', cnpjCpf: '', segmento: '', segmentoOutro: '',
  endereco: '', horarioFuncionamento: '', siteAtual: '',
  nomeAssistente: '', personalidade: '', palavraAtivacao: '', coresMarca: '',
  fraseSaudacao: '', logoBase64: '', logoNome: '',
  canais: [], whatsappTipo: '', whatsappNumero: '', instagramHandle: '', facebookLink: '',
  temDominio: '', subdominioDesejado: '', nomeApp: '',
  funcoesDesejadas: [], operadorasAtuais: '',
  especialistas: [],
  integracoes: [], sistemasAtuais: '',
  produtosObs: '',
  responsavelNome: '', responsavelContato: '', responsavelHorario: '',
  prazoDesejado: '', observacoes: '',
};

export default function FormularioFullPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'enviando' | 'sucesso' | 'erro'>('idle');
  const [erroMsg, setErroMsg] = useState('');

  const update = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const toggleArrayValue = (field: 'canais' | 'funcoesDesejadas' | 'especialistas' | 'integracoes', value: string) => {
    setForm((f) => {
      const arr = f[field];
      return {
        ...f,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Logo muito grande — envie uma imagem de até 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, logoBase64: reader.result as string, logoNome: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nomeFantasia && !form.razaoSocial) {
      alert('Preencha ao menos o nome da empresa antes de enviar.');
      return;
    }

    setStatus('enviando');
    setErroMsg('');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('enviar-formulario-full', {
        body: form,
      });

      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.sucesso) throw new Error(result?.erro || 'Erro desconhecido ao enviar.');

      setStatus('sucesso');
    } catch (err: any) {
      console.error('Erro ao enviar formulário:', err);
      setErroMsg(err?.message || 'Não foi possível enviar. Tente novamente ou fale com a equipe.');
      setStatus('erro');
    }
  };

  if (status === 'sucesso') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Recebemos suas informações!</h1>
          <p className="text-sm text-gray-500">
            Obrigado por preencher tudo com detalhe. Nossa equipe já vai começar a montar o seu assistente personalizado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-10 px-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Cabeçalho */}
        <div className="text-center mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Vamos montar o seu assistente <span className="text-purple-600">Full</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto">
            Quanto mais detalhes você nos der aqui, mais personalizado e completo seu assistente de IA vai sair já na primeira versão.
          </p>
        </div>

        {/* 1. Dados da empresa */}
        <Section title="Dados da empresa">
          <Grid2>
            <Field label="Razão social">
              <Input value={form.razaoSocial} onChange={(v) => update('razaoSocial', v)} />
            </Field>
            <Field label="Nome fantasia">
              <Input value={form.nomeFantasia} onChange={(v) => update('nomeFantasia', v)} />
            </Field>
          </Grid2>
          <Grid2>
            <Field label="CNPJ ou CPF (se autônomo/MEI)">
              <Input value={form.cnpjCpf} onChange={(v) => update('cnpjCpf', v)} />
            </Field>
            <Field label="Segmento de atuação">
              <Select value={form.segmento} onChange={(v) => update('segmento', v)} options={SEGMENTOS} />
            </Field>
          </Grid2>
          {form.segmento === 'Outro' && (
            <Field label="Qual segmento?">
              <Input value={form.segmentoOutro} onChange={(v) => update('segmentoOutro', v)} />
            </Field>
          )}
          <Field label="Endereço completo">
            <Input value={form.endereco} onChange={(v) => update('endereco', v)} />
          </Field>
          <Grid2>
            <Field label="Horário de funcionamento">
              <Input value={form.horarioFuncionamento} onChange={(v) => update('horarioFuncionamento', v)} placeholder="Ex: Seg a Sex, 8h às 18h" />
            </Field>
            <Field label="Site atual (se tiver)">
              <Input value={form.siteAtual} onChange={(v) => update('siteAtual', v)} placeholder="https://..." />
            </Field>
          </Grid2>
        </Section>

        {/* 2. Identidade do assistente */}
        <Section title="Identidade do assistente">
          <Grid2>
            <Field label="Nome do assistente">
              <Input value={form.nomeAssistente} onChange={(v) => update('nomeAssistente', v)} placeholder="Ex: Sofia, Bot da Clínica..." />
            </Field>
            <Field label="Palavra de ativação (se usar totem/voz)">
              <Input value={form.palavraAtivacao} onChange={(v) => update('palavraAtivacao', v)} />
            </Field>
          </Grid2>
          <Field label="Personalidade desejada">
            <Textarea value={form.personalidade} onChange={(v) => update('personalidade', v)} placeholder="Ex: formal e direto / descontraído e simpático / técnico e objetivo..." />
          </Field>
          <Field label="Frase de saudação inicial">
            <Textarea value={form.fraseSaudacao} onChange={(v) => update('fraseSaudacao', v)} placeholder="Como o assistente deve se apresentar ao cliente" />
          </Field>
          <Grid2>
            <Field label="Cores da marca (paleta ou código hex)">
              <Input value={form.coresMarca} onChange={(v) => update('coresMarca', v)} placeholder="Ex: #1E3A8A, azul e branco" />
            </Field>
            <Field label="Logo da empresa">
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-semibold hover:file:bg-blue-100" />
              {form.logoNome && <p className="text-xs text-green-600 mt-1">✓ {form.logoNome}</p>}
            </Field>
          </Grid2>
        </Section>

        {/* 3. Canais de atendimento */}
        <Section title="Canais de atendimento">
          <CheckboxGroup
            options={CANAIS}
            selected={form.canais}
            onToggle={(v) => toggleArrayValue('canais', v)}
          />
          {form.canais.includes('WhatsApp Business') && (
            <Grid2>
              <Field label="Número de WhatsApp">
                <div className="flex gap-3 mb-2">
                  <RadioOption label="Já existente (migrar)" checked={form.whatsappTipo === 'existente'} onClick={() => update('whatsappTipo', 'existente')} />
                  <RadioOption label="Número novo" checked={form.whatsappTipo === 'novo'} onClick={() => update('whatsappTipo', 'novo')} />
                </div>
                <Input value={form.whatsappNumero} onChange={(v) => update('whatsappNumero', v)} placeholder="(11) 90000-0000" />
              </Field>
              <div className="flex flex-col gap-3">
                <Field label="@ do Instagram">
                  <Input value={form.instagramHandle} onChange={(v) => update('instagramHandle', v)} placeholder="@suaempresa" />
                </Field>
                <Field label="Link do Facebook">
                  <Input value={form.facebookLink} onChange={(v) => update('facebookLink', v)} />
                </Field>
              </div>
            </Grid2>
          )}
        </Section>

        {/* 4. Domínio e app */}
        <Section title="Domínio e aplicativo">
          <Field label="Já tem domínio próprio registrado?">
            <div className="flex gap-3">
              <RadioOption label="Sim, já tenho" checked={form.temDominio === 'sim'} onClick={() => update('temDominio', 'sim')} />
              <RadioOption label="Não, preciso que registrem" checked={form.temDominio === 'nao'} onClick={() => update('temDominio', 'nao')} />
            </div>
          </Field>
          <Grid2>
            <Field label="Domínio ou subdomínio desejado">
              <Input value={form.subdominioDesejado} onChange={(v) => update('subdominioDesejado', v)} placeholder="suaempresa.minhai.com.br ou domínio próprio" />
            </Field>
            <Field label="Nome desejado do app (Play Store)">
              <Input value={form.nomeApp} onChange={(v) => update('nomeApp', v)} />
            </Field>
          </Grid2>
        </Section>

        {/* 5. Funções desejadas */}
        <Section title="Funções que você quer ativar">
          <CheckboxGroup
            options={CATEGORIAS_FUNCOES}
            selected={form.funcoesDesejadas}
            onToggle={(v) => toggleArrayValue('funcoesDesejadas', v)}
          />
          <Field label="Já usa algum banco/operadora de pagamento hoje? Quais?">
            <Textarea value={form.operadorasAtuais} onChange={(v) => update('operadorasAtuais', v)} placeholder="Ex: Já uso Mercado Pago na maquininha, quero manter" />
          </Field>
        </Section>

        {/* 6. Especialistas de IA */}
        <Section title="Especialistas de IA">
          <CheckboxGroup
            options={ESPECIALISTAS_IA}
            selected={form.especialistas}
            onToggle={(v) => toggleArrayValue('especialistas', v)}
          />
        </Section>

        {/* 7. Integrações */}
        <Section title="Integrações">
          <CheckboxGroup
            options={['Google Workspace (Gmail, Drive, Agenda, Meet)', 'Mercado Livre']}
            selected={form.integracoes}
            onToggle={(v) => toggleArrayValue('integracoes', v)}
          />
          <Field label="Usa algum sistema hoje que precisaria se conectar (ERP, PDV, etc.)?">
            <Textarea value={form.sistemasAtuais} onChange={(v) => update('sistemasAtuais', v)} />
          </Field>
        </Section>

        {/* 8. Produtos */}
        <Section title="Produtos e catálogo">
          <Field label="Observações sobre seus produtos/serviços (lista completa pode ser enviada depois, separadamente)">
            <Textarea value={form.produtosObs} onChange={(v) => update('produtosObs', v)} placeholder="Ex: temos cerca de 40 produtos, tabela de preços já pronta em planilha" />
          </Field>
        </Section>

        {/* 9. Escalonamento humano */}
        <Section title="Quando chamar um humano">
          <Grid2>
            <Field label="Nome de quem deve ser chamado">
              <Input value={form.responsavelNome} onChange={(v) => update('responsavelNome', v)} />
            </Field>
            <Field label="Contato (WhatsApp/telefone)">
              <Input value={form.responsavelContato} onChange={(v) => update('responsavelContato', v)} />
            </Field>
          </Grid2>
          <Field label="Horário em que essa pessoa está disponível">
            <Input value={form.responsavelHorario} onChange={(v) => update('responsavelHorario', v)} />
          </Field>
        </Section>

        {/* 10. Prazo e observações */}
        <Section title="Prazo e observações finais">
          <Field label="Prazo desejado pro assistente estar no ar">
            <Input value={form.prazoDesejado} onChange={(v) => update('prazoDesejado', v)} />
          </Field>
          <Field label="Alguma exigência especial ou observação?">
            <Textarea value={form.observacoes} onChange={(v) => update('observacoes', v)} />
          </Field>
        </Section>

        {/* Envio */}
        <div className="flex flex-col items-center gap-3 mt-2">
          {status === 'erro' && (
            <p className="text-sm text-red-600 text-center">{erroMsg}</p>
          )}
          <button
            type="submit"
            disabled={status === 'enviando'}
            className="w-full sm:w-auto px-10 py-3 bg-purple-600 text-white rounded-full font-bold text-sm hover:bg-purple-700 transition-all duration-300 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
          >
            {status === 'enviando' ? 'Enviando...' : 'Enviar informações'}
          </button>
        </div>

      </form>
    </div>
  );
}

// ─── Componentes de apoio ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-blue-600">{title}</h2>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
    />
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
    >
      <option value="">Selecione...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

function RadioOption({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
        checked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
      }`}
    >
      {label}
    </button>
  );
}

function CheckboxGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => {
        const isChecked = selected.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => onToggle(opt)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all ${
              isChecked
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <span className={`w-4 h-4 rounded-md border flex-shrink-0 flex items-center justify-center ${
              isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
            }`}>
              {isChecked && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}
