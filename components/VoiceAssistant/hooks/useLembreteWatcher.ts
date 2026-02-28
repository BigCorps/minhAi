// ============================================================
// useLembreteWatcher.ts
// Caminho: components/VoiceAssistant/hooks/useLembreteWatcher.ts
//
// Otimizado: o intervalo só existe enquanto houver lembretes
// ou alarmes pendentes no localStorage. Se a lista estiver
// vazia, o hook fica em modo "sleep" e só acorda quando
// um novo item for salvo (evento customizado na mesma aba).
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { ActiveModal } from '../types';

interface Lembrete {
  id: number;
  titulo: string;
  descricao?: string;
  dateTime: string; // ISO string
}

interface Alarme {
  id: number;
  label: string;
  targetTime: string; // ISO string
}

interface Props {
  setActiveModal: (modal: ActiveModal | null) => void;
  playText: (text: string) => Promise<void>;
  companyId: string;
}

export function useLembreteWatcher({ setActiveModal, playText, companyId }: Props) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const check = () => {
      const now = Date.now();

      // ── Verificar Lembretes ─────────────────────────────
      try {
        const raw = localStorage.getItem('eai_lembretes');
        if (raw) {
          const lembretes: Lembrete[] = JSON.parse(raw);
          const restantes: Lembrete[] = [];

          for (const lembrete of lembretes) {
            const target = new Date(lembrete.dateTime).getTime();

            // Dispara se a hora chegou (com tolerância de 15s para não perder o tick)
            if (target <= now && target >= now - 15000) {
              console.log('🔔 Lembrete disparando:', lembrete.titulo);

              // Fala o aviso
              playText(`Atenção! Lembrete: ${lembrete.titulo}.`).catch(() => {});

              // Abre o modal no modo alarming
              setActiveModal({
                type: 'CriarLembreteDisplay',
                data: {
                  companyId,
                  titulo: lembrete.titulo,
                  descricao: lembrete.descricao,
                  isAlarming: true,
                },
              });

              // Não adiciona de volta — lembrete foi consumido
            } else if (target > now) {
              // Ainda não chegou a hora — mantém na lista
              restantes.push(lembrete);
            }
            // Se target < now - 15s: já passou da janela, descarta silenciosamente
          }

          localStorage.setItem('eai_lembretes', JSON.stringify(restantes));
        }
      } catch (e) {
        console.error('useLembreteWatcher: erro ao ler lembretes', e);
      }

      // ── Verificar Alarmes ───────────────────────────────
      try {
        const raw = localStorage.getItem('eai_alarmes');
        if (raw) {
          const alarmes: Alarme[] = JSON.parse(raw);
          const restantes: Alarme[] = [];

          for (const alarme of alarmes) {
            const target = new Date(alarme.targetTime).getTime();

            if (target <= now && target >= now - 15000) {
              console.log('⏰ Alarme disparando:', alarme.label);

              // Fala o aviso
              playText(`Atenção! ${alarme.label}. Seu alarme está tocando!`).catch(() => {});

              // Abre o modal no modo alarming
              setActiveModal({
                type: 'AlarmeDisplay',
                data: {
                  companyId,
                  label: alarme.label,
                  isAlarming: true,
                },
              });

              // Consumido — não volta para a lista
            } else if (target > now) {
              restantes.push(alarme);
            }
          }

          localStorage.setItem('eai_alarmes', JSON.stringify(restantes));
        }
      } catch (e) {
        console.error('useLembreteWatcher: erro ao ler alarmes', e);
      }
    };

    // Verifica imediatamente ao montar e depois a cada 10 segundos
    check();
    intervalRef.current = setInterval(check, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [companyId]); // Reinicia se companyId mudar
}
