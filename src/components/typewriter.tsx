import { useEffect, useState } from 'react';

/**
 * 打字机文字：循环 打出 → 停留 → 删除 词组，
 * 光标闪烁由 CSS .curvg-cursor（0.8s steps(1)）负责。
 * 尊重 prefers-reduced-motion：直接静态显示首个词。
 */
export function Typewriter({
  words,
  className,
  typeMs = 70,
  deleteMs = 40,
  holdMs = 2200,
}: {
  words: string[];
  className?: string;
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
}) {
  const [text, setText] = useState(words[0] ?? '');
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting'>(
    'typing'
  );
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduced) {
      setText(words[0] ?? '');
      return;
    }
    const word = words[wordIndex % words.length] ?? '';

    if (phase === 'typing') {
      if (text.length < word.length) {
        const t = setTimeout(
          () => setText(word.slice(0, text.length + 1)),
          typeMs
        );
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('deleting'), holdMs);
      return () => clearTimeout(t);
    }

    if (phase === 'deleting') {
      if (words.length === 1) return; // 单词组：不删除，保持静态
      if (text.length > 0) {
        const t = setTimeout(() => setText(text.slice(0, -1)), deleteMs);
        return () => clearTimeout(t);
      }
      setWordIndex((i) => (i + 1) % words.length);
      setPhase('typing');
    }
  }, [text, phase, wordIndex, words, reduced, typeMs, deleteMs, holdMs]);

  return (
    <span className={className}>
      {text}
      <span className="curvg-cursor" aria-hidden />
    </span>
  );
}
