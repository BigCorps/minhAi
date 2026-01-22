'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface CompanyContactsFormProps {
  companyId: string;
  initialData?: {
    whatsapp_number?: string;
    instagram_username?: string;
    pix_key?: string;
    pix_key_type?: string;
  };
}

export default function CompanyContactsForm({ companyId, initialData }: CompanyContactsFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [whatsappNumber, setWhatsappNumber] = useState(initialData?.whatsapp_number || '');
  const [instagramUsername, setInstagramUsername] = useState(initialData?.instagram_username || '');
  const [pixKey, setPixKey] = useState(initialData?.pix_key || '');
  const [pixKeyType, setPixKeyType] = useState(initialData?.pix_key_type || 'phone');

  const formatWhatsApp = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Formata: (11) 99999-9999
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatInstagram = (value: string) => {
    // Remove @ e espaços
    return value.replace(/[@\s]/g, '').toLowerCase();
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Validações
      if (whatsappNumber && whatsappNumber.replace(/\D/g, '').length < 10) {
        throw new Error('WhatsApp inválido. Use formato: (11) 99999-9999');
      }

      if (instagramUsername && instagramUsername.length < 3) {
        throw new Error('Instagram inválido. Mínimo 3 caracteres');
      }

      if (pixKey && pixKey.length < 5) {
        throw new Error('Chave PIX inválida');
      }

      // Salvar
      const { error } = await supabase
        .from('companies')
        .update({
          whatsapp_number: whatsappNumber.replace(/\D/g, '') || null,
          instagram_username: instagramUsername || null,
          pix_key: pixKey || null,
          pix_key_type: pixKey ? pixKeyType : null,
        })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Informações de contato atualizadas',
      });

    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📱 Contatos e Pagamentos</CardTitle>
        <CardDescription>
          Configure os contatos da empresa para o assistente mostrar QR Codes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* WhatsApp */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp">
            WhatsApp da Empresa
          </Label>
          <Input
            id="whatsapp"
            type="tel"
            placeholder="(11) 99999-9999"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(formatWhatsApp(e.target.value))}
            maxLength={15}
          />
          <p className="text-xs text-muted-foreground">
            💡 Cliente pode pedir: "mostre o WhatsApp" ou "quero falar no WhatsApp"
          </p>
        </div>

        {/* Instagram */}
        <div className="space-y-2">
          <Label htmlFor="instagram">
            Instagram da Empresa
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">@</span>
            <Input
              id="instagram"
              placeholder="username"
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(formatInstagram(e.target.value))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Cliente pode pedir: "mostre o Instagram" ou "qual o Instagram?"
          </p>
        </div>

        {/* Divisor */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-sm mb-4">💰 Chave PIX para Recebimentos</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Esta chave será usada quando o assistente gerar PIX para seus clientes
          </p>
        </div>

        {/* Tipo de Chave PIX */}
        <div className="space-y-2">
          <Label htmlFor="pix-type">
            Tipo de Chave PIX
          </Label>
          <Select value={pixKeyType} onValueChange={setPixKeyType}>
            <SelectTrigger id="pix-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cpf">CPF</SelectItem>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="phone">Telefone</SelectItem>
              <SelectItem value="random">Chave Aleatória</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chave PIX */}
        <div className="space-y-2">
          <Label htmlFor="pix-key">
            Chave PIX
          </Label>
          <Input
            id="pix-key"
            placeholder={
              pixKeyType === 'cpf' ? '000.000.000-00' :
              pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
              pixKeyType === 'email' ? 'email@example.com' :
              pixKeyType === 'phone' ? '11999999999' :
              'chave-aleatoria'
            }
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            💡 Cliente pode pedir: "gerar PIX de R$ 50,00"
          </p>
        </div>

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
