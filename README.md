# BigCorps Tecnologia - Site Moderno em React

Um site moderno e responsivo desenvolvido em React para a BigCorps Tecnologia, com foco em apresentação de soluções de IA, automação e pagamentos integrados.

## 🎨 Design

O site foi desenvolvido seguindo a filosofia de **Modernismo Corporativo com Gradientes Dinâmicos**, com as seguintes características:

- **Paleta de Cores**: Laranja (#FF6B35), Azul Escuro (#2C3E50), Verde (#00CC44)
- **Tipografia**: Poppins (títulos) + Inter (corpo)
- **Layout**: Assimétrico com gradientes e micro-interações
- **Animações**: Suaves transições ao scroll e hover effects

## 📋 Estrutura do Projeto

```
bigcorps-site/
├── client/
│   ├── public/              # Arquivos estáticos (favicon, robots.txt)
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   │   ├── Header.tsx   # Navegação principal
│   │   │   ├── Footer.tsx   # Rodapé
│   │   │   └── ErrorBoundary.tsx
│   │   ├── pages/           # Páginas do site
│   │   │   ├── Home.tsx     # Página inicial
│   │   │   ├── Solucoes.tsx # Soluções de pagamento
│   │   │   ├── Duvidas.tsx  # FAQ
│   │   │   ├── Utilitarios.tsx # Ferramentas
│   │   │   ├── Contato.tsx  # Formulário de contato
│   │   │   └── NotFound.tsx # Página 404
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # Utilitários
│   │   ├── App.tsx          # Componente principal
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Estilos globais
│   └── index.html           # Template HTML
├── server/                  # Servidor Express (placeholder)
├── shared/                  # Tipos compartilhados
└── package.json
```

## 🚀 Começando

### Pré-requisitos

- Node.js 22.13.0+
- pnpm 10.4.1+

### Instalação

```bash
# Clonar o repositório
gh repo clone BigCorps/GERENTE
cd GERENTE

# Instalar dependências
pnpm install

# Iniciar o servidor de desenvolvimento
pnpm dev
```

O site estará disponível em `http://localhost:3000`

## 🔧 Configuração

### Logo da BigCorps

O logo é exibido no Header e Footer. Para alterar o logo:

#### Opção 1: Logo de Texto (Atual)
O logo atual é um ícone "B" em um quadrado com gradiente laranja. Para modificar:

**Arquivo**: `client/src/components/Header.tsx` (linhas 35-40)

```tsx
<div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] flex items-center justify-center text-white font-bold text-lg">
  B
</div>
```

#### Opção 2: Logo com Imagem

Se você tiver um arquivo de logo, siga estes passos:

1. **Prepare a imagem do logo**:
   - Formato: PNG, SVG ou JPG
   - Tamanho recomendado: 200x50px ou 400x100px
   - Fundo transparente (recomendado para PNG)

2. **Hospede a imagem em um CDN**:
   - Use o comando: `manus-upload-file --webdev seu-logo.png`
   - Copie a URL retornada

3. **Atualize o Header** (`client/src/components/Header.tsx`):

```tsx
<Link href="/">
  <a className="flex items-center gap-2">
    <img 
      src="https://seu-cdn.com/seu-logo.png" 
      alt="BigCorps Logo"
      className="h-10 md:h-12 w-auto"
    />
  </a>
</Link>
```

4. **Atualize o Footer** (`client/src/components/Footer.tsx`):

```tsx
<div className="flex items-center gap-2 mb-4">
  <img 
    src="https://seu-cdn.com/seu-logo.png" 
    alt="BigCorps Logo"
    className="h-8 w-auto"
  />
</div>
```

### Links das Páginas

Todos os links internos usam o roteador Wouter. Para adicionar ou modificar links:

#### Links Internos

No Header (`client/src/components/Header.tsx`):

```tsx
const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Soluções', href: '/solucoes' },
  { label: 'Dúvidas', href: '/duvidas' },
  { label: 'Utilitários', href: '/utilitarios' },
  { label: 'Contato', href: '/contato' },
];
```

Para adicionar uma nova página:

1. Crie o arquivo em `client/src/pages/NovaPagina.tsx`
2. Importe em `client/src/App.tsx`
3. Adicione a rota em `App.tsx`:

```tsx
<Route path={"/nova-pagina"} component={NovaPagina} />
```

4. Adicione o link no Header:

```tsx
{ label: 'Nova Página', href: '/nova-pagina' },
```

#### Links Externos

Para links externos (WhatsApp, Instagram, etc.):

```tsx
<a 
  href="https://wa.me/5511987311425"
  target="_blank"
  rel="noopener noreferrer"
  className="btn-primary"
>
  WhatsApp
</a>
```

### Contatos e Redes Sociais

**Arquivo**: `client/src/components/Footer.tsx`

```tsx
// WhatsApp
href="https://wa.me/5511987311425"

// Instagram
href="https://instagram.com/bigcorps"

// Email
href="mailto:contato@bigcorps.com.br"

// Telefone
href="tel:+5511987311425"
```

Para atualizar, modifique os links conforme necessário.

## 🎯 Páginas Disponíveis

### Home (`/`)
Página inicial com apresentação da empresa, estatísticas e chamadas para ação.

### Soluções (`/solucoes`)
Apresentação das soluções de pagamento NFC, vantagens para empresa e clientes.

### Dúvidas (`/duvidas`)
FAQ com accordion sobre integração, relatórios e email de confirmação.

### Utilitários (`/utilitarios`)
Ferramentas gratuitas, APIs parceiras e solução de ChatBot com IA.

### Contato (`/contato`)
Formulário de contato, informações de contato e horário de atendimento.

## 🎨 Customização de Cores

As cores principais estão definidas em `client/src/index.css`:

```css
--color-bigcorps-orange: #FF6B35;
--color-bigcorps-orange-light: #FF8C5A;
--color-bigcorps-orange-dark: #E55A24;
--color-bigcorps-blue: #2C3E50;
--color-bigcorps-blue-light: #34495E;
--color-bigcorps-green: #00CC44;
--color-bigcorps-green-light: #33DD66;
```

Para alterar as cores, modifique estes valores em `index.css`.

## 📱 Responsividade

O site é totalmente responsivo com breakpoints para:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

Todos os componentes usam Tailwind CSS com classes responsivas (`md:`, `lg:`).

## 🚀 Build e Deploy

### Build para Produção

```bash
pnpm build
```

Isso gera os arquivos otimizados em `dist/`.

### Preview da Build

```bash
pnpm preview
```

### Deploy

O site está pronto para ser deployado em qualquer plataforma que suporte Node.js:

- **Vercel**: `vercel`
- **Netlify**: `netlify deploy`
- **Railway**: Conecte seu repositório
- **Render**: Conecte seu repositório

## 📦 Dependências Principais

- **React 19**: Framework UI
- **Wouter**: Roteador leve
- **Tailwind CSS 4**: Estilização
- **shadcn/ui**: Componentes UI
- **Lucide React**: Ícones
- **Framer Motion**: Animações
- **Sonner**: Notificações Toast

## 🔐 Variáveis de Ambiente

Se precisar de variáveis de ambiente, crie um arquivo `.env.local`:

```
VITE_API_URL=https://api.example.com
VITE_ANALYTICS_ID=seu-id
```

## 📝 Estrutura de Componentes

### Header
- Navegação responsiva
- Menu mobile com hamburger
- Logo e CTA

### Footer
- Links de navegação
- Informações de contato
- Redes sociais
- Copyright

### Páginas
- Seções com layout assimétrico
- Animações ao scroll
- Formulários funcionais
- CTAs claras

## 🎯 Próximos Passos

1. **Adicionar Backend**: Se precisar de formulários funcionais, configure um backend com Node.js/Express
2. **Integração de Email**: Configure SendGrid ou Mailgun para envio de emails
3. **Analytics**: Configure Google Analytics ou Umami
4. **SEO**: Adicione meta tags e schema.org
5. **Imagens Otimizadas**: Substitua placeholders por imagens reais do CDN

## 🐛 Troubleshooting

### Porta 3000 já em uso

```bash
# Usar porta diferente
pnpm dev -- --port 3001
```

### Erro de compilação TypeScript

```bash
# Limpar cache
rm -rf node_modules .pnpm-store
pnpm install
```

### Estilos não aplicando

```bash
# Reconstruir Tailwind
pnpm build
```

## 📞 Suporte

Para dúvidas sobre o projeto:
- WhatsApp: (11) 98731-1425
- Email: contato@bigcorps.com.br
- Instagram: @bigcorps

## 📄 Licença

MIT

## 🙏 Créditos

Desenvolvido com ❤️ para BigCorps Tecnologia
