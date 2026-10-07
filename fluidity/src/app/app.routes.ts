import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
    title: 'Fluidity — Technologie qui s’adapte à votre entreprise',
  },
  {
    path: 'a-propos',
    loadComponent: () => import('./pages/about/about.page').then((m) => m.AboutPage),
    title: 'À propos | Fluidity',
  },
  {
    path: 'services',
    loadComponent: () => import('./pages/services/services.page').then((m) => m.ServicesPage),
    title: 'Services | Fluidity',
  },
  {
    path: 'solutions',
    loadComponent: () => import('./pages/solutions/solutions.page').then((m) => m.SolutionsPage),
    title: 'Solutions | Fluidity',
  },
  {
    path: 'projets',
    loadComponent: () => import('./pages/projects/projects.page').then((m) => m.ProjectsPage),
    title: 'Réalisations | Fluidity',
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.page').then((m) => m.ContactPage),
    title: 'Contact | Fluidity',
  },
  {
    path: 'mentions-legales',
    loadComponent: () => import('./pages/legal/legal.page').then((m) => m.LegalPage),
    title: 'Mentions légales | Fluidity',
  },
  {
    path: 'politique-confidentialite',
    loadComponent: () => import('./pages/legal/legal.page').then((m) => m.LegalPage),
    title: 'Politique de confidentialité | Fluidity',
    data: { legal: 'privacy' },
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
    title: 'Page introuvable | Fluidity',
  },
];
