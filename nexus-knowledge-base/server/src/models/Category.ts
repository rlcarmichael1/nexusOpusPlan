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
 * Tag for labeling articles
 */
export interface Tag {
  name: string;
  articleCount: number;
}

/**
 * ITSM-relevant default categories
 */
export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'articleCount' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Incident Resolution',
    description: 'Articles related to resolving incidents and outages',
    order: 1,
  },
  {
    name: 'Service Request',
    description: 'How-to guides for common service requests',
    order: 2,
  },
  {
    name: 'Change Management',
    description: 'Change procedures and documentation',
    order: 3,
  },
  {
    name: 'Problem Management',
    description: 'Root cause analysis and known error documentation',
    order: 4,
  },
  {
    name: 'Asset Management',
    description: 'Hardware and software asset information',
    order: 5,
  },
  {
    name: 'Security',
    description: 'Security policies and procedures',
    order: 6,
  },
  {
    name: 'Network',
    description: 'Network infrastructure and connectivity',
    order: 7,
  },
  {
    name: 'Applications',
    description: 'Application-specific documentation',
    order: 8,
  },
  {
    name: 'End User Support',
    description: 'General end-user support articles',
    order: 9,
  },
  {
    name: 'Training',
    description: 'Training materials and tutorials',
    order: 10,
  },
];
