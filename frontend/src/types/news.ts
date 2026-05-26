export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  hero_image_url?: string;
  author_name: string;
  tags: string[];
  published_at: string;
  read_time_min: number; // Berechnen wir im Frontend
}