import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Info, AlertTriangle, XCircle, PartyPopper, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { ToastItem } from '@/lib/types';
import { cn } from '@/lib/utils';

const KIND_STYLE: Record<ToastItem['kind'], { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: 'border-[#5B7CFF]/40 text-[#5B7CFF]' },
  success: { icon: CheckCircle2, classes: 'border-[#22C55E]/40 text-[#22C55E]' },
  warning: { icon: AlertTriangle, classes: 'border-[#D9C08A]/50 text-[#B97A0B]' },
  error: { icon: XCircle, classes: 'border-[#F05252]/40 text-[#F05252]' },
  celebration: { icon: PartyPopper, classes: 'border-[#A8844A]/40 text-[#A8844A]' },
};

const TROPICAL_COLORS = ['#B08D57', '#D9C08A', '#A8844A', '#D4BC8A', '#22C55E'];

function fireConfetti() {
  confetti({
    particleCount: 40,
    spread: 70,
    startVelocity: 32,
    gravity: 0.9,
    ticks: 140,
    origin: { x: 0.85, y: 0.85 },
    colors: TROPICAL_COLORS,
    shapes: ['circle', 'square'],
    scalar: 0.9,
    disableForReducedMotion: true,
  });
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const { dismissToast } = useStore();
  useEffect(() => {
    if (toast.kind === 'celebration') fireConfetti();
    const timer = window.setTimeout(() => dismissToast(toast.id), 4000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  const { icon: Icon, classes } = KIND_STYLE[toast.kind];
  return (
    <motion.div
      layout="position"
      initial={{ x: 80, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 80, opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'pointer-events-auto flex w-[320px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-2xl border bg-white/95 p-4 shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.12)] backdrop-blur',
        classes,
      )}
      role="status"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#15130F]">{toast.title}</p>
        {toast.body && <p className="mt-0.5 text-[13px] leading-snug text-[#15130F]/60">{toast.body}</p>}
      </div>
      <button
        onClick={() => dismissToast(toast.id)}
        className="rounded-full p-1 text-[#15130F]/40 transition-colors hover:bg-[#F7F4EE] hover:text-[#15130F]"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export default function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-[100] lg:bottom-4 flex flex-col items-end gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
