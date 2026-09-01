'use client';

import { ProducaoTag } from '@/lib/types/producao';
import { LucideIcon } from 'lucide-react';

interface TagOption {
  tag: ProducaoTag;
  label: string;
  icon: LucideIcon;
  group?: 'origem' | 'função' | 'vendável';
}

interface TagSelectorProps {
  tags: ProducaoTag[];
  onChange: (tags: ProducaoTag[]) => void;
  options: TagOption[];
  theme?: 'dark' | 'light';
}

export default function TagSelector({ tags, onChange, options, theme = 'dark' }: TagSelectorProps) {
  const isDark = theme === 'dark';
  
  const C = {
    bg: isDark ? '#334155' : '#f8fafc',
    bgActive: '#3b82f6',
    text: isDark ? '#f1f5f9' : '#0f172a',
    border: isDark ? '#475569' : '#e2e8f0',
  };
  
  const toggleTag = (tag: ProducaoTag) => {
    // Lógica: algumas tags são mutuamente exclusivas
    const group = tag.split(':')[0] as 'origem' | 'função' | 'vendável';
    
    // Remover outras tags do mesmo grupo
    const filtered = tags.filter(t => !t.startsWith(`${group}:`));
    
    // Se já estava selecionada, remove; senão, adiciona
    if (tags.includes(tag)) {
      onChange(filtered);
    } else {
      onChange([...filtered, tag]);
    }
  };
  
  const isActive = (tag: ProducaoTag) => tags.includes(tag);
  
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {options.map(({ tag, label, icon: Icon }) => (
        <button
          key={tag}
          onClick={() => toggleTag(tag)}
          style={{
            padding: '8px 14px',
            background: isActive(tag) ? C.bgActive : C.bg,
            color: isActive(tag) ? 'white' : C.text,
            border: `1px solid ${C.border}`,
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
