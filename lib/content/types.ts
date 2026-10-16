import type { TopicId } from "./topics";

export interface ArticleSection {
  id: string;
  heading: string;
  paragraphs: string[];
  formula?: string;
  list?: string[];
}

export interface Citation {
  title: string;
  publisher: string;
  url: string;
  accessed: string;
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  topic: TopicId;
  published: string;
  reviewed: string;
  applicable?: string;
  sections: ArticleSection[];
  sources: Citation[];
  calculators: string[];
  related: string[];
}
