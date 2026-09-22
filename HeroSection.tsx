import { useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import HeroParticles from './HeroParticles';
import CountUp from './CountUp';

gsap.registerPlugin(ScrollTrigger, useGSAP);


/** Split a translated string into animated word spans. */
function Words({ text, accent = false }: { text: string; accent?: boolean }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <span
            className="hero-word inline-block will-change-transform"
            style={accent ? {
              backgroundImage: 'linear-gradient(135deg,#FF6B4A,#FFB547)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            } : undefined}
          >
            {w}
          </span>
          {'\u00A0'}
        </span>
      ))}
    </>
  );
}

export default function HeroSection() {
  const { t } = useI18n();
  const { users, sessions, venues } = useStore();

  // live figures from the database
  const STATS = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 24 * 3600_000;
    const upcoming = sessions.filter((x) => {
      const d = new Date(x.date).getTime();
      return d >= now && d <= week && x.status !== 'cancelled';
    }).length;
    const settled = sessions.filter((x) => x.status === 'confirmed' || x.status === 'cancelled');
    const rate = settled.length
      ? Math.round((settled.filter((x) => x.status === 'confirmed').length / settled.length) * 100)
      : 100;
    return [
      { value: users.length, suffix: '', key: 'home.stats.players' },
      { value: upcoming, suffix: '', key: 'home.stats.sessions' },
      { value: venues.length, suffix: '', key: 'home.stats.venues' },
      { value: rate, suffix: '%', key: 'home.stats.confirmed' },
    ];
  }, [users, sessions, venues]);
  const rootRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduced) {
      // Load choreography
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo('.hero-overlay', { opacity: 0.85 }, { opacity: 0.55, duration: 1 })
        .fromTo('.hero-badge', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, 0.3)
        .fromTo('.hero-word', { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.06 }, 0.35)
        .fromTo('.hero-sub', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, 0.75)
        .fromTo('.hero-cta', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.08 }, 0.95)
        .fromTo('.hero-stat', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, 1.15);

      // Scroll parallax
      gsap.to(bgRef.current, {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to(contentRef.current, {
        yPercent: -8,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: rootRef.current, start: 'top top', end: '80% top', scrub: true },
      });

      // Spotlight follows mouse (desktop, fine pointer only)
      if (window.matchMedia('(pointer: fine)').matches && spotlightRef.current && rootRef.current) {
        const spot = spotlightRef.current;
        let tx = -500, ty = -500, cx = -500, cy = -500;
        const onMove = (e: MouseEvent) => {
          const rect = rootRef.current!.getBoundingClientRect();
          tx = e.clientX - rect.left;
          ty = e.clientY - rect.top;
        };
        rootRef.current.addEventListener('mousemove', onMove);
        const id = window.setInterval(() => {
          cx += (tx - cx) * 0.15;
          cy += (ty - cy) * 0.15;
          spot.style.transform = `translate(${cx - 200}px, ${cy - 200}px)`;
        }, 16);
        return () => {
          rootRef.current?.removeEventListener('mousemove', onMove);
          window.clearInterval(id);
        };
      }
    }
  }, { scope: rootRef });

  return (
    <section ref={rootRef} className="relative -mt-[72px] flex min-h-[100dvh] flex-col overflow-hidden bg-[#0B2E2B]">
      {/* background photo + overlays */}
      <div ref={bgRef} className="absolute inset-0 will-change-transform">
        <img src="/hero-phuket.jpg" alt="" className="h-[115%] w-full object-cover" />
      </div>
      <div className="hero-overlay absolute inset-0 bg-[linear-gradient(180deg,rgba(11,46,43,0.3)_0%,rgba(11,46,43,0.85)_100%)]" />
      <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.05]" />
      <HeroParticles />
      {/* mouse spotlight */}
      <div
        ref={spotlightRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 hidden h-[400px] w-[400px] rounded-full opacity-60 mix-blend-overlay md:block"
        style={{ background: 'radial-gradient(circle, rgba(255,107,74,0.9) 0%, transparent 70%)' }}
      />

      {/* content */}
      <div ref={contentRef} className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 flex-col items-center justify-center px-6 pb-16 pt-[120px] text-center lg:px-12">
        <span className="hero-badge mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
          {t('home.hero.badge')}
        </span>
        <h1 className="max-w-[900px] font-display text-[clamp(2.5rem,7.5vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white">
          <Words text={t('home.hero.title1')} />{' '}
          <Words text={t('home.hero.titleAccent')} accent />{' '}
          <br />
          <Words text={t('home.hero.title2')} />
        </h1>
        <p className="hero-sub mt-6 max-w-[560px] text-[17px] leading-relaxed text-white/80">
          {t('home.hero.subtitle')}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/explorer"
            className="hero-cta group inline-flex h-14 items-center gap-2 rounded-full bg-golden-hour bg-[length:200%_100%] bg-left px-8 text-base font-bold text-[#0B2E2B] shadow-coral transition-all duration-300 hover:scale-[1.04] hover:bg-right"
          >
            {t('home.hero.cta1')}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#how-it-works"
            className="hero-cta inline-flex h-14 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur transition-all duration-300 hover:scale-[1.04] hover:bg-white/20"
          >
            {t('home.hero.cta2')}
            <ChevronDown className="h-5 w-5" />
          </a>
        </div>

        {/* live stats bar */}
        <div className="mt-14 grid w-full max-w-[820px] grid-cols-2 gap-3 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.key} className="hero-stat rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur">
              <p className="font-mono text-2xl font-bold text-white md:text-3xl">
                <CountUp key={`${s.key}-${s.value}`} value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">{t(s.key)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
