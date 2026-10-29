export const municipalities = [
  'Deçan', 'Dragash', 'Ferizaj', 'Fushë Kosovë', 'Gjakovë', 'Gjilan', 'Gllogoc',
  'Graçanicë', 'Hani i Elezit', 'Istog', 'Junik', 'Kaçanik', 'Kamenicë', 'Klinë',
  'Klokot', 'Leposaviq', 'Lipjan', 'Malishevë', 'Mamushë', 'Mitrovicë e Jugut',
  'Mitrovicë e Veriut', 'Novobërdë', 'Obiliq', 'Partesh', 'Pejë', 'Podujevë',
  'Prishtinë', 'Prizren', 'Rahovec', 'Ranillug', 'Shtërpcë', 'Shtime', 'Skenderaj',
  'Suharekë', 'Viti', 'Vushtrri', 'Zubin Potok', 'Zveçan',
]

export const categories = [
  'Rrugë të dëmtuara', 'Mbeturina', 'Ndriçim publik', 'Ujë dhe kanalizim',
  'Hapësira publike', 'Siguri rrugore', 'Ndërtesa publike', 'Tjetër',
]

export const statuses = {
  reported: 'I raportuar',
  reviewing: 'Në shqyrtim',
  in_progress: 'Në proces',
  resolved: 'I zgjidhur',
  rejected: 'I refuzuar',
}

export const demoReports = [
  {
    id: 'demo-1', isDemo: true, title: 'Rrugë e dëmtuar në lagjen Dardania',
    description: 'Asfalti është dëmtuar pranë kalimit të këmbësorëve dhe krijon vështirësi për banorët.',
    category: 'Rrugë të dëmtuara', municipality: 'Prishtinë', status: 'in_progress',
    confirmationCount: 7, createdAt: new Date('2026-10-24'),
    imageUrls: ['https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80'],
  },
  {
    id: 'demo-2', isDemo: true, title: 'Mbeturina pranë hapësirës publike',
    description: 'Kontejnerët janë mbushur dhe mbeturinat kanë mbetur pranë parkut.',
    category: 'Mbeturina', municipality: 'Prizren', status: 'reviewing',
    confirmationCount: 12, createdAt: new Date('2026-10-20'),
    imageUrls: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80'],
  },
  {
    id: 'demo-3', isDemo: true, title: 'Ndriçimi publik nuk funksionon',
    description: 'Disa llamba në rrugën kryesore janë fikur dhe zona mbetet e errët në mbrëmje.',
    category: 'Ndriçim publik', municipality: 'Pejë', status: 'reported',
    confirmationCount: 21, createdAt: new Date('2026-10-17'),
    imageUrls: ['https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80'],
  },
  {
    id: 'demo-4', isDemo: true, title: 'Trotuar i dëmtuar pranë shkollës',
    description: 'Pllakat e dëmtuara në trotuar vështirësojnë kalimin e nxënësve dhe këmbësorëve.',
    category: 'Siguri rrugore', municipality: 'Gjakovë', status: 'reviewing',
    confirmationCount: 9, createdAt: new Date('2026-10-14'),
    imageUrls: ['https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80'],
  },
  {
    id: 'demo-5', isDemo: true, title: 'Rrjedhje uji në rrugë',
    description: 'Uji po rrjedh vazhdimisht pranë kryqëzimit dhe po dëmton sipërfaqen e rrugës.',
    category: 'Ujë dhe kanalizim', municipality: 'Ferizaj', status: 'in_progress',
    confirmationCount: 16, createdAt: new Date('2026-10-11'),
    imageUrls: ['https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=900&q=80'],
  },
  {
    id: 'demo-6', isDemo: true, title: 'Mungojnë ulëset në park',
    description: 'Vizitorët e parkut kanë pak vende për t’u ulur dhe për të pushuar.',
    category: 'Hapësira publike', municipality: 'Gjilan', status: 'reported',
    confirmationCount: 5, createdAt: new Date('2026-10-08'),
    imageUrls: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'],
  },
  {
    id: 'demo-7', isDemo: true, title: 'Mbeturina pranë kontejnerëve',
    description: 'Mbeturinat e lëna jashtë kontejnerëve po pengojnë kalimin dhe po ndotin zonën.',
    category: 'Mbeturina', municipality: 'Mitrovicë e Jugut', status: 'resolved',
    confirmationCount: 18, createdAt: new Date('2026-10-05'),
    imageUrls: ['https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=900&q=80'],
  },
  {
    id: 'demo-8', isDemo: true, title: 'Kalimi për këmbësorë ka nevojë për sinjalistikë',
    description: 'Shenjat pranë kalimit janë zbehur dhe mezi dallohen nga drejtuesit e automjeteve.',
    category: 'Siguri rrugore', municipality: 'Prishtinë', status: 'reported',
    confirmationCount: 11, createdAt: new Date('2026-10-02'),
    imageUrls: ['https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=900&q=80'],
  },
]

export const statusClass = {
  reported: 'blue',
  reviewing: 'amber',
  in_progress: 'violet',
  resolved: 'green',
  rejected: 'red',
}

export function formatDate(value) {
  if (!value) return 'Sapo u dërgua'
  const date = value.toDate ? value.toDate() : new Date(value)
  return new Intl.DateTimeFormat('sq-XK', { dateStyle: 'medium' }).format(date)
}
