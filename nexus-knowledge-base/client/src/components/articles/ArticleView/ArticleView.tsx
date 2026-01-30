import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import styles from './ArticleView.module.css';
import { useArticles, useCategories, useAuth, useUI } from '../../../contexts';
import { useLock } from '../../../hooks';
import { ARTICLE_STATUS_CONFIG } from '../../../types';
import { Button, Badge, Spinner, ConfirmDialog } from '../../common';
import { CommentSection } from '../../comments';

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M11.5 2.5L13.5 4.5M2 14L4.5 13.5L13 5L11 3L2.5 11.5L2 14Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M2 4H14M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M6 7V11M10 7V11M4 4L5 13C5 13.5523 5.44772 14 6 14H10C10.5523 14 11 13.5523 11 13L12 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M5 7V5C5 3.34315 6.34315 2 8 2C9.65685 2 11 3.34315 11 5V7"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  draft: 'warning',
  published: 'success',
  archived: 'default',
  deleted: 'danger',
};

export function ArticleView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { layoutMode } = useUI();
  const { user, canEdit, canDelete, canPublish, hasPermission } = useAuth();
  const { currentArticle, isLoading, getArticle, deleteArticle, publishArticle, archiveArticle } =
    useArticles();
  const { getCategoryById, getCategoryPath } = useCategories();
  const { isLocked, isOwnLock, lockedByUser } = useLock(id);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      getArticle(id);
    }
  }, [id, getArticle]);

  const handleEdit = () => {
    navigate(`/articles/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteArticle(id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    await publishArticle(id);
  };

  const handleArchive = async () => {
    if (!id) return;
    await archiveArticle(id);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!currentArticle) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Article not found</h2>
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to Articles
        </Button>
      </div>
    );
  }

  const category = currentArticle.categoryId
    ? getCategoryById(currentArticle.categoryId)
    : null;
  const categoryPath = currentArticle.categoryId
    ? getCategoryPath(currentArticle.categoryId)
    : [];
  const statusConfig = ARTICLE_STATUS_CONFIG[currentArticle.status];
  const canEditArticle = canEdit(currentArticle.authorId);
  const showLockWarning = isLocked && !isOwnLock;

  const containerClass = [
    styles.viewContainer,
    layoutMode === 'sidebar' && styles.sidebar,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      {/* Header */}
      <header className={styles.header}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link to="/">Knowledge Base</Link>
          {categoryPath.map((cat, index) => (
            <React.Fragment key={cat.id}>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span>{cat.name}</span>
            </React.Fragment>
          ))}
        </nav>

        {/* Title and Actions */}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{currentArticle.title}</h1>
          <div className={styles.actions}>
            <Badge variant={statusVariant[currentArticle.status]}>
              {statusConfig.label}
            </Badge>
            {canEditArticle && (
              <Button
                variant="secondary"
                size="small"
                leftIcon={<EditIcon />}
                onClick={handleEdit}
                disabled={showLockWarning}
              >
                Edit
              </Button>
            )}
            {canDelete() && (
              <Button
                variant="ghost"
                size="small"
                leftIcon={<TrashIcon />}
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            by <span className={styles.authorName}>{currentArticle.author?.displayName}</span>
          </span>
          <span className={styles.metaItem}>
            Updated {format(new Date(currentArticle.updatedAt), 'MMM d, yyyy')}
          </span>
          <span className={styles.metaItem}>v{currentArticle.version}</span>
          {currentArticle.viewCount > 0 && (
            <span className={styles.metaItem}>{currentArticle.viewCount} views</span>
          )}
        </div>

        {/* Tags */}
        {currentArticle.tags && currentArticle.tags.length > 0 && (
          <div className={styles.tags}>
            {currentArticle.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Publish/Archive actions */}
        {canPublish() && currentArticle.status === 'draft' && (
          <Button variant="success" size="small" onClick={handlePublish}>
            Publish Article
          </Button>
        )}
        {canPublish() && currentArticle.status === 'published' && (
          <Button variant="secondary" size="small" onClick={handleArchive}>
            Archive Article
          </Button>
        )}
      </header>

      {/* Lock Warning */}
      {showLockWarning && (
        <div className={styles.lockBanner}>
          <LockIcon />
          <span>
            This article is currently being edited by <strong>{lockedByUser}</strong>
          </span>
        </div>
      )}

      {/* Content */}
      <div className={styles.contentCard}>
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: currentArticle.content }}
        />
      </div>

      {/* Comments */}
      {hasPermission('comment') && <CommentSection articleId={currentArticle.id} />}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Article"
        message={`Are you sure you want to delete "${currentArticle.title}"? This action can be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

export default ArticleView;
