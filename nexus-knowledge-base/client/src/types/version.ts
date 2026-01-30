/**
 * Article version
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
 * Version list response
 */
export interface VersionListResponse {
  articleId: string;
  currentVersion: number;
  versions: ArticleVersion[];
}

/**
 * Version diff
 */
export interface VersionDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Version comparison response
 */
export interface VersionCompareResponse {
  older: ArticleVersion;
  newer: ArticleVersion;
  diff: VersionDiff[];
}
