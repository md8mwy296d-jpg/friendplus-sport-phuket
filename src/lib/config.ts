/** Contact channels of the concierge (Vercel env vars, optional). */
export const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL || 'contact01friendplussport@gmail.com';
/** International number, digits only (e.g. 66812345678). Empty = WhatsApp button hidden. */
export const CONTACT_WHATSAPP: string = String(import.meta.env.VITE_CONTACT_WHATSAPP || '').replace(/\D/g, '');

/** WhatsApp when configured, e-mail otherwise. */
export function contactHref(message = ''): string {
  if (CONTACT_WHATSAPP) return `https://wa.me/${CONTACT_WHATSAPP}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  return `mailto:${CONTACT_EMAIL}${message ? `?subject=${encodeURIComponent(message)}` : ''}`;
}
