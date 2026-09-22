import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

const ITEMS = ['home.marquee.1', 'home.marquee.2', 'home.marquee.3', 'home.marquee.4', 'home.marquee.5', 'home.marquee.6'];

export default function Marquee() {
  const { t } = useI18n();
  const strip = (
    <>
      {ITEMS.concat(ITEMS).map((key, i) => (
        <span key={i} className="mx-5 inline-flex items-center gap-10 whitespace-nowrap font-display text-xl font-bold text-white">
          {t(key)} <span className="text-white/70">✦</span>
        </span>
      ))}
    </>
  );
  return (
    <motion.div
      initial={{ x: -120, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.9 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="marquee-paused relative z-10 -my-3 -rotate-[1.5deg] scale-[1.02] overflow-hidden bg-[#FF6B4A] py-4 shadow-[0_8px_30px_rgba(255,107,74,.35)]"
      aria-hidden
    >
      <div className="animate-marquee flex w-max">
        <div className="flex">{strip}</div>
        <div className="flex">{strip}</div>
      </div>
    </motion.div>
  );
}
