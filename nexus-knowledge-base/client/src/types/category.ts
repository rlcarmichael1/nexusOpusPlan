/**
 * Category for organizing articles
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  order: number;
  articleCount: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Tag with article count
 */
export interface Tag {
  name: string;
  count: number;
}
