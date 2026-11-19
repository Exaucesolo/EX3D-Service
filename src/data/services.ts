export const defaultCategories = [
  "Design & Visuel",
  "Audio & Prod",
  "Vidéo & Cinéma",
  "Web & Tech",
  "Pâtisserie 63 Food",
] as const;

export const categories = ["Tout", ...defaultCategories] as const;

export type ServiceCategory = string;

export type Service = {
  id: string;
  category: ServiceCategory;
  title: string;
  description: string;
  price: string;
  visual: string;
  deliverables: string;
  notes?: string;
  imageUrl?: string;
  kind?: "creation" | "service";
  status?: "Disponible" | "Sur devis";
  sortOrder?: number;
};

export const services: Service[] = [
  { id: "identite-visuelle-logos-luxe", category: "Design & Visuel", title: "Identité Visuelle & Logos Luxe", description: "Création de logos haut de gamme, chartes graphiques et identités visuelles complètes pour marques, studios et entreprises.", price: "Sur devis", visual: "branding", deliverables: "Logo principal et déclinaisons, charte graphique, palette chromatique, typographies et identité visuelle complète.", kind: "creation", status: "Sur devis", sortOrder: 1 },
  { id: "affiches-baches-covers", category: "Design & Visuel", title: "Affiches Événementielles, Bâches & Covers", description: "Visuels haute définition pour soirées, clubs, concerts, bâches grand format (ex: 2m × 1m), singles et albums musicaux.", price: "À partir de 25 $", visual: "identity", deliverables: "Affiche événementielle, bâche grand format, cover de single ou album, fichiers HD prêts à imprimer ou diffuser.", kind: "creation", status: "Disponible", sortOrder: 2 },
  { id: "retouche-photo-studio", category: "Design & Visuel", title: "Retouche Photo Studio & Portraits HD", description: "Retouche professionnelle haute résolution avec traitement studio, piqué renforcé et colorimétrie équilibrée (MBK New Image).", price: "À partir de 15 $", visual: "product", deliverables: "Retouche haute résolution, traitement studio, correction colorimétrique et portrait HD.", kind: "creation", status: "Disponible", sortOrder: 3 },
  { id: "composition-beats", category: "Audio & Prod", title: "Composition & Beats Sur Mesure", description: "Production instrumentale originale (Afrobeat, Afro-Pop, Trap Sad, Drill, Rap) arrangée sur mesure (S3B Studio).", price: "À partir de 50 $", visual: "audio", deliverables: "Composition originale, arrangement sur mesure et exports audio adaptés à votre production.", kind: "service", status: "Disponible", sortOrder: 4 },
  { id: "mixage-mastering-doublage", category: "Audio & Prod", title: "Mixage Vocal, Mastering & Doublage", description: "Enregistrement, nettoyage vocal, mixage professionnel, mastering prêt pour le streaming et voix-off / doublage.", price: "À partir de 40 $", visual: "audio", deliverables: "Enregistrement, nettoyage vocal, mixage, mastering streaming et voix-off ou doublage.", kind: "service", status: "Disponible", sortOrder: 5 },
  { id: "realisation-clips-cinema", category: "Vidéo & Cinéma", title: "Réalisation, Clips & Montage Cinéma", description: "Tournage, réalisation de clips musicaux, spots promotionnels, montage dynamique et étalonnage cinéma V-Log (S3B Cinéma / X-Light).", price: "Sur devis", visual: "cinema", deliverables: "Tournage, réalisation, montage dynamique et étalonnage cinéma V-Log.", kind: "service", status: "Sur devis", sortOrder: 6 },
  { id: "sites-web-applications", category: "Web & Tech", title: "Création de Sites Web & Applications Sur Mesure", description: "Conception de sites vitrines modernes, plateformes web, outils de gestion et automatisations WhatsApp / IA.", price: "Sur devis", visual: "space", deliverables: "Site vitrine, plateforme web, outil de gestion ou automatisation WhatsApp / IA selon le besoin.", kind: "service", status: "Sur devis", sortOrder: 7 },
  { id: "patisserie-63-food", category: "Pâtisserie 63 Food", title: "Commandes Événementielles & Gros — Pâtisserie 63 Food", description: "Cupcakes artisanaux et pâtisseries fraîches pour événements, cérémonies, revendeurs et dépositaires à Kinshasa.", price: "Sur devis / Tarifs de gros", visual: "lettering", deliverables: "Cupcakes artisanaux et pâtisseries fraîches. Commandes pour événements, cérémonies, revendeurs et dépositaires à Kinshasa.", kind: "service", status: "Sur devis", sortOrder: 8 },
];