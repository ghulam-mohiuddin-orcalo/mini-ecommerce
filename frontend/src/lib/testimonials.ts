import type { FeaturedReview } from '@/lib/types';

export interface HomeTestimonial {
  id: string;
  rating: number;
  quote: string;
  customerName: string;
  initials: string;
  avatarTone: 'teal' | 'brass' | 'pine';
}

export const fallbackTestimonials: HomeTestimonial[] = [
  {
    id: 'fallback-elise',
    rating: 5,
    quote: 'Arrived impeccably packed and looks even better in person. The quality is genuinely unreal.',
    customerName: 'Elise M.',
    initials: 'EM',
    avatarTone: 'teal',
  },
  {
    id: 'fallback-theo',
    rating: 5,
    quote: "I've bought three now. Verdant has quietly become my favourite shop on the whole internet.",
    customerName: 'Theo R.',
    initials: 'TR',
    avatarTone: 'brass',
  },
  {
    id: 'fallback-priya',
    rating: 5,
    quote: 'Beautiful objects and fast shipping. The packaging alone made the unboxing feel like a gift.',
    customerName: 'Priya N.',
    initials: 'PN',
    avatarTone: 'pine',
  },
];

const avatarTones: HomeTestimonial['avatarTone'][] = ['teal', 'brass', 'pine'];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function toHomeTestimonial(review: FeaturedReview, index: number): HomeTestimonial {
  return {
    id: review.id,
    rating: review.rating,
    quote: review.body,
    customerName: review.userName,
    initials: getInitials(review.userName),
    avatarTone: avatarTones[index % avatarTones.length],
  };
}
