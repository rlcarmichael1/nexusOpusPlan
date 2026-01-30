import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import styles from './ArticleCard.module.css';
import { ArticleSummary, ARTICLE_STATUS_CONFIG } from '../../../types';
import { useUI, useCategories } from '../../../contexts';
import { Badge } from '../../common';

interface ArticleCardProps {
  article: ArticleSummary;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  draft: 'warning',
  published: 'success',
  archived: 'default',
  deleted: 'danger',
};

export function ArticleCard({ article }: ArticleCardProps) {
  const navigate = useNavigate();
  const { layoutMode } = useUI();
  const { getCategoryById } = useCategories();

  const category = article.categoryId ? getCategoryById(article.categoryId) : null;
  const statusConfig = ARTICLE_STATUS_CONFIG[article.status];

  const handleClick = () => {
    navigate(`/articles/${article.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/articles/${article.id}`);
    }
  };

  const cardClass = [
    styles.card,
    layoutMode === 'sidebar' && styles.compact,
  ]
    .filter(Boolean)
    .join(' ');

  // Strip HTML tags for excerpt
  const plainExcerpt = article.excerpt?.replace(/<[^>]*>/g, '') || '';

  return (
    <article
      className={cardClass}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View article: ${article.title}`}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>{article.title}</h3>
        <div className={styles.status}>
          <Badge variant={statusVariant[article.status]} size="small">
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {plainExcerpt && <p className={styles.excerpt}>{plainExcerpt}</p>}

      <div className={styles.meta}>
        {category && <span className={styles.category}>{category.name}</span>}
        <span className={styles.metaItem}>
          by {article.author?.displayName || 'Unknown'}
        </span>
        <span className={styles.metaItem}>
          {format(new Date(article.updatedAt), 'MMM d, yyyy')}
        </span>
        {article.viewCount > 0 && (
          <span className={styles.metaItem}>{article.viewCount} views</span>
        )}
      </div>

      {article.tags && article.tags.length > 0 && (
        <div className={styles.tags}>
          {article.tags.slice(0, 5).map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
          {article.tags.length > 5 && (
            <span className={styles.tag}>+{article.tags.length - 5}</span>
          )}
        </div>
      )}
    </article>
  );
}

export default ArticleCard;
