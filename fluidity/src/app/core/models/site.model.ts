export interface ServiceItem {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly points: readonly string[];
}

export interface SolutionItem {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly problem: string;
  readonly solution: string;
  readonly benefits: readonly string[];
  readonly features: readonly string[];
}

export interface ProcessStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface ProjectItem {
  readonly id: string;
  readonly title: string;
  readonly client: string;
  readonly industry: string;
  readonly description: string;
  readonly services: readonly string[];
  readonly technologies: readonly string[];
  readonly results: readonly string[];
  readonly hue: number;
}

export interface TechCategory {
  readonly id: string;
  readonly title: string;
  readonly items: readonly string[];
}

export interface TestimonialItem {
  readonly id: string;
  readonly quote: string;
  readonly author: string;
  readonly role: string;
  readonly company: string;
}

export interface StatItem {
  readonly id: string;
  readonly value: number;
  readonly suffix: string;
  readonly label: string;
  readonly note?: string;
}

export interface ValueItem {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface WhyItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface ContactInfo {
  readonly address: string;
  readonly email: string;
  readonly phone: string;
  readonly hours: string;
}

export interface SocialLink {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly url: string;
}
