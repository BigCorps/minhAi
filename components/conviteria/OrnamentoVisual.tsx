'use client';

export function OrnamentoCanto({ id = 'floral', className = '' }: { id?: string; className?: string }) {
  const comum = { fill: 'none', stroke: 'var(--cv-acento)', strokeWidth: 1.3 } as const;
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      {id === 'minimal' && <path d="M12 62 C34 44 45 26 56 8 M24 74 C47 61 67 43 84 18" {...comum} opacity=".48" />}
      {id === 'geometrico' && <>
        <path d="M8 72 L38 18 L64 64 L92 12" {...comum} opacity=".58" />
        <circle cx="38" cy="18" r="5" fill="var(--cv-petala-media)" opacity=".7" />
        <circle cx="64" cy="64" r="4" fill="var(--cv-acento)" opacity=".65" />
      </>}
      {id === 'classico' && <>
        <path d="M10 82 C26 31 66 26 74 8 C76 36 58 53 30 61 C54 62 78 49 98 27" {...comum} opacity=".6" />
        <path d="M29 60 C20 50 20 40 28 34 M51 48 C43 37 45 27 54 21" {...comum} opacity=".45" />
      </>}
      {id === 'rustico' && <>
        <path d="M8 88 C31 59 51 43 90 18" {...comum} opacity=".58" />
        {[26,42,58,73].map((x,i)=><ellipse key={x} cx={x} cy={74-i*13} rx="9" ry="4" transform={`rotate(-35 ${x} ${74-i*13})`} fill="var(--cv-folha)" opacity=".7"/>)}
      </>}
      {id === 'festivo' && <>
        <path d="M12 30 Q32 55 54 26 T98 28" {...comum} opacity=".55" />
        {[20,38,58,78,96].map((x,i)=><circle key={x} cx={x} cy={28+(i%2)*11} r={3+(i%3)} fill="var(--cv-acento)" opacity=".66"/>)}
      </>}
      {id === 'floral' && <>
        <path d="M10 92 C31 66 42 45 72 20" {...comum} opacity=".55"/>
        <ellipse cx="38" cy="63" rx="10" ry="5" transform="rotate(-38 38 63)" fill="var(--cv-folha)" opacity=".7"/>
        <ellipse cx="56" cy="45" rx="10" ry="5" transform="rotate(25 56 45)" fill="var(--cv-folha)" opacity=".7"/>
        <circle cx="74" cy="20" r="11" fill="var(--cv-petala-media)" opacity=".75"/>
        <circle cx="74" cy="20" r="5" fill="var(--cv-petala-clara)" opacity=".9"/>
      </>}
    </svg>
  );
}

export function OrnamentoDivisor({ id = 'floral' }: { id?: string }) {
  return (
    <svg className="cv-orn-divisor" viewBox="0 0 240 42" aria-hidden="true">
      {id === 'geometrico' && (
        <path d="M30 21 H92 L106 8 L120 21 L134 8 L148 21 H210"
          fill="none" stroke="var(--cv-acento)" strokeWidth="1.2" opacity=".55"/>
      )}

      {id === 'minimal' && <>
        <path d="M36 21 H204" fill="none" stroke="var(--cv-acento)" opacity=".38"/>
        <circle cx="120" cy="21" r="3" fill="var(--cv-acento)" opacity=".7"/>
      </>}

      {id === 'festivo' && <>
        {[70,88,106,124,142,160].map((x,i)=>
          <circle key={x} cx={x} cy={21 + (i%2?5:-5)} r="3"
            fill="var(--cv-acento)" opacity=".7"/>
        )}
        <path d="M30 21 H62 M178 21 H210" stroke="var(--cv-acento)" opacity=".38"/>
      </>}

      {id === 'floral' && <>
        <path d="M28 21 C58 21 78 20 99 21 M141 21 C162 20 182 21 212 21"
          fill="none" stroke="var(--cv-acento)" strokeWidth="1.15" opacity=".42"/>
        <path d="M104 29 C111 26 116 21 120 13 C124 21 129 26 136 29"
          fill="none" stroke="var(--cv-acento)" strokeWidth="1.15" opacity=".6"/>
        <ellipse cx="111" cy="24" rx="7" ry="3.2" transform="rotate(-34 111 24)"
          fill="var(--cv-folha)" opacity=".65"/>
        <ellipse cx="129" cy="24" rx="7" ry="3.2" transform="rotate(34 129 24)"
          fill="var(--cv-folha)" opacity=".65"/>
        <circle cx="120" cy="13" r="5.6" fill="var(--cv-petala-media)" opacity=".78"/>
        <circle cx="120" cy="13" r="2.4" fill="var(--cv-petala-clara)" opacity=".95"/>
      </>}

      {id === 'classico' && <>
        <path d="M28 22 C58 22 75 21 94 21
                 C103 21 108 14 112 11
                 C112 19 115 22 120 22
                 C125 22 128 19 128 11
                 C132 14 137 21 146 21
                 C165 21 182 22 212 22"
          fill="none" stroke="var(--cv-acento)" strokeWidth="1.2" opacity=".5"/>
        <path d="M103 26 C110 25 115 29 120 34 C125 29 130 25 137 26"
          fill="none" stroke="var(--cv-acento)" strokeWidth="1" opacity=".38"/>
        <path d="M120 16 l5 5 -5 5 -5-5z"
          fill="var(--cv-petala-media)" opacity=".58"/>
      </>}

      {id === 'rustico' && <>
        <path d="M28 22 H94 M146 22 H212"
          fill="none" stroke="var(--cv-acento)" strokeWidth="1.05" opacity=".36"/>
        <path d="M101 31 C110 27 119 21 138 10"
          fill="none" stroke="var(--cv-acento)" strokeWidth="1.2" opacity=".58"/>
        <ellipse cx="109" cy="26" rx="7" ry="3.3" transform="rotate(-28 109 26)"
          fill="var(--cv-folha)" opacity=".72"/>
        <ellipse cx="119" cy="20" rx="7" ry="3.3" transform="rotate(26 119 20)"
          fill="var(--cv-folha)" opacity=".72"/>
        <ellipse cx="129" cy="15" rx="7" ry="3.3" transform="rotate(-28 129 15)"
          fill="var(--cv-folha)" opacity=".72"/>
      </>}
    </svg>
  );
}
