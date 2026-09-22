import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import StatusBadge from '@/components/StatusBadge';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEP_IMAGES = ['/sport-futsal.jpg', '/sport-padel.jpg', '/sport-dance.jpg'];

export default function HowItWorks() {
  const { t } = useI18n();
  const rootRef = useRef<HTMLElement>(null);

  const steps = [
    { n: '01', title: t('home.how.step1.title'), text: t('home.how.step1.text') },
    { n: '02', title: t('home.how.step2.title'), text: t('home.how.step2.text') },
    { n: '03', title: t('home.how.step3.title'), text: t('home.how.step3.text') },
    { n: '04', title: t('home.how.step4.title'), text: t('home.how.step4.text') },
  ];

  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mm = gsap.matchMedia();

    mm.add('(min-width: 1024px)', () => {
      if (reduced) return;
      const stepEls = gsap.utils.toArray<HTMLElement>('.how-step');
      const visuals = gsap.utils.toArray<HTMLElement>('.how-visual');
      gsap.set(stepEls, { opacity: 0.25, x: 24 });
      gsap.set(visuals, { autoAlpha: 0, y: 20, scale: 0.98 });
      gsap.set(visuals[0], { autoAlpha: 1, y: 0, scale: 1 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: '+=250%',
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
        },
      });

      tl.fromTo('.how-progress-fill', { scaleY: 0 }, { scaleY: 1, duration: 4, ease: 'none' }, 0);

      stepEls.forEach((step, i) => {
        tl.to(step, { opacity: 1, x: 0, duration: 0.5 }, i);
        if (i > 0) {
          tl.to(visuals[i - 1], { autoAlpha: 0, y: -20, scale: 0.98, duration: 0.4 }, i);
          tl.to(visuals[i], { autoAlpha: 1, y: 0, scale: 1, duration: 0.5 }, i);
        }
      });
      // step 4: confirmed badge pop
      tl.fromTo('.how-badge-pop', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.5)' }, 3.2);
      tl.to({}, { duration: 0.6 }); // breathing room at the end
    });

    mm.add('(max-width: 1023px)', () => {
      if (reduced) return;
      gsap.utils.toArray<HTMLElement>('.how-step').forEach((step) => {
        gsap.fromTo(step, { opacity: 0, y: 40 }, {
          opacity: 1, y: 0, duration: 0.7, ease: 'expo.out',
          scrollTrigger: { trigger: step, start: 'top 80%', once: true },
        });
      });
      gsap.set('.how-progress-fill', { scaleY: 1, transformOrigin: 'top' });
    });
  }, { scope: rootRef });

  return (
    <section ref={rootRef} id="how-it-works" className="relative overflow-hidden bg-[#FBF6EC]">
      {/* palm texture corner */}
      <div aria-hidden className="palm-texture pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] bg-[#0B2E2B] opacity-[0.06]" />

      <div className="mx-auto flex min-h-[100dvh] max-w-[1280px] flex-col justify-center px-6 py-20 lg:px-12">
        <div className="mb-12 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('home.how.eyebrow')}</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.02em] text-[#0B2E2B]">
            {t('home.how.title')}
          </h2>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* left: visual frame */}
          <div className="relative hidden aspect-[4/5] max-h-[560px] w-full overflow-hidden rounded-[24px] border border-[#EADFC8] bg-white shadow-paper lg:block">
            {STEP_IMAGES.map((src, i) => (
              <div key={src} className="how-visual absolute inset-0">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B2E2B]/45 via-transparent to-transparent" />
                <span className="absolute bottom-5 left-5 font-mono text-6xl font-bold text-white/85">{steps[i].n}</span>
              </div>
            ))}
            {/* step 4 visual: confirmed card */}
            <div className="how-visual absolute inset-0 flex flex-col items-center justify-center gap-5 bg-lagoon-deep">
              <div className="how-badge-pop flex h-24 w-24 items-center justify-center rounded-full bg-[#22C55E] shadow-[0_0_60px_rgba(34,197,94,.5)]">
                <Check className="h-12 w-12 text-white" strokeWidth={3} />
              </div>
              <StatusBadge status="confirmed" className="!border-[#22C55E]/50 !bg-white/10 !text-[#7DFFA8]" />
              <span className="font-mono text-6xl font-bold text-white/40">{steps[3].n}</span>
            </div>
          </div>

          {/* right: steps + progress line */}
          <div className="relative">
            <div className="absolute bottom-4 left-[7px] top-4 w-0.5 bg-[#EADFC8]">
              <div className="how-progress-fill h-full w-full origin-top bg-[#0E8C7F]" />
            </div>
            <ol className="space-y-10">
              {steps.map((step) => (
                <li key={step.n} className="how-step relative pl-12">
                  <span className="absolute left-0 top-1 h-4 w-4 rounded-full border-[3px] border-[#0E8C7F] bg-[#FBF6EC]" />
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
