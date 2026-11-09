'use client';

import React, { useEffect, useRef } from 'react';
import { ajustarAlturaTextarea } from '../lib/composer-textarea';

export default function ComposerInput({
  value,
  onChange,
  onKeyDown,
  placeholder = 'Escribe tu mensaje...',
  'aria-label': ariaLabel = 'Escribe tu mensaje',
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    ajustarAlturaTextarea(textareaRef.current);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className="composer-textarea"
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
    />
  );
}
