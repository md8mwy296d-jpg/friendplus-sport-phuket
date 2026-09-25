import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

/** Privacy policy generated with Termly, served as a static file (public/privacy-policy.html). */
export default function Privacy() {
  const { t } = useI18n();
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/privacy-policy.html')
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => { if (alive) setHtml(text); })
      .catch(() => { if (alive) setHtml(''); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
      {html === null ? (
        <p className="py-20 text-center text-sm text-[#0B2E2B]/45">{t('common.loading')}</p>
      ) : html === '' ? (
        <p className="py-20 text-center text-sm text-[#0B2E2B]/60">contact01friendplussport@gmail.com</p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] border border-[#EADFC8] bg-white p-6 sm:p-10" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}
