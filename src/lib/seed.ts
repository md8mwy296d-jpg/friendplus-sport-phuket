import type { StoreState, User, Venue, Session, Invitation } from './types';

const h = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
const d = (days: number) => h(days * 24);

export const CURRENT_USER_ID = 'u-alex';

export const SEED_USERS: User[] = ([
  { id: 'u-alex', name: 'Alex Martin', nationality: '🇫🇷', countryCode: 'FR', lang: 'fr', sports: ['futsal', 'padel'], level: 'intermediate', rating: 4.6, bio: 'Touriste français à Phuket pour 3 semaines, toujours partant pour un 5v5.', joinedCount: 7, organizedCount: 2 },
  { id: 'u-nok', name: 'Nok Srisai', nationality: '🇹🇭', countryCode: 'TH', lang: 'th', sports: ['dance', 'gym'], level: 'advanced', rating: 4.9, bio: 'Local de Phuket Town, danseuse et fan de fitness collectif.', joinedCount: 18, organizedCount: 5 },
  { id: 'u-anastasia', name: 'Anastasia Volkova', nationality: '🇷🇺', countryCode: 'RU', lang: 'ru', sports: ['padel', 'gym'], level: 'intermediate', rating: 4.7, bio: 'Padel addict, à Kata pour la saison.', joinedCount: 11, organizedCount: 1 },
  { id: 'u-marco', name: 'Marco Rossi', nationality: '🇮🇹', countryCode: 'IT', lang: 'en', sports: ['futsal'], level: 'advanced', rating: 4.8, bio: 'Ex-semi-pro, organise des matchs à Patong.', joinedCount: 24, organizedCount: 9 },
  { id: 'u-emma', name: 'Emma Wilson', nationality: '🇬🇧', countryCode: 'GB', lang: 'en', sports: ['padel', 'dance'], level: 'beginner', rating: 4.3, bio: 'Nomade digitale, découvre le padel.', joinedCount: 4, organizedCount: 0 },
  { id: 'u-lukas', name: 'Lukas Weber', nationality: '🇩🇪', countryCode: 'DE', lang: 'en', sports: ['futsal', 'gym'], level: 'intermediate', rating: 4.5, bio: 'Ingénieur en remote, futsal le soir.', joinedCount: 9, organizedCount: 2 },
  { id: 'u-mei', name: 'Mei Chen', nationality: '🇨🇳', countryCode: 'CN', lang: 'en', sports: ['dance', 'gym'], level: 'intermediate', rating: 4.6, bio: 'Prof de yoga, adore les cours collectifs.', joinedCount: 13, organizedCount: 3 },
  { id: 'u-jack', name: 'Jack Thompson', nationality: '🇦🇺', countryCode: 'AU', lang: 'en', sports: ['futsal', 'padel'], level: 'intermediate', rating: 4.4, bio: 'Surfeur à Rawai, joueur du dimanche.', joinedCount: 6, organizedCount: 1 },
  { id: 'u-dmitri', name: 'Dmitri Petrov', nationality: '🇷🇺', countryCode: 'RU', lang: 'ru', sports: ['futsal'], level: 'advanced', rating: 4.7, bio: 'Gardien de but, cherche des matchs réguliers.', joinedCount: 15, organizedCount: 0 },
  { id: 'u-sofia', name: 'Sofia Garcia', nationality: '🇪🇸', countryCode: 'ES', lang: 'en', sports: ['padel', 'dance'], level: 'advanced', rating: 4.8, bio: 'Joueuse de padel compétitive de Barcelone.', joinedCount: 20, organizedCount: 4 },
  { id: 'u-yuki', name: 'Yuki Tanaka', nationality: '🇯🇵', countryCode: 'JP', lang: 'en', sports: ['gym', 'dance'], level: 'beginner', rating: 4.2, bio: 'En vacances à Chalong, première fois en cours collectif.', joinedCount: 2, organizedCount: 0 },
  { id: 'u-lucas', name: 'Lucas Silva', nationality: '🇧🇷', countryCode: 'BR', lang: 'en', sports: ['futsal'], level: 'advanced', rating: 4.9, bio: 'Brésilien, le futsal dans le sang.', joinedCount: 31, organizedCount: 6 },
  { id: 'u-minjun', name: 'Min-jun Park', nationality: '🇰🇷', countryCode: 'KR', lang: 'en', sports: ['padel', 'futsal'], level: 'intermediate', rating: 4.5, bio: 'Voyageur solo, toujours partant.', joinedCount: 8, organizedCount: 0 },
  { id: 'u-femke', name: 'Femke van Dijk', nationality: '🇳🇱', countryCode: 'NL', lang: 'en', sports: ['gym', 'dance'], level: 'intermediate', rating: 4.4, bio: 'Coach fitness, à Bang Tao pour 2 mois.', joinedCount: 12, organizedCount: 3 },
] as Omit<User, 'avatarUrl' | 'avatarColor' | 'certified' | 'fairplayPct' | 'activityPct' | 'score' | 'reviewCount' | 'profilePct'>[])
  .map((u) => ({ ...u, avatarUrl: '', avatarColor: null, certified: false, fairplayPct: null, activityPct: 0, score: null, reviewCount: 0, profilePct: 0 }));

export const SEED_VENUES: Venue[] = [
  { id: 'v-patong', name: 'Patong Sports Arena', area: 'Patong', sports: ['futsal', 'padel'], address: 'Rat-U-Thit 200 Pee Rd, Patong', rating: 4.7, priceFrom: 150, photo: '/venue-patong.jpg', amenities: ['Vestiaires', 'Douches', 'Parking', 'Bar'], hours: '08:00 – 23:00' },
  { id: 'v-kata', name: 'Kata Beach Padel Club', area: 'Kata', sports: ['padel'], address: 'Kata Rd, Karon', rating: 4.9, priceFrom: 200, photo: '/venue-kata.jpg', amenities: ['Location raquettes', 'Vue mer', 'Café'], hours: '07:00 – 22:00' },
  { id: 'v-chalong', name: 'Chalong Fit Studio', area: 'Chalong', sports: ['gym', 'dance'], address: 'Chao Fa West Rd, Chalong', rating: 4.6, priceFrom: 120, photo: '/venue-chalong.jpg', amenities: ['Climatisation', 'Tapis fournis', 'Coaching'], hours: '06:00 – 21:00' },
  { id: 'v-town', name: 'Old Town Dance House', area: 'Phuket Town', sports: ['dance'], address: 'Thalang Rd, Phuket Town', rating: 4.8, priceFrom: 100, photo: '/venue-town.jpg', amenities: ['Miroirs', 'Sono pro', 'Studio climatisé'], hours: '09:00 – 21:00' },
  { id: 'v-rawai', name: 'Rawai Futsal Dome', area: 'Rawai', sports: ['futsal'], address: 'Wiset Rd, Rawai', rating: 4.5, priceFrom: 130, photo: '/venue-rawai.jpg', amenities: ['Terrain couvert', 'Éclairage LED', 'Parking'], hours: '08:00 – 23:00' },
  { id: 'v-bangtao', name: 'Bang Tao Sports Resort', area: 'Bang Tao', sports: ['padel', 'gym'], address: 'Laguna Area, Choeng Thale', rating: 4.9, priceFrom: 250, photo: '/venue-bangtao.jpg', amenities: ['Resort premium', 'Yoga deck', 'Piscine', 'Spa'], hours: '06:00 – 22:00' },
];

export function buildSeed(): StoreState {
  const sessions: Session[] = [
    {
      id: 's-futsal-patong-1', sport: 'futsal', title: 'Futsal 5v5 — Sunset Match', venueId: 'v-patong',
      date: d(3), durationMin: 60, quota: 10,
      playerIds: ['u-alex', 'u-marco', 'u-lucas', 'u-dmitri', 'u-lukas', 'u-jack', 'u-minjun'],
      waitlistIds: [], pricePerPerson: 150, level: 'intermediate', mixed: true,
      status: 'open', confirmationDeadline: h(26), creatorId: 'u-marco',
      description: 'Match amical niveau intermédiaire au rooftop de Patong. Ambiance détendue, on joue sous le coucher de soleil.', createdAt: h(-30),
    },
    {
      id: 's-futsal-rawai-1', sport: 'futsal', title: 'Futsal compétitif — dernière place !', venueId: 'v-rawai',
      date: d(2), durationMin: 90, quota: 10,
      playerIds: ['u-marco', 'u-lucas', 'u-dmitri', 'u-lukas', 'u-jack', 'u-minjun', 'u-alex', 'u-emma', 'u-nok'],
      waitlistIds: [], pricePerPerson: 130, level: 'advanced', mixed: true,
      status: 'open', confirmationDeadline: h(20), creatorId: 'u-lucas',
      description: 'Gros niveau attendu, match sérieux mais fair-play au dôme de Rawai.', createdAt: h(-50),
    },
    {
      id: 's-padel-kata-1', sport: 'padel', title: 'Padel 2v2 vue mer', venueId: 'v-kata',
      date: h(30), durationMin: 90, quota: 4,
      playerIds: ['u-anastasia', 'u-sofia', 'u-emma', 'u-femke'],
      waitlistIds: ['u-nok'], pricePerPerson: 200, level: 'intermediate', mixed: true,
      status: 'full', confirmationDeadline: h(6), creatorId: 'u-anastasia',
      description: 'Double féminin friendly sur le court face à la mer. Raquettes dispo à la location.', createdAt: h(-20),
    },
    {
      id: 's-padel-bangtao-1', sport: 'padel', title: 'Padel découverte au resort', venueId: 'v-bangtao',
      date: d(4), durationMin: 60, quota: 4,
      playerIds: ['u-emma', 'u-yuki'],
      waitlistIds: [], pricePerPerson: 250, level: 'beginner', mixed: true,
      status: 'open', confirmationDeadline: d(2), creatorId: 'u-emma',
      description: 'Session découverte débutants dans le cadre magnifique de Bang Tao. Venez comme vous êtes !', createdAt: h(-12),
    },
    {
      id: 's-dance-town-1', sport: 'dance', title: 'Zumba Party — Old Town', venueId: 'v-town',
      date: d(3), durationMin: 60, quota: 12,
      playerIds: ['u-nok', 'u-mei', 'u-emma', 'u-sofia', 'u-femke', 'u-yuki', 'u-alex', 'u-anastasia'],
      waitlistIds: [], pricePerPerson: 100, level: 'all', mixed: true,
      status: 'open', confirmationDeadline: h(30), creatorId: 'u-nok',
      description: 'Cours de zumba endiablé dans le shophouse coloré de Thalang Road. Tous niveaux !', createdAt: h(-40),
    },
    {
      id: 's-gym-chalong-1', sport: 'gym', title: 'Mobilité & stretching matinal', venueId: 'v-chalong',
      date: d(5), durationMin: 75, quota: 15,
      playerIds: ['u-mei', 'u-nok', 'u-femke', 'u-yuki', 'u-anastasia', 'u-emma', 'u-sofia', 'u-lukas', 'u-alex', 'u-jack', 'u-minjun'],
      waitlistIds: [], pricePerPerson: 120, level: 'all', mixed: true,
      status: 'open', confirmationDeadline: d(3), creatorId: 'u-mei',
      description: 'Séance douce de mobilité en plein air face au jardin tropical. Parfait pour récupérer.', createdAt: h(-60),
    },
    {
      id: 's-futsal-patong-2', sport: 'futsal', title: 'Futsal 5v5 — Confirmé !', venueId: 'v-patong',
      date: h(19), durationMin: 60, quota: 10,
      playerIds: ['u-marco', 'u-lucas', 'u-dmitri', 'u-lukas', 'u-jack', 'u-minjun', 'u-alex', 'u-nok', 'u-emma', 'u-sofia'],
      waitlistIds: [], pricePerPerson: 150, level: 'intermediate', mixed: true,
      status: 'confirmed', confirmationDeadline: h(-5), creatorId: 'u-marco',
      description: 'Match confirmé ! Retrouvailles 15 min avant au bar de l\'arena.', createdAt: h(-70),
    },
    {
      id: 's-padel-kata-2', sport: 'padel', title: 'Padel mixte du soir', venueId: 'v-kata',
      date: h(6), durationMin: 90, quota: 4,
      playerIds: ['u-sofia', 'u-minjun', 'u-jack', 'u-anastasia'],
      waitlistIds: [], pricePerPerson: 200, level: 'advanced', mixed: true,
      status: 'confirmed', confirmationDeadline: h(-18), creatorId: 'u-sofia',
      description: 'Session confirmée, niveau avancé. Apportez votre propre raquette si possible.', createdAt: h(-90),
    },
    {
      id: 's-dance-chalong-1', sport: 'dance', title: 'Hip-hop débutants', venueId: 'v-chalong',
      date: h(46), durationMin: 60, quota: 8,
      playerIds: ['u-yuki', 'u-emma', 'u-mei'],
      waitlistIds: [], pricePerPerson: 120, level: 'beginner', mixed: true,
      status: 'cancelled', confirmationDeadline: h(-2), creatorId: 'u-yuki',
      description: 'Initiation hip-hop tout doux pour débutants complets.', createdAt: h(-60),
    },
    {
      id: 's-gym-bangtao-1', sport: 'gym', title: 'Yoga flow au lever du soleil', venueId: 'v-bangtao',
      date: d(6), durationMin: 60, quota: 10,
      playerIds: ['u-femke', 'u-mei', 'u-nok', 'u-anastasia', 'u-yuki'],
      waitlistIds: [], pricePerPerson: 250, level: 'all', mixed: true,
      status: 'open', confirmationDeadline: d(4), creatorId: 'u-femke',
      description: 'Yoga flow sur le deck en bois face à la lagune. Tapis fournis.', createdAt: h(-8),
    },
    {
      id: 's-padel-rawai-1', sport: 'padel', title: 'Padel après le travail', venueId: 'v-rawai',
      date: h(27), durationMin: 60, quota: 4,
      playerIds: ['u-lukas', 'u-jack', 'u-minjun'],
      waitlistIds: [], pricePerPerson: 130, level: 'intermediate', mixed: true,
      status: 'open', confirmationDeadline: h(3), creatorId: 'u-lukas',
      description: 'Petite session détente après le boulot, il manque un joueur !', createdAt: h(-15),
    },
  ];

  const invitations: Invitation[] = [
    { id: 'inv-1', sessionId: 's-futsal-patong-1', fromUserId: 'u-marco', toUserId: 'u-alex', status: 'pending', message: 'Alex ! Il nous manque du monde pour le match de jeudi, tu viens ?', createdAt: h(-5) },
    { id: 'inv-2', sessionId: 's-dance-town-1', fromUserId: 'u-nok', toUserId: 'u-alex', status: 'pending', message: 'Tu devrais tester la zumba, ambiance garantie 😄', createdAt: h(-26) },
    { id: 'inv-3', sessionId: 's-padel-bangtao-1', fromUserId: 'u-alex', toUserId: 'u-emma', status: 'accepted', message: 'On se fait une session découverte à Bang Tao ?', createdAt: h(-11) },
    { id: 'inv-4', sessionId: 's-padel-rawai-1', fromUserId: 'u-lukas', toUserId: 'u-alex', status: 'pending', message: 'Un padel demain soir ? Il manque 1 joueur !', createdAt: h(-3) },
  ];

  return {
    currentUserId: CURRENT_USER_ID,
    users: SEED_USERS,
    venues: SEED_VENUES,
    sessions,
    invitations,
    seededAt: new Date().toISOString(),
  };
}
