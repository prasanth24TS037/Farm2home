import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageToggle = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Globe size={16} color="var(--color-text-muted)" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        style={{
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          border: 'var(--border-hairline)',
          backgroundColor: 'var(--color-bg-surface)',
          fontSize: '0.8125rem',
          color: 'var(--color-text-main)',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <option value="en">English</option>
        <option value="ta">தமிழ் (Tamil)</option>
        <option value="hi">हिंदी (Hindi)</option>
      </select>
    </div>
  );
};
