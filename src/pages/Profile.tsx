import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  Bell, CalendarPlus, Check, CheckCircle2, ChevronDown, Dumbbell,
  Globe, LogOut, MailCheck, MapPin, Save, Star, Trophy, X,
} from 'lucide-react';
import type { Lang, Level, Sport } from '@/lib/types';
import { useStore } from '@/lib/store';
import { countryOptions } from '@/lib/countries';
import { LANGS, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from '@/components/SportIcon';
import CountUp from '@/components/home/CountUp';
import AvatarEditor from '@/components/AvatarEditor';
import { SPORTS } from '@/lib/sports';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const ALL_SPORTS = SPORTS;
const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];
const LANG_CHOICES = ['FR', 'EN', 'RU', 'TH', 'DE', 'ES', 'IT', 'ZH'];

const EXTRAS_KEY = 'friendplus.profileExtras';
const SAVED_FLAG = 'friendplus.flashSaved';

interface NotifPrefs { reminder: boolean; invites: boolean; newSessions: boolean }
interface Extras {
  sportLevels: Partial<Record<Sport, Level>>;
  languages: string[];
  notif: NotifPrefs;
  area: string;
}

function loadExtras(defaultArea: string, defaultLang: string): Extras {
  const fallback: Extras = {
    sportLevels: {},
    languages: [defaultLang],
    notif: { reminder: true, invites: true, newSessions: true },
    area: defaultArea,
  };
  try {
    const raw = localStorage.getItem(EXTRAS_KEY);
    if (raw) return { ...fallback, ...(JSON.parse(raw) as Partial<Extras>) };
  } catch { /* corrupted extras → defaults */ }
  return fallback;
}

/** Custom animated toggle switch (notifications simulées). */
function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', on ? 'bg-[#0E8C7F]' : 'bg-[#EADFC8]')}
    >
      <motion.span
        className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow"
        animate={{ x: on ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

/** Segmented control for levels. */
function LevelSegmented({ value, onChange, compact = false }: { value: Level; onChange: (l: Level) => void; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn('inline-flex rounded-full border border-[#EADFC8] bg-[#FBF6EC]', compact ? 'p-0.5' : 'p-1')}>
      {LEVELS.map((l) => (
        <motion.button
          key={l}
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(l)}
          className={cn(
            'rounded-full font-semibold transition-colors',
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs',
            value === l ? 'bg-[#0B2E2B] text-white shadow-sm' : 'text-[#0B2E2B]/55 hover:text-[#0B2E2B]',
          )}
        >
          {t(`common.level.${l}`)}
        </motion.button>
      ))}
    </div>
  );
}

export default function Profile() {
  const { currentUser, sessions, invitations, venues, state, resetDemo, email, updateProfile } = useStore();
  const { t, lang, setLang, formatDate } = useI18n();

  // ---- identity form state (synced from currentUser) ----
  const [name, setName] = useState(currentUser.name);
  const [countryCode, setCountryCode] = useState(currentUser.countryCode);
  const [bio, setBio] = useState(currentUser.bio);
  const [level, setLevel] = useState<Level>(currentUser.level);
  const [sports, setSports] = useState<Sport[]>(currentUser.sports);

  const [extras, setExtras] = useState<Extras>(() =>
    loadExtras(venues[0]?.area ?? 'Patong', currentUser.lang.toUpperCase()));
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // resync form when the user object itself changes (e.g. resetDemo)
  useEffect(() => {
    setName(currentUser.name);
    setCountryCode(currentUser.countryCode);
    setBio(currentUser.bio);
    setLevel(currentUser.level);
    setSports(currentUser.sports);
  }, [currentUser]);

  // persist extras on change
  useEffect(() => {
    try { localStorage.setItem(EXTRAS_KEY, JSON.stringify(extras)); } catch { /* storage unavailable */ }
  }, [extras]);

  // post-save flash toast (survives the reload)
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SAVED_FLAG)) {
        sessionStorage.removeItem(SAVED_FLAG);
        setFlash('saved');
        const id = window.setTimeout(() => setFlash(null), 4000);
        return () => window.clearTimeout(id);
      }
    } catch { /* ignore */ }
  }, []);

  const nationalityOptions = useMemo(
    () => countryOptions(lang).map((c) => [c.code, c.flag, c.name] as [string, string, string]),
    [lang],
  );
  const flag = nationalityOptions.find(([code]) => code === countryCode)?.[1] ?? currentUser.nationality;
  const nameOf = (code: string) => nationalityOptions.find(([c]) => c === code)?.[2] ?? code;

  const areas = useMemo(() => Array.from(new Set(venues.map((v) => v.area))), [venues]);

  const toggleSport = (s: Sport) => {
    setSports((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setExtras((prev) => ({
      ...prev,
      sportLevels: { ...prev.sportLevels, [s]: prev.sportLevels[s] ?? level },
    }));
  };
  const toggleLang = (code: string) =>
    setExtras((prev) => ({
      ...prev,
      languages: prev.languages.includes(code)
        ? prev.languages.filter((c) => c !== code)
        : [...prev.languages, code],
    }));

  // ---- stats ----
  const mySessions = useMemo(() => sessions.filter((s) => s.playerIds.includes(currentUser.id)), [sessions, currentUser.id]);
  const activityBySport = useMemo(() => {
    const counts = Object.fromEntries(SPORTS.map((sp) => [sp, 0])) as Record<Sport, number>;
    for (const s of mySessions) counts[s.sport] += 1;
    return counts;
  }, [mySessions]);
  const maxActivity = Math.max(1, ...Object.values(activityBySport));
  const answered = invitations.filter((i) => i.fromUserId === currentUser.id && i.status !== 'pending');
  const inviteRate = answered.length > 0
    ? Math.round((answered.filter((i) => i.status === 'accepted').length / answered.length) * 100)
    : 0;

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });

  // ---- actions ----
  const save = async () => {
    const ok = await updateProfile({
      name: name.trim() || currentUser.name,
      nationality: flag,
      countryCode,
      bio: bio.slice(0, 140),
      sports,
      level,
      lang,
    });
    if (!ok) return;
    setSaved(true);
    setFlash('saved');
    window.setTimeout(() => { setSaved(false); setFlash(null); }, 3000);
  };

  const sectionMotion = {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.7, ease: EASE },
  } as const;

  const STATS = [
    { icon: Trophy, color: 'text-[#0E8C7F] bg-[#0E8C7F]/10', value: currentUser.joinedCount, suffix: '', label: t('profile.stats.played') },
    { icon: CalendarPlus, color: 'text-[#FF6B4A] bg-[#FF6B4A]/10', value: currentUser.organizedCount, suffix: '', label: t('profile.stats.organized') },
    { icon: Dumbbell, color: 'text-[#5B7CFF] bg-[#5B7CFF]/10', value: currentUser.sports.length, suffix: `/${SPORTS.length}`, label: t('profile.stats.sports') },
    { icon: MailCheck, color: 'text-[#B97A0B] bg-[#FFB547]/15', value: inviteRate, suffix: '%', label: t('profile.stats.inviteRate') },
  ];

  return (
    <div className="bg-[#FBF6EC]">
      <div className="mx-auto max-w-[960px] px-6 py-12 lg:py-16">
        {/* page heading */}
        <motion.header {...sectionMotion}>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.5rem)] font-bold tracking-[-0.02em] text-[#0B2E2B]">
            {t('page.profile')}
          </h1>
          <p className="mt-2 text-[15px] text-[#0B2E2B]/60">{t('profile.subtitle')}</p>
        </motion.header>

        {/* Section 1 — identity card */}
        <motion.section {...sectionMotion} className="mt-8">
          <div className="overflow-hidden rounded-[24px] border border-[#EADFC8] bg-white shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.08)]">
            <div className="h-1.5 bg-golden-hour" />
            <div className="space-y-7 p-6 sm:p-8">
              {/* top row: avatar + name + nationality + level */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <AvatarEditor name={name} flag={flag} className="shrink-0 sm:w-56" />

                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <label htmlFor="profile-name" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
                      {t('profile.name')}
                    </label>
                    <input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={30}
                      className="mt-1 w-full rounded-xl border border-transparent bg-transparent px-2 py-1 font-display text-[28px] font-semibold tracking-tight text-[#0B2E2B] outline-none transition-colors hover:border-[#EADFC8] focus:border-[#0E8C7F] focus:bg-[#FBF6EC]"
                    />
                    <p className="mt-1 px-2 text-[13px] text-[#0B2E2B]/50">
                      {t('profile.memberSince')} · {formatDate(state.seededAt, { month: 'long', year: 'numeric' })}
                      {' '}· <Star className="inline h-3.5 w-3.5 fill-[#FFB547] text-[#FFB547]" /> {currentUser.rating.toFixed(1)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label htmlFor="profile-nationality" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
                        {t('profile.nationality')}
                      </label>
                      <div className="relative mt-1">
                        <select
                          id="profile-nationality"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="h-10 appearance-none rounded-full border border-[#EADFC8] bg-white pl-3.5 pr-9 text-sm font-semibold text-[#0B2E2B] outline-none focus:border-[#0E8C7F]"
                        >
                          {nationalityOptions.map(([code, f]) => (
                            <option key={code} value={code}>{f} {nameOf(code)}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0B2E2B]/40" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">{t('profile.level')}</span>
                      <div className="mt-1">
                        <LevelSegmented value={level} onChange={setLevel} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* bio */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="profile-bio" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">{t('profile.bio')}</label>
                  <span className="font-mono text-[11px] tabular-nums text-[#0B2E2B]/40">{bio.length}/140</span>
                </div>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 140))}
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-2xl border border-[#EADFC8] bg-[#FBF6EC] px-4 py-3 text-sm leading-relaxed text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35 focus:border-[#0E8C7F]"
                />
              </div>

              {/* favorite sports + per-sport level */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">{t('profile.sports')}</span>
                <div className="mt-2 flex flex-wrap gap-3">
                  {ALL_SPORTS.map((s) => {
                    const active = sports.includes(s);
                    return (
                      <div key={s} className="flex flex-col items-start gap-2">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={() => toggleSport(s)}
                          aria-pressed={active}
                          className={cn(
                            'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                            active
                              ? 'border-[#0B2E2B] bg-[#0B2E2B] text-white'
                              : 'border-[#EADFC8] bg-white text-[#0B2E2B]/60 hover:border-[#0E8C7F]/50 hover:text-[#0B2E2B]',
                          )}
                        >
                          <SportIcon sport={s} className={cn('h-4 w-4', active ? 'text-[#2FBFA5]' : 'text-[#0E8C7F]')} />
                          {t(`sport.${s}`)}
                          {active && <Check className="h-3.5 w-3.5 text-[#2FBFA5]" strokeWidth={3} />}
                        </motion.button>
                        <AnimatePresence>
                          {active && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            >
                              <LevelSegmented
                                compact
                                value={extras.sportLevels[s] ?? level}
                                onChange={(l) => setExtras((p) => ({ ...p, sportLevels: { ...p.sportLevels, [s]: l } }))}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* spoken languages */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">{t('profile.languages')}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LANG_CHOICES.map((code) => {
                    const active = extras.languages.includes(code);
                    return (
                      <motion.button
                        key={code}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => toggleLang(code)}
                        aria-pressed={active}
                        className={cn(
                          'inline-flex h-9 items-center rounded-full border px-3.5 font-mono text-[13px] font-bold transition-colors',
                          active
                            ? 'border-[#0E8C7F] bg-[#0E8C7F]/10 text-[#0A6E64]'
                            : 'border-[#EADFC8] bg-white text-[#0B2E2B]/50 hover:text-[#0B2E2B]',
                        )}
                      >
                        {code}
                      </motion.button>
                    );
                  })}
                </div>
                {extras.languages.length > 0 && (
                  <p className="mt-2 text-[13px] text-[#0B2E2B]/50">
                    🌐 {t('profile.speaks', { name: (name || currentUser.name).split(' ')[0], langs: extras.languages.join(' · ') })}
                  </p>
                )}
              </div>

              {/* save */}
              <div className="sticky bottom-4 z-10 border-t border-[#EADFC8] pt-5">
                <motion.button
                  type="button"
                  onClick={() => { void save(); }}
                  disabled={saved}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-golden-hour px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,107,74,.35)] transition-transform hover:scale-[1.02] disabled:cursor-default sm:w-auto"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {saved ? (
                      <motion.span key="saved" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2">
                        <Check className="h-4 w-4" strokeWidth={3} />
                        {t('profile.saved')}
                      </motion.span>
                    ) : (
                      <motion.span key="save" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {t('profile.save')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Section 2 — stats */}
        <motion.section {...sectionMotion} className="mt-10" ref={statsRef}>
          <h2 className="font-display text-xl font-bold tracking-tight text-[#0B2E2B]">{t('profile.stats.title')}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-[#EADFC8] bg-white p-5 shadow-[0_2px_8px_rgba(11,46,43,.06)]">
                <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', s.color)}>
                  <s.icon className="h-4.5 w-4.5" />
                </span>
                <p className="mt-3 font-mono text-4xl font-bold tabular-nums text-[#0B2E2B]">
                  <CountUp value={s.value} suffix={s.suffix} start={statsInView} />
                </p>
                <p className="mt-1 text-[13px] font-medium text-[#0B2E2B]/55">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-[#EADFC8] bg-white p-5 shadow-[0_2px_8px_rgba(11,46,43,.06)] sm:p-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('profile.stats.bySport')}</h3>
            <div className="mt-4 space-y-3">
              {ALL_SPORTS.map((s, i) => {
                const count = activityBySport[s];
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className="inline-flex w-28 shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[#0B2E2B]">
                      <SportIcon sport={s} className="h-4 w-4 text-[#0E8C7F]" />
                      {t(`sport.${s}`)}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#FBF6EC]">
                      <motion.div
                        className="h-full rounded-full bg-golden-hour"
                        style={{ width: `${(count / maxActivity) * 100}%`, transformOrigin: 'left' }}
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.8, ease: EASE, delay: i * 0.1 }}
                      />
                    </div>
                    <span className="w-6 text-right font-mono text-sm font-bold tabular-nums text-[#0B2E2B]">{count}</span>
                  </div>
                );
              })}
            </div>
            {mySessions.length === 0 && (
              <p className="mt-4 text-center text-[13px] text-[#0B2E2B]/45">{t('profile.stats.none')}</p>
            )}
          </div>
        </motion.section>

        {/* Section 3 — preferences */}
        <motion.section {...sectionMotion} className="mt-10">
          <div className="space-y-7 rounded-[24px] border border-[#EADFC8] bg-white p-6 shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.08)] sm:p-8">
            <h2 className="font-display text-xl font-bold tracking-tight text-[#0B2E2B]">{t('profile.prefs.title')}</h2>

            {/* interface language with live preview */}
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
                <Globe className="h-3.5 w-3.5" />
                {t('profile.prefs.lang')}
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LANGS.map((l) => (
                  <motion.button
                    key={l.code}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setLang(l.code as Lang)}
                    aria-pressed={lang === l.code}
                    className={cn(
                      'flex h-14 flex-col items-center justify-center rounded-2xl border transition-colors',
                      lang === l.code
                        ? 'border-[#0B2E2B] bg-[#0B2E2B] text-white'
                        : 'border-[#EADFC8] bg-[#FBF6EC] text-[#0B2E2B] hover:border-[#0E8C7F]/50',
                    )}
                  >
                    <span className="font-mono text-sm font-bold">{l.code.toUpperCase()}</span>
                    <span className={cn('text-[11px]', lang === l.code ? 'text-white/70' : 'text-[#0B2E2B]/50')}>{l.label}</span>
                  </motion.button>
                ))}
              </div>
              <div className="mt-3 flex h-16 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#EADFC8] bg-[#FBF6EC]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={lang}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="font-display text-lg font-semibold text-[#0E8C7F]"
                  >
                    « {t('home.hero.cta1')} »
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {/* simulated notifications */}
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
                <Bell className="h-3.5 w-3.5" />
                {t('profile.prefs.notif')}
              </span>
              <div className="mt-2 divide-y divide-[#EADFC8]/70 rounded-2xl border border-[#EADFC8]">
                {([
                  ['reminder', 'profile.prefs.notif.reminder'],
                  ['invites', 'profile.prefs.notif.invites'],
                  ['newSessions', 'profile.prefs.notif.new'],
                ] as const).map(([key, labelKey]) => (
                  <div key={key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <span className="text-sm font-medium text-[#0B2E2B]">{t(labelKey)}</span>
                    <Toggle
                      on={extras.notif[key]}
                      onChange={() => setExtras((p) => ({ ...p, notif: { ...p.notif, [key]: !p.notif[key] } }))}
                      label={t(labelKey)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* favorite area */}
            <div>
              <label htmlFor="profile-area" className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
                <MapPin className="h-3.5 w-3.5" />
                {t('profile.prefs.area')}
              </label>
              <div className="relative mt-2 max-w-xs">
                <select
                  id="profile-area"
                  value={extras.area}
                  onChange={(e) => setExtras((p) => ({ ...p, area: e.target.value }))}
                  className="h-11 w-full appearance-none rounded-full border border-[#EADFC8] bg-white pl-4 pr-10 text-sm font-semibold text-[#0B2E2B] outline-none focus:border-[#0E8C7F]"
                >
                  {areas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0B2E2B]/40" />
              </div>
              <p className="mt-1.5 text-[13px] text-[#0B2E2B]/50">{t('profile.prefs.areaHint')}</p>
            </div>
          </div>
        </motion.section>

        {/* Section 4 — demo zone */}
        <motion.section {...sectionMotion} className="mt-10">
          <div className="rounded-[24px] border border-[#EADFC8] bg-white p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold tracking-tight text-[#0B2E2B]">{t('profile.demo.title')}</h2>
            <p className="mt-1.5 max-w-lg text-[14px] leading-relaxed text-[#0B2E2B]/60">{t('profile.demo.text', { email })}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#EADFC8] bg-white px-6 py-3 text-sm font-bold text-[#0B2E2B] transition-colors hover:bg-[#FBF6EC]"
              >
                <LogOut className="h-4 w-4" />
                {t('profile.demo.reset')}
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      {/* reset confirm dialog */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0B2E2B]/50 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmReset(false)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label={t('profile.demo.resetConfirmTitle')}
              className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg font-bold text-[#0B2E2B]">{t('profile.demo.resetConfirmTitle')}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#0B2E2B]/60">{t('profile.demo.resetConfirmBody')}</p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 rounded-full border border-[#EADFC8] py-2.5 text-sm font-semibold text-[#0B2E2B] transition-colors hover:bg-[#FBF6EC]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmReset(false); resetDemo(); }}
                  className="flex-1 rounded-full bg-[#F05252] py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
                >
                  {t('profile.demo.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* post-save flash toast */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[110]">
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ x: 80, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 80, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: EASE }}
              role="status"
              className="pointer-events-auto flex w-[320px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-2xl border border-[#22C55E]/40 bg-white/95 p-4 text-[#22C55E] shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.12)] backdrop-blur"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="min-w-0 flex-1 text-sm font-semibold text-[#0B2E2B]">{t('profile.saved')}</p>
              <button
                onClick={() => setFlash(null)}
                className="rounded-full p-1 text-[#0B2E2B]/40 transition-colors hover:bg-[#FBF6EC] hover:text-[#0B2E2B]"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
