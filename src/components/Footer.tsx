import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { useI18n, LANGS } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from './SportIcon';
import { SPORTS } from '@/lib/sports';


export default function Footer() {
  const { t, lang, setLang } = useI18n();

  const cols = [
    {
      title: t('footer.col.explore'),
      links: [
        { to: '/explorer', label: t('nav.explore') },
        { to: '/mes-sessions', label: t('footer.mySessions') },
        { to: '/creer', label: t('footer.createSession') },
      ],
    },
    {
      title: t('footer.col.sports'),
      links: SPORTS.map((s) => ({ to: `/explorer?sport=${s}`, label: t(`sport.${s}`) })),
    },
    {
      title: t('footer.col.info'),
      links: [
        { to: '/#how-it-works', label: t('footer.howItWorks') },
        { to: '/salles', label: t('footer.partnerVenues') },
        { to: '/profil', label: t('footer.contact') },
      ],
    },
  ];

  return (
    <footer className="relative">
      {/* wave top (dark wave rising into the light section above) */}
      <div
        aria-hidden
        className="h-[60px] w-full md:h-[90px]"
        style={{
          backgroundColor: '#0B2E2B',
          maskImage: 'url(/wave-divider.svg)',
          WebkitMaskImage: 'url(/wave-divider.svg)',
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
        }}
      />
      <div className="relative bg-[#0B2E2B]">
        {/* palm watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            maskImage: 'url(/texture-palm.svg)',
            WebkitMaskImage: 'url(/texture-palm.svg)',
            maskSize: '560px',
            WebkitMaskSize: '560px',
          }}
        />
        <div className="relative mx-auto max-w-[1280px] px-6 pb-10 pt-14 lg:px-12">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to="/" className="flex items-center gap-2.5">
                <img src="/logo.svg" alt="FRIEND+" className="h-10 w-10" />
                <span className="leading-none">
                  <span className="font-display text-xl font-extrabold tracking-tight text-white">
                    FRIEND<span className="text-[#FF6B4A]">+</span>
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                    {t('nav.tagline')}
                  </span>
                </span>
              </Link>
              <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-white/55">{t('footer.tagline')}</p>
            </motion.div>

            {cols.map((col, ci) => (
              <motion.div
                key={col.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: 0.08 * (ci + 1), ease: [0.22, 1, 0.36, 1] }}
              >
                <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#2FBFA5]">{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="text-sm text-white/65 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* sport icons strip */}
          <div className="mt-10 flex flex-wrap gap-3 border-t border-white/10 pt-8">
            {SPORTS.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/60">
                <SportIcon sport={s} className="h-3.5 w-3.5 text-[#2FBFA5]" />
                {t(`sport.${s}`)}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-white/45">
              {t('footer.demo')} · {t('footer.rights')}
            </p>
            <div className="flex gap-1.5">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                    lang === l.code ? 'bg-white text-[#0B2E2B]' : 'text-white/50 hover:text-white',
                  )}
                >
                  {l.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
