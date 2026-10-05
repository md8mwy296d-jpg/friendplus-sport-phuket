import { AlertTriangle } from 'lucide-react';
import { CONTACT_EMAIL } from '@/lib/config';
import { useI18n } from '@/lib/i18n';

type Section = [title: string, body: string];

// Modèle de conditions — à faire valider par un juriste (droit thaïlandais et pays des clients).
const FR: Section[] = [
  ['1. Qui sommes-nous', 'My Phuket Key est un service de conciergerie qui réserve, pour ses clients, des prestations fournies par des partenaires indépendants à Phuket (location de véhicules, excursions, bateaux, hébergements, soirées, garde d’enfants, ménage, beauté, hélicoptère). [Raison sociale, adresse et numéro d’enregistrement à compléter.]'],
  ['2. Prix', 'Les prix sont indiqués en bahts thaïlandais (THB), toutes taxes comprises, pour la date, la quantité et les options choisies. Le montant affiché au moment du paiement est celui qui est débité.'],
  ['3. Réservation et paiement', 'La réservation n’est valable qu’une fois le paiement par carte accepté (paiement sécurisé par Stripe ; My Phuket Key ne voit ni ne stocke tes données de carte). Une réservation non payée dans les 2 heures expire automatiquement. Tu reçois un reçu par e-mail, puis une confirmation dès que le prestataire a validé.'],
  ['4. Indisponibilité', 'Si le prestataire ne peut finalement pas assurer la prestation, nous te proposons une alternative équivalente ou te remboursons intégralement.'],
  ['5. Annulation par le client', 'Chaque offre précise ses conditions d’annulation (par exemple « gratuite jusqu’à 24 h avant »). Dans ce délai, le remboursement est intégral ; au-delà, il n’est pas dû, sauf mention contraire. Les remboursements sont effectués sur la carte utilisée, sous 5 à 10 jours ouvrés.'],
  ['6. Météo et sécurité', 'Pour les activités en mer ou dans les airs, le prestataire peut reporter ou annuler pour raison de météo ou de sécurité : la prestation est alors reportée sans frais ou remboursée.'],
  ['7. Obligations du client', 'Tu t’engages à fournir des coordonnées exactes, à être présent à l’heure et au lieu convenus et à respecter les règles de sécurité. Location de scooter ou de moto : permis valable pour la catégorie et port du casque obligatoires ; les amendes et dommages non couverts par l’assurance restent à ta charge.'],
  ['8. Assurance et responsabilité', 'Les excursions indiquées « assurance incluse » comprennent l’assurance du prestataire. Les prestations sont exécutées sous la responsabilité de chaque prestataire ; My Phuket Key répond de la bonne transmission et du suivi de ta réservation.'],
  ['9. Réclamations', `Pour toute question ou réclamation, écris-nous à ${CONTACT_EMAIL} en indiquant ta référence de réservation (MPK-…). Nous répondons sous 48 h.`],
  ['10. Données personnelles', 'Tes données (nom, e-mail, téléphone) servent uniquement à gérer tes réservations et ne sont transmises qu’au prestataire concerné. Voir la politique de confidentialité.'],
];

const EN: Section[] = [
  ['1. Who we are', 'My Phuket Key is a concierge service that books, for its customers, services provided by independent partners in Phuket (vehicle rental, excursions, boats, accommodation, nightlife, childcare, cleaning, beauty, helicopter). [Company name, address and registration number to be completed.]'],
  ['2. Prices', 'Prices are shown in Thai baht (THB), all taxes included, for the date, quantity and extras selected. The amount shown at payment is the amount charged.'],
  ['3. Booking and payment', 'A booking is valid only once the card payment is accepted (secure payment by Stripe; My Phuket Key never sees or stores your card details). An unpaid booking expires automatically after 2 hours. You receive an email receipt, then a confirmation once the provider has validated.'],
  ['4. Unavailability', 'If the provider ultimately cannot deliver the service, we offer you an equivalent alternative or a full refund.'],
  ['5. Cancellation by the customer', 'Each offer states its cancellation terms (e.g. “free up to 24 h before”). Within that period you are refunded in full; after it, no refund is due unless stated otherwise. Refunds go back to the card used, within 5 to 10 business days.'],
  ['6. Weather and safety', 'For activities at sea or in the air, the provider may postpone or cancel for weather or safety reasons: the service is then rescheduled free of charge or refunded.'],
  ['7. Customer obligations', 'You agree to give accurate contact details, to be on time at the agreed place and to follow safety rules. Scooter or motorbike rental: a licence valid for the category and a helmet are mandatory; fines and damage not covered by insurance remain your responsibility.'],
  ['8. Insurance and liability', 'Excursions marked “insurance included” include the provider’s insurance. Services are performed under each provider’s responsibility; My Phuket Key is responsible for passing on and following up your booking.'],
  ['9. Complaints', `For any question or complaint, email us at ${CONTACT_EMAIL} with your booking reference (MPK-…). We reply within 48 hours.`],
  ['10. Personal data', 'Your data (name, email, phone) is used only to manage your bookings and is shared only with the provider concerned. See the privacy policy.'],
];

export default function Terms() {
  const { t, lang } = useI18n();
  const sections = lang === 'fr' ? FR : EN;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink">{t('terms.title')}</h1>
      <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber/15 px-4 py-3 text-sm font-medium text-[#7A4F00]">
        <AlertTriangle className="h-4 w-4 shrink-0" /> {t('terms.draft')}
      </p>
      <div className="mt-6 grid gap-6">
        {sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/75">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
