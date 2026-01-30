import { Article } from './Article';

/**
 * Article version for history tracking
 */
export interface ArticleVersion {
  id: string;
  articleId: string;
  version: number;
  briefTitle: string;
  detailedDescription: string;
  category: string;
  tags: string[];
  relatedArticles: string[];
  status: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  changeReason?: string;
  changeSummary?: string;
}

/**
 * Create a version snapshot from an article
 */
export function createVersionFromArticle(
  article: Article,
  changedBy: string,
  changedByName: string,
  changeReason?: string
): Omit<ArticleVersion, 'id'> {
  return {
    articleId: article.id,
    version: article.version,
    briefTitle: article.briefTitle,
    detailedDescription: article.detailedDescription,
    category: article.category,
    tags: [...article.tags],
    relatedArticles: [...article.relatedArticles],
    status: article.status,
    changedBy,
    changedByName,
    changedAt: new Date().toISOString(),
    changeReason,
    changeSummary: generateChangeSummary(article),
  };
}

/**
 * Generate a human-readable change summary
 */
function generateChangeSummary(article: Article): string {
  const parts: string[] = [];
  
  if (article.version === 1) {
    parts.push('Initial version created');
  } else {
    parts.push(`Updated to version ${article.version}`);
  }
  
  if (article.status === 'published') {
    parts.push('Published');
  } else if (article.status === 'archived') {
    parts.push('Archived');
  }
  
  return parts.join('. ');
}

/**
 * Version comparison result
 */
export interface VersionDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Compare two versions and return differences
 */
export function compareVersions(
  oldVersion: ArticleVersion,
  newVersion: ArticleVersion
): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  const comparableFields: (keyof ArticleVersion)[] = [
    'briefTitle',
    'detailedDescription',
    'category',
    'status',
  ];

  for (const field of comparableFields) {
    if (oldVersion[field] !== newVersion[field]) {
      diffs.push({
        field,
        oldValue: oldVersion[field],
        newValue: newVersion[field],
      });
    }
  }

  // Compare arrays
  if (JSON.stringify(oldVersion.tags) !== JSON.stringify(newVersion.tags)) {
    diffs.push({
      field: 'tags',
      oldValue: oldVersion.tags,
      newValue: newVersion.tags,
    });
  }

  if (JSON.stringify(oldVersion.relatedArticles) !== JSON.stringify(newVersion.relatedArticles)) {
    diffs.push({
      field: 'relatedArticles',
      oldValue: oldVersion.relatedArticles,
      newValue: newVersion.relatedArticles,
    });
  }

  return diffs;
}

/**
 * Version list response
 */
export interface VersionListResponse {
  articleId: string;
  currentVersion: number;
  versions: ArticleVersion[];
}
