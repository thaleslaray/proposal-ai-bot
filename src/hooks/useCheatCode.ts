import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

const CHEAT_SEQUENCE = [
  'Shift',
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
];

export const useCheatCode = () => {
  const [sequence, setSequence] = useState<string[]>([]);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (activated) return;

    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora teclas seguradas (repetidas)
      if (e.repeat) return;

      clearTimeout(timeout);

      setSequence(prevSequence => {
        const newSequence = [...prevSequence, e.key];

        // Se ultrapassou o tamanho esperado, remove o primeiro
        if (newSequence.length > CHEAT_SEQUENCE.length) {
          newSequence.shift();
        }

        // Verifica se a sequência está correta
        const isCorrect = CHEAT_SEQUENCE.every((key, index) => newSequence[index] === key);

        if (isCorrect && newSequence.length === CHEAT_SEQUENCE.length) {
          logger.log('🎮 Konami Code ativado!');
          setActivated(true);
          return [];
        }

        return newSequence;
      });

      // Reset da sequência após 3 segundos sem input
      timeout = setTimeout(() => {
        setSequence([]);
      }, 3000);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [activated]);

  return { activated };
};
