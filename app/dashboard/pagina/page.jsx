import { useState, useRef, useEffect } from "react";

// ─── Tipos de seção disponíveis ───────────────────────────────────────────────
const SECTION_TYPES = [
  { id: "hero",        label: "Hero / Capa",         icon: "🎯", desc: "Título principal, subtítulo e chamada para ação" },
  { id: "about",       label: "Sobre nós",            icon: "🏢", desc: "História, missão e valores da empresa" },
  { id: "services",    label: "Serviços / Produtos",  icon: "⚡", desc: "Lista de serviços ou produtos com descrição" },
  { id: "gallery",     label: "Galeria / Portfólio",  icon: "🖼️", desc: "Grade de imagens ou trabalhos realizados" },
  { id: "testimonials",label: "Depoimentos",          icon: "💬", desc: "Avaliações e depoimentos de clientes" },
  { id: "pricing",     label: "Preços / Planos",      icon: "💰", desc: "Tabela de preços ou planos disponíveis" },
  { id: "faq",         label: "Perguntas Frequentes", icon: "❓", desc: "Dúvidas comuns com respostas" },
  { id: "contact",     label: "Contato / Localização",icon: "📍", desc: "Endereço, telefone, formulário de contato" },
  { id: "cta",         label: "Chamada para Ação",    icon: "🚀", desc: "Seção de conversão com botão de destaque" },
  { id: "team",        label: "Nossa Equipe",         icon: "👥", desc: "Fotos e apresentação dos membros da equipe" },
];

// ─── Prompt de sistema para geração de HTML ───────────────────────────────────
const buildSectionPrompt = (sectionType, sectionLabel, context, userInput) => `
Você é um desenvolvedor front-end especialista em design moderno brasileiro.

CONTEXTO DA EMPRESA:
${context}

TAREFA:
Gere APENAS o HTML da seção "${sectionLabel}" (id: ${sectionType}).

INSTRUÇÕES DO USUÁRIO PARA ESTA SEÇÃO:
${userInput}

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS o HTML da seção — sem <!DOCTYPE>, sem <html>, sem <head>, sem <body>
2. Use apenas classes Tailwind CSS (disponível via CDN)
3. Comece com <section id="${sectionType}" class="...">
4. Design: moderno, profissional, cores coesas com o contexto da empresa
5. Se precisar de imagens, use https://picsum.photos/800/400?random={numero}
6. Sem comentários HTML, sem código desnecessário
7. Máximo 80 linhas de HTML limpo e semântico
8. Inclua hover effects e transições suaves onde fizer sentido
9. Totalmente responsivo (mobile-first)
10. NÃO inclua scripts JavaScript

Retorne APENAS o HTML, sem explicações, sem blocos de código markdown.
`;

const buildPageContext = (companyName, segment, description, colors) => `
Nome da empresa: ${companyName}
Segmento: ${segment}
Descrição: ${description}
Cores da marca: ${colors}
`;

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PageBuilder() {
  const [step, setStep] = useState("setup"); // setup | builder | preview
  const [company, setCompany] = useState({
    name: "", segment: "", description: "", primaryColor: "#1d4ed8", accentColor: "#7c3aed"
  });
  const [sections, setSections] = useState([]); // seções adicionadas à página
  const [selectedType, setSelectedType] = useState(null);
  const [chatHistory, setChatHistory] = useState([]); // conversa atual da seção
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [editingSection, setEditingSection] = useState(null);
  const [activePanel, setActivePanel] = useState("sections"); // sections | chat
  const chatEndRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // ── Montar preview HTML completo ──────────────────────────────────────────
  const buildFullHtml = (sectionsList) => {
    const sectionsHtml = sectionsList.map(s => s.html).join("\n");
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${company.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    :root { --primary: ${company.primaryColor}; --accent: ${company.accentColor}; }
  </style>
</head>
<body class="bg-white text-gray-900">
${sectionsHtml}
</body>
</html>`;
  };

  useEffect(() => {
    if (sections.length > 0) {
      setPreviewHtml(buildFullHtml(sections));
    }
  }, [sections]);

  // ── Chamar API Claude ─────────────────────────────────────────────────────
  const callClaude = async (messages) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "Você é um assistente especialista em criar páginas web bonitas para empresas brasileiras. Seja direto, amigável e prático. Quando pedir informações para gerar uma seção, seja específico mas não exagere nas perguntas.",
        messages,
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text ?? "";
  };

  // ── Gerar HTML da seção ───────────────────────────────────────────────────
  const generateSectionHtml = async (sectionType, sectionLabel, userDescription) => {
    const context = buildPageContext(
      company.name, company.segment, company.description,
      `Principal: ${company.primaryColor}, Destaque: ${company.accentColor}`
    );
    const prompt = buildSectionPrompt(sectionType, sectionLabel, context, userDescription);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text ?? "";
  };

  // ── Iniciar conversa de uma seção ─────────────────────────────────────────
  const startSectionChat = async (sectionType) => {
    const section = SECTION_TYPES.find(s => s.id === sectionType);
    setSelectedType(sectionType);
    setActivePanel("chat");
    setChatHistory([]);
    setIsGenerating(true);

    const greeting = await callClaude([{
      role: "user",
      content: `O usuário quer criar a seção "${section.label}" para a empresa "${company.name}" (${company.segment}). 
Faça UMA pergunta objetiva e específica para entender o conteúdo desta seção. 
Seja direto e amigável. Máximo 2 linhas.`
    }]);

    setChatHistory([{ role: "assistant", content: greeting }]);
    setIsGenerating(false);
  };

  // ── Enviar mensagem no chat ───────────────────────────────────────────────
  const sendMessage = async () => {
    if (!inputText.trim() || isGenerating) return;

    const userMsg = inputText.trim();
    setInputText("");
    const newHistory = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(newHistory);
    setIsGenerating(true);

    const section = SECTION_TYPES.find(s => s.id === selectedType);

    // Verificar se temos informação suficiente para gerar
    const checkResponse = await callClaude([
      ...newHistory,
      {
        role: "user",
        content: `Com base no que o usuário disse, você tem informação suficiente para criar a seção "${section.label}"? 
Responda apenas: "SIM" ou faça mais UMA pergunta curta e objetiva.`
      }
    ]);

    if (checkResponse.trim().startsWith("SIM")) {
      // Gerar HTML
      const description = newHistory
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join(". ");

      setChatHistory(prev => [...prev, {
        role: "assistant",
        content: "✨ Perfeito! Gerando sua seção agora..."
      }]);

      const html = await generateSectionHtml(selectedType, section.label, description);

      const newSection = {
        id: Date.now(),
        type: selectedType,
        label: section.label,
        icon: section.icon,
        html,
        description,
      };

      if (editingSection !== null) {
        setSections(prev => prev.map((s, i) => i === editingSection ? newSection : s));
        setEditingSection(null);
      } else {
        setSections(prev => [...prev, newSection]);
      }

      setChatHistory(prev => [...prev, {
        role: "assistant",
        content: `✅ Seção "${section.label}" criada! Você pode ver no preview ao lado. Quer ajustar algo ou adicionar outra seção?`
      }]);
      setSelectedType(null);
    } else {
      setChatHistory(prev => [...prev, { role: "assistant", content: checkResponse }]);
    }

    setIsGenerating(false);
  };

  // ── Refinar seção existente ───────────────────────────────────────────────
  const refineSection = async (sectionIndex) => {
    const section = sections[sectionIndex];
    setEditingSection(sectionIndex);
    setSelectedType(section.type);
    setActivePanel("chat");
    setChatHistory([{
      role: "assistant",
      content: `Vou refinar a seção "${section.label}". O que você gostaria de mudar? (ex: "mude a cor do botão", "adicione mais serviços", "texto mais formal")`
    }]);
  };

  // ── Mover seção ───────────────────────────────────────────────────────────
  const moveSection = (index, direction) => {
    const newSections = [...sections];
    const target = index + direction;
    if (target < 0 || target >= newSections.length) return;
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    setSections(newSections);
  };

  const removeSection = (index) => {
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  // ── TELA 1: Setup da empresa ──────────────────────────────────────────────
  if (step === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "40px", width: "100%", maxWidth: "520px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎨</div>
            <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: "700", margin: "0 0 8px" }}>Criar minha página</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: 0 }}>Conte sobre sua empresa para começarmos</p>
          </div>

          {[
            { key: "name", label: "Nome da empresa", placeholder: "Ex: Barbearia do João" },
            { key: "segment", label: "Segmento / ramo de atividade", placeholder: "Ex: Barbearia, Restaurante, Clínica..." },
            { key: "description", label: "Descreva brevemente sua empresa", placeholder: "O que você faz, para quem, diferenciais..." },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "13px", marginBottom: "6px", fontWeight: "500" }}>{field.label}</label>
              {field.key === "description" ? (
                <textarea
                  value={company[field.key]}
                  onChange={e => setCompany(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                  style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "10px 14px", color: "#fff", fontSize: "14px", resize: "none", boxSizing: "border-box", outline: "none" }}
                />
              ) : (
                <input
                  value={company[field.key]}
                  onChange={e => setCompany(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "10px 14px", color: "#fff", fontSize: "14px", boxSizing: "border-box", outline: "none" }}
                />
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            {[
              { key: "primaryColor", label: "Cor principal" },
              { key: "accentColor", label: "Cor de destaque" },
            ].map(field => (
              <div key={field.key} style={{ flex: 1 }}>
                <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "13px", marginBottom: "6px", fontWeight: "500" }}>{field.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "8px 12px" }}>
                  <input type="color" value={company[field.key]} onChange={e => setCompany(prev => ({ ...prev, [field.key]: e.target.value }))} style={{ width: "28px", height: "28px", border: "none", background: "none", cursor: "pointer", borderRadius: "4px" }} />
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>{company[field.key]}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { if (company.name && company.segment) setStep("builder"); }}
            style={{ width: "100%", background: company.name && company.segment ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: "12px", padding: "14px", fontSize: "15px", fontWeight: "600", cursor: company.name && company.segment ? "pointer" : "not-allowed", transition: "all 0.2s" }}
          >
            Começar a criar minha página →
          </button>
        </div>
      </div>
    );
  }

  // ── TELA 2: Builder ───────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", fontFamily: "Inter, sans-serif", background: "#0f172a", overflow: "hidden" }}>

      {/* Coluna esquerda: Seções + Chat */}
      <div style={{ width: "380px", minWidth: "380px", display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.08)", background: "#111827" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>{company.name}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{sections.length} seção{sections.length !== 1 ? "ões" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setActivePanel("sections")}
              style={{ padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", background: activePanel === "sections" ? "#6366f1" : "rgba(255,255,255,0.08)", color: activePanel === "sections" ? "#fff" : "rgba(255,255,255,0.5)" }}
            >Seções</button>
            <button
              onClick={() => setActivePanel("chat")}
              style={{ padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", background: activePanel === "chat" ? "#6366f1" : "rgba(255,255,255,0.08)", color: activePanel === "chat" ? "#fff" : "rgba(255,255,255,0.5)" }}
            >
              {isGenerating ? "⏳ IA" : "💬 Chat"}
            </button>
          </div>
        </div>

        {/* Painel Seções */}
        {activePanel === "sections" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

            {/* Seções adicionadas */}
            {sections.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Sua página</div>
                {sections.map((section, index) => (
                  <div key={section.id} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "10px", padding: "10px 12px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>{section.icon}</span>
                    <span style={{ color: "#fff", fontSize: "13px", fontWeight: "500", flex: 1 }}>{section.label}</span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => moveSection(index, -1)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>↑</button>
                      <button onClick={() => moveSection(index, 1)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>↓</button>
                      <button onClick={() => { refineSection(index); }} style={{ background: "rgba(99,102,241,0.2)", border: "none", color: "#818cf8", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>✏️</button>
                      <button onClick={() => removeSection(index)} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#f87171", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar seção */}
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Adicionar seção</div>
            {SECTION_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => startSectionChat(type.id)}
                style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 12px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                <span style={{ fontSize: "20px" }}>{type.icon}</span>
                <div>
                  <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500" }}>{type.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>{type.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Painel Chat */}
        {activePanel === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {chatHistory.length === 0 && (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "40px" }}>
                  Escolha uma seção para começar a conversa
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: msg.role === "user" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.08)",
                    color: "#fff",
                    fontSize: "13px",
                    lineHeight: "1.5",
                  }}>{msg.content}</div>
                </div>
              ))}
              {isGenerating && (
                <div style={{ display: "flex" }}>
                  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1", animation: `bounce 1s ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input do chat */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={isGenerating ? "Aguarde..." : "Digite sua resposta..."}
                  disabled={isGenerating}
                  style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px 14px", color: "#fff", fontSize: "13px", outline: "none" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={isGenerating || !inputText.trim()}
                  style={{ background: isGenerating || !inputText.trim() ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: "10px", padding: "10px 16px", color: "#fff", cursor: isGenerating || !inputText.trim() ? "not-allowed" : "pointer", fontSize: "16px" }}
                >→</button>
              </div>
              {chatHistory.length > 0 && (
                <button
                  onClick={() => { setActivePanel("sections"); setChatHistory([]); setSelectedType(null); }}
                  style={{ width: "100%", marginTop: "8px", background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "12px", cursor: "pointer", padding: "4px" }}
                >← Voltar para seções</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111827" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981" }} />
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px", padding: "4px 16px", color: "rgba(255,255,255,0.4)", fontSize: "12px", marginLeft: "8px" }}>
              minhai.app/page/{company.name.toLowerCase().replace(/\s+/g, "-") || "minha-empresa"}
            </div>
          </div>
          {sections.length > 0 && (
            <button
              onClick={() => {
                const blob = new Blob([previewHtml], { type: "text/html" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = `${company.name.toLowerCase().replace(/\s+/g, "-")}.html`; a.click();
              }}
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: "8px", padding: "8px 16px", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
            >⬇ Baixar HTML</button>
          )}
        </div>

        <div style={{ flex: 1, overflow: "hidden", background: "#1e293b" }}>
          {sections.length === 0 ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>🎨</div>
              <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "rgba(255,255,255,0.3)" }}>Preview aparece aqui</div>
              <div style={{ fontSize: "14px" }}>Adicione uma seção para começar</div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Preview da página"
              sandbox="allow-scripts"
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}