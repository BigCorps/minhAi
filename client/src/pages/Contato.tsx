import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Contato Page - BigCorps
 * Design: Modernismo Corporativo
 * - Formulário de contato
 * - Informações de contato
 * - Links para redes sociais
 */

export default function Contato() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    assunto: '',
    mensagem: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.mensagem) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simular envio do formulário
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Mensagem enviada com sucesso! Entraremos em contato em breve.');
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        assunto: '',
        mensagem: '',
      });
    } catch (error) {
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contatos = [
    {
      icon: Phone,
      title: 'Telefone',
      value: '(11) 98731-1425',
      link: 'tel:+5511987311425',
    },
    {
      icon: Mail,
      title: 'Email',
      value: 'contato@bigcorps.com.br',
      link: 'mailto:contato@bigcorps.com.br',
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      value: 'Envie uma mensagem',
      link: 'https://wa.me/5511987311425',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-20 md:pt-32 pb-16 md:pb-24 bg-gradient-to-br from-white via-white to-gray-50">
        <div className="container">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-[#2C3E50] mb-6">
              Entre em Contato
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Venha fazer parte da inovação com IA na sua empresa. Nossa equipe está pronta para ajudar você.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {contatos.map((contato, idx) => {
              const Icon = contato.icon;
              return (
                <a
                  key={idx}
                  href={contato.link}
                  target={contato.link.startsWith('http') ? '_blank' : undefined}
                  rel={contato.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="card-modern text-center group"
                >
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#2C3E50] mb-2">
                    {contato.title}
                  </h3>
                  <p className="text-gray-600 group-hover:text-[#FF6B35] transition-colors">
                    {contato.value}
                  </p>
                </a>
              );
            })}
          </div>

          <div className="border-t border-gray-200 pt-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-6">
                Envie uma Mensagem
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Preencha o formulário abaixo e nossa equipe responderá em breve
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="nome" className="block text-sm font-semibold text-[#2C3E50] mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      id="nome"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      placeholder="Seu nome"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#FF6B35] focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-[#2C3E50] mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#FF6B35] focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="telefone" className="block text-sm font-semibold text-[#2C3E50] mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      id="telefone"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      placeholder="(11) 98765-4321"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#FF6B35] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="assunto" className="block text-sm font-semibold text-[#2C3E50] mb-2">
                      Assunto
                    </label>
                    <select
                      id="assunto"
                      name="assunto"
                      value={formData.assunto}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#FF6B35] focus:outline-none transition-colors"
                    >
                      <option value="">Selecione um assunto</option>
                      <option value="solucoes">Soluções</option>
                      <option value="duvidas">Dúvidas</option>
                      <option value="parceria">Parceria</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="mensagem" className="block text-sm font-semibold text-[#2C3E50] mb-2">
                    Mensagem *
                  </label>
                  <textarea
                    id="mensagem"
                    name="mensagem"
                    value={formData.mensagem}
                    onChange={handleChange}
                    placeholder="Escreva sua mensagem aqui..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#FF6B35] focus:outline-none transition-colors resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                  {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>

              <div className="mt-8 p-6 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Nota:</strong> Este é um formulário de demonstração. Para uma implementação real, você precisará configurar um backend ou serviço de email como SendGrid ou Mailgun.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Info Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-[#2C3E50] to-[#34495E] text-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Sobre a BigCorps
              </h2>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                A BigCorps Tecnologia é uma empresa especializada em soluções de automação com IA, pagamentos integrados e ferramentas digitais para empresas de todos os tamanhos.
              </p>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Nosso objetivo é transformar a forma como as empresas trabalham, oferecendo tecnologia de ponta que gera resultados reais.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-6 h-6 text-[#FF6B35] flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold">Localização</div>
                    <div className="text-gray-300">São Paulo, SP - Brasil</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-6 h-6 text-[#FF6B35] flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold">CNPJ</div>
                    <div className="text-gray-300">14.282.244/0001-19</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 rounded-2xl p-8 border border-white border-opacity-20">
              <h3 className="text-2xl font-bold mb-6">Horário de Atendimento</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Segunda a Sexta</span>
                  <span className="font-semibold">9:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Sábado</span>
                  <span className="font-semibold">10:00 - 14:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Domingo</span>
                  <span className="font-semibold">Fechado</span>
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-6">
                Disponível 24/7 via WhatsApp para consultas urgentes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] text-white">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Pronto para começar?
          </h2>
          <p className="text-lg text-white text-opacity-90 mb-8 max-w-2xl mx-auto">
            Entre em contato conosco hoje mesmo e descubra como podemos ajudar seu negócio a crescer
          </p>
          <a
            href="https://wa.me/5511987311425"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-white text-[#FF6B35] hover:bg-gray-100 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Fale Conosco no WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
