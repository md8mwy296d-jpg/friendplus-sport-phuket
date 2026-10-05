import { Link } from 'react-router';
import { Mail, MessageCircle } from 'lucide-react';
import { CATEGORIES } from '@/lib/catalog';
import { CONTACT_EMAIL, CONTACT_WHATSAPP, contactHref } from '@/lib/config';
import { useI18n } from '@/lib/i18n';
import Logo from './Logo';
import LanguageSelect from './LanguageSelect';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">{t('home.hero.subtitle')}</p>
          <LanguageSelect dark className="mt-5 w-fit" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{t('footer.services')}</p>
          <ul className="mt-4 grid gap-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link to={`/explorer?cat=${c.id}`} className="text-white/75 hover:text-white">{t(`cat.${c.id}`)}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{t('footer.help')}</p>
          <ul className="mt-4 grid gap-2 text-sm">
            <li><Link to="/reservations" className="text-white/75 hover:text-white">{t('nav.bookings')}</Link></li>
            <li><Link to="/conditions" className="text-white/75 hover:text-white">{t('footer.terms')}</Link></li>
            <li><Link to="/confidentialite" className="text-white/75 hover:text-white">{t('footer.privacy')}</Link></li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1.5 text-white/75 hover:text-white">
                <Mail className="h-4 w-4" /> {CONTACT_EMAIL}
              </a>
            </li>
            {CONTACT_WHATSAPP && (
              <li>
                <a href={contactHref()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white/75 hover:text-white">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs text-white/40">
        {t('footer.rights', { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
