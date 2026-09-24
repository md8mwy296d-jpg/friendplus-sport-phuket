import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import { sportPhoto } from '@/lib/sportPhotos';

// new photos every week
const STEP_IMAGES = [sportPhoto('padel', 'how'), sportPhoto('futsal', 'how'), sportPhoto('dance', 'how')];

/** Step 4: the "confirmed" card shown instead of a photo. */
function ConfirmedVisual({ n }: { n: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-lagoon-deep">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#22C55E] shadow-[0_0_60px_rgba(34,197,94,.5)]">
        <Check className="h-12 w-12 text-white" strokeWidth={3} />
      </div>
      <StatusBadge status="confirmed" className="!border-[#22C55E]/50 !bg-white/10 !text-[#7DFFA8]" />
      <span className="font-mono text-6xl font-bold text-white/40">{n}</span>
    </div>
  );
}

function StepPhoto({ src, n }: { src: string; n: string }) {
  return (
    <>
      <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B2E2B]/45 via-transparent to-transparent" />
      <span className="absolute bottom-5 left-5 font-mono text-6xl font-bold text-white/85">{n}</span>
    </>
  );
}

/**
 * "The concept": four steps. The page scrolls normally (no pinning):
 * on desktop the picture stays in view (CSS sticky) and cross-fades to the step being read;
 * on phones each step shows its own picture.
 */
export default function HowItWorks() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  const steps = [
    { n: '01', title: t('home.how.step1.title'), text: t('home.how.step1.text') },
    { n: '02', title: t('home.how.step2.title'), text: t('home.how.step2.text') },
    { n: '03', title: t('home.how.step3.title'), text: t('home.how.step3.text') },
    { n: '04', title: t('home.how.step4.title'), text: t('home.how.step4.text') },
  ];

  // the step crossing the middle of the screen is the active one
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="relative bg-[#FBF6EC]">
      {/* palm texture corner */}
      <div aria-hidden className="palm-texture pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] bg-[#0B2E2B] opacity-[0.06]" />

      <div className="relative mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28">
        <div className="mb-12 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('home.how.eyebrow')}</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.02em] text-[#0B2E2B]">
            {t('home.how.title')}
          </h2>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* left: picture that follows the reader, always fully on screen */}
          <div className="hidden lg:block">
            <div className="sticky top-[calc(72px+(100vh-72px-min(72vh,600px))/2)]">
              <div className="relative h-[min(72vh,600px)] w-full overflow-hidden rounded-[24px] border border-[#EADFC8] bg-white shadow-paper">
                {steps.map((step, i) => (
                  <div
                    key={step.n}
                    aria-hidden={active !== i}
                    className={cn(
                      'absolute inset-0 transition-all duration-700 ease-out',
                      active === i ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0',
                    )}
                  >
                    {i < STEP_IMAGES.length ? <StepPhoto src={STEP_IMAGES[i]} n={step.n} /> : <ConfirmedVisual n={step.n} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* right: steps + progress line */}
          <div className="relative">
            <div className="absolute bottom-4 left-[7px] top-4 w-0.5 bg-[#EADFC8]">
              <div
                className="h-full w-full origin-top bg-[#0E8C7F] transition-transform duration-700 ease-out"
                style={{ transform: `scaleY(${(active + 1) / steps.length})` }}
              />
            </div>
            <ol className="space-y-12 lg:space-y-0">
              {steps.map((step, i) => (
                <li
                  key={step.n}
                  ref={(el) => { stepRefs.current[i] = el; }}
                  data-step={i}
                  className={cn(
                    'relative pl-12 transition-opacity duration-500 lg:flex lg:min-h-[60vh] lg:flex-col lg:justify-center',
                    active === i ? 'lg:opacity-100' : 'lg:opacity-40',
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-0 top-1 h-4 w-4 rounded-full border-[3px] border-[#0E8C7F] transition-colors duration-500 lg:top-1/2 lg:-translate-y-1/2',
                      i <= active ? 'bg-[#0E8C7F]' : 'bg-[#FBF6EC]',
                    )}
                  />
                  {/* phones: each step has its own picture */}
                  <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-[20px] border border-[#EADFC8] bg-white shadow-paper lg:hidden">
                    {i < STEP_IMAGES.length ? <StepPhoto src={STEP_IMAGES[i]} n={step.n} /> : <ConfirmedVisual n={step.n} />}
                  </div>
                  <span className="font-mono text-5xl font-bold text-[#FF6B4A]/85">{step.n}</span>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-[#0B2E2B]">{step.title}</h3>
                  <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[#0B2E2B]/60">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
