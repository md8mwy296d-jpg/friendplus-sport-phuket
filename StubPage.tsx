import { useI18n } from '@/lib/i18n';
import { Construction } from 'lucide-react';

interface StubPageProps {
  titleKey: string;
}

/** Simple placeholder page — replaced by page agents. */
export function StubPage({ titleKey }: StubPageProps) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[50dvh] max-w-[1280px] flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0E8C7F]/10 text-[#0E8C7F]">
        <Construction className="h-6 w-6" />
      </span>
      <h1 className="font-display text-3xl font-bold text-[#0B2E2B]">{t(titleKey)}</h1>
      <p className="max-w-md text-[15px] text-[#0B2E2B]/55">{t('page.stub')}</p>
    </div>
  );
}
