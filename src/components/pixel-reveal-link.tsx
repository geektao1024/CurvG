import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
} from 'react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { PixelArrowRail } from '@/components/pixel-arrow';

const SCRAMBLE_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{};:,.<>?';
const SCRAMBLE_WIDTH = 6;
const SCRAMBLE_INTERVAL_MS = 32;

type PixelRevealVariant = 'primary' | 'navigation' | 'nav-item';

interface PixelRevealLinkProps {
  href: string;
  label: string;
  variant?: PixelRevealVariant;
  className?: string;
  target?: '_blank' | '_self';
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

function getDefaultPixelDelays(variant: PixelRevealVariant) {
  if (variant === 'primary') {
    return [405, 360, 225, 180, 45, 450, 315, 270, 135, 90];
  }

  return variant === 'navigation' ? [450, 225] : [];
}

function getPixelDelays(variant: PixelRevealVariant) {
  if (variant === 'nav-item') return [];

  const columns = variant === 'primary' ? 5 : 2;
  const rows = variant === 'primary' ? 2 : 1;
  const interval = variant === 'primary' ? 45 : 225;
  const delays = Array.from({ length: columns * rows }, () => 0);
  let step = 1;

  for (let column = columns - 1; column >= 0; column -= 1) {
    const rowOrder = Array.from({ length: rows }, (_, row) => row);

    if (rows > 1 && Math.random() > 0.5) {
      rowOrder.reverse();
    }

    for (const row of rowOrder) {
      delays[row * columns + column] = step * interval;
      step += 1;
    }
  }

  return delays;
}

function getScrambledCharacter(source: string, index: number, step: number) {
  if (/\s/u.test(source)) return source;

  const character =
    SCRAMBLE_CHARACTERS[
      (step * 17 + index * 13 + source.codePointAt(0)!) %
        SCRAMBLE_CHARACTERS.length
    ];

  if (
    source.toLocaleLowerCase() === source &&
    source.toLocaleUpperCase() !== source
  ) {
    return character.toLocaleLowerCase();
  }

  return character;
}

function getScrambleSegments(label: string, step: number) {
  const characters = Array.from(label);
  const prefixEnd = Math.min(
    characters.length,
    Math.max(0, step - SCRAMBLE_WIDTH)
  );
  const scrambleEnd = Math.min(characters.length, Math.max(0, step));

  return {
    prefix: characters.slice(0, prefixEnd).join(''),
    scrambled: characters
      .slice(prefixEnd, scrambleEnd)
      .map((character, index) =>
        getScrambledCharacter(character, prefixEnd + index, step)
      )
      .join(''),
    hidden: characters.slice(scrambleEnd).join(''),
    totalSteps: characters.length + SCRAMBLE_WIDTH,
  };
}

export function PixelRevealLink({
  href,
  label,
  variant = 'primary',
  className,
  target,
  onClick,
}: PixelRevealLinkProps) {
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const pressedRef = useRef(false);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);
  const [animationCycle, setAnimationCycle] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [scrambleStep, setScrambleStep] = useState(0);
  const [pixelDelays, setPixelDelays] = useState(() =>
    getDefaultPixelDelays(variant)
  );

  const setInteractionState = (nextActive: boolean) => {
    if (nextActive && !activeRef.current) {
      if (variant !== 'nav-item') {
        setPixelDelays(getPixelDelays(variant));
      }
      setAnimationCycle((cycle) => cycle + 1);
    }

    activeRef.current = nextActive;
    setActive(nextActive);
  };

  const syncInteractionState = () => {
    setInteractionState(
      hoveredRef.current || focusedRef.current || pressedRef.current
    );
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener('change', updateReducedMotion);

    return () => mediaQuery.removeEventListener('change', updateReducedMotion);
  }, []);

  useEffect(() => {
    if (!active) {
      setScrambleStep(0);
      return;
    }

    const totalSteps = Array.from(label).length + SCRAMBLE_WIDTH;

    if (reducedMotion) {
      setScrambleStep(totalSteps);
      return;
    }

    let nextStep = 0;
    setScrambleStep(0);

    const timer = window.setInterval(() => {
      nextStep += 1;
      setScrambleStep(nextStep);

      if (nextStep >= totalSteps) {
        window.clearInterval(timer);
      }
    }, SCRAMBLE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [active, animationCycle, label, reducedMotion]);

  const scramble = getScrambleSegments(label, scrambleStep);

  return (
    <Link
      href={href}
      target={target}
      aria-label={label}
      className={cn('curvg-pixel-reveal-link', className)}
      data-active={active}
      data-variant={variant}
      onPointerEnter={() => {
        hoveredRef.current = true;
        syncInteractionState();
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
        pressedRef.current = false;
        syncInteractionState();
      }}
      onPointerDown={() => {
        pressedRef.current = true;
        syncInteractionState();
      }}
      onPointerUp={() => {
        pressedRef.current = false;
        syncInteractionState();
      }}
      onPointerCancel={() => {
        pressedRef.current = false;
        syncInteractionState();
      }}
      onFocus={(event) => {
        focusedRef.current = event.currentTarget.matches(':focus-visible');
        syncInteractionState();
      }}
      onBlur={() => {
        focusedRef.current = false;
        pressedRef.current = false;
        syncInteractionState();
      }}
      onClick={onClick}
    >
      {variant !== 'nav-item' && (
        <span
          key={animationCycle}
          className="curvg-pixel-reveal-grid"
          aria-hidden="true"
        >
          {pixelDelays.map((delay, index) => (
            <span
              key={`${variant}-${index}`}
              className="curvg-pixel-reveal-cell"
              style={{ '--curvg-pixel-delay': `${delay}ms` } as CSSProperties}
            />
          ))}
        </span>
      )}

      <span className="curvg-pixel-reveal-content" aria-hidden="true">
        <span className="curvg-pixel-label-stack">
          <span className="curvg-pixel-label-base">{label}</span>
          {active && (
            <span className="curvg-pixel-label-scramble">
              <span>{scramble.prefix}</span>
              <span className="curvg-pixel-label-noise">
                {scramble.scrambled}
              </span>
              <span className="curvg-pixel-label-hidden">
                {scramble.hidden}
              </span>
            </span>
          )}
        </span>

        {variant === 'primary' && <PixelArrowRail />}
      </span>
    </Link>
  );
}
