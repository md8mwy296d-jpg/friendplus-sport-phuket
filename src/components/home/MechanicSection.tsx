import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { BellRing, Timer, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { SEED_USERS } from '@/lib/seed';
import StatusBadge from '@/components/StatusBadge';
import PlayerAvatar from '@/components/PlayerAvatar';
import SportIcon from '@/components/SportIcon';
import type { SessionStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { sportPhoto } from '@/lib/sportPhotos';

const QUOTA = 10;
const CYCLE_MS = 8000;

type Phase = 'filling' | 'full' | 'counting' | 'confirmed';

const BULLETS = [
  { icon: Timer, title: 'home.mech.b1.title', text: 'home.mech.b1.text' },
  { icon: Users, title: 'home.mech.b2.title', text: 'home.mech.b2.text' },
  { icon: BellRing, title: 'home.mech.b3.title', text: 'home.mech.b3.text' },
];

/** Self-playing session card loop (8s): quota 6/10 → 10/10 → Complet → countdown → Confirmée + confetti. */
function DemoCard() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('filling');
  const [players, setPlayers] = useState(6);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timers: number[] = [];
    let mounted = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const runCycle = () => {
      if (!mounted) return;
      setPhase('filling');
      setPlayers(6);
      // fill 6 -> 10 over ~3s
      [7, 8, 9, 10].forEach((n, i) => {
        timers.push(window.setTimeout(() => mounted && setPlayers(n), 400 + i * 650));
      });
      timers.push(window.setTimeout(() => mounted && setPhase('full'), 3100));
      timers.push(window.setTimeout(() => mounted && setPhase('counting'), 4300));
      timers.push(window.setTimeout(() => {
        if (!mounted) return;
        setPhase('confirmed');
        if (!reduced && cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          confetti({
            particleCount: 40,
            spread: 75,
            startVelocity: 30,
            ticks: 120,
            origin: {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight,
            },
            colors: ['#FF6B4A', '#FFB547', '#0E8C7F', '#2FBFA5', '#22C55E'],
            disableForReducedMotion: true,
          });
        }
      }, 5600));
    };

    runCycle();
    const loop = window.setInterval(runCycle, CYCLE_MS);
    return () => {
      mounted = false;
      window.clearInterval(loop);
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
    };
  }, []);

  const status: SessionStatus = phase === 'confirmed' ? 'confirmed' : phase === 'filling' ? 'open' : 'full';

  return (
    <div
      ref={cardRef}
      className="w-full max-w-md overflow-hidden rounded-[20px] border border-[#EADFC8] bg-white shadow-[0_4px_12px_rgba(11,46,43,.08),0_28px_70px_rgba(11,46,43,.16)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={sportPhoto('futsal', 'mechanic')} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2E2B]/50 to-transparent" />
        <div className="absolute left-3 top-3">
          <StatusBadge status={status} className="bg-white/90 backdrop-blur" />
        </div>
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#0B2E2B] backdrop-blur">
          <SportIcon sport="futsal" className="h-3.5 w-3.5 text-[#0E8C7F]" />
          {t('sport.futsal')}
        </div>
      </div>
      <div className="relative border-t-2 border-dashed border-[#EADFC8]">
        <span className="absolute -left-[11px] -top-[11px] h-5 w-5 rounded-full border border-[#EADFC8] bg-[#FBF6EC]" />
        <span className="absolute -right-[11px] -top-[11px] h-5 w-5 rounded-full border border-[#EADFC8] bg-[#FBF6EC]" />
      </div>
      <div className="space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold text-[#0B2E2B]">{t('home.mech.demo.title')}</h3>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-mono font-bold tabular-nums text-[#0B2E2B]">{players}/{QUOTA} <span className="font-medium text-[#0B2E2B]/50">{t('common.players')}</span></span>
            <span className={cn('font-mono font-bold tabular-nums', phase === 'counting' ? 'animate-pulse text-[#FF6B4A]' : 'text-[#0B2E2B]/50')}>
              {phase === 'counting' ? '00:00:03' : phase === 'confirmed' ? '00:00:00' : '23:41:12'}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: QUOTA }).map((_, i) => (
              <motion.span
                key={i}
                initial={false}
                animate={i < players ? { scale: [0.6, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className={cn(
                  'h-2 flex-1 rounded-full transition-colors duration-300',
                  i < players
                    ? phase === 'confirmed'
                      ? 'bg-[#22C55E]'
                      : 'bg-[linear-gradient(120deg,#0E8C7F,#2FBFA5,#FFB547,#FF6B4A)]'
                    : 'bg-[#EADFC8]',
                )}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#EADFC8]/70 pt-3">
          <div className="flex -space-x-2">
            {SEED_USERS.slice(1, Math.min(1 + players, 6)).map((u) => (
              <PlayerAvatar key={u.id} user={u} size={28} />
            ))}
            {players > 5 && (
              <span className="inline-flex h-7 items-center justify-center rounded-full bg-[#FBF6EC] px-1.5 text-[11px] font-bold text-[#0B2E2B]/60 ring-2 ring-white">
                +{players - 5}
              </span>
            )}
          </div>
          <span className="font-mono text-sm font-bold text-[#0B2E2B]">150 ฿</span>
        </div>
      </div>
    </div>
  );
}

export default function MechanicSection() {
  const { t } = useI18n();
  return (
    <section className="overflow-x-clip bg-[#FBF6EC] py-20 lg:py-28">
      <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-6 lg:grid-cols-2 lg:px-12">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6B4A]">{t('home.mech.eyebrow')}</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.02em] text-[#0B2E2B]">
            {t('home.mech.title')}
          </h2>
          <ul className="mt-8 space-y-6">
            {BULLETS.map((b) => (
              <li key={b.title} className="flex gap-4">
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0E8C7F]/10 text-[#0E8C7F]">
                  <b.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#0B2E2B]">{t(b.title)}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#0B2E2B]/60">{t(b.text)}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center"
        >
          <DemoCard />
        </motion.div>
      </div>
    </section>
  );
}
