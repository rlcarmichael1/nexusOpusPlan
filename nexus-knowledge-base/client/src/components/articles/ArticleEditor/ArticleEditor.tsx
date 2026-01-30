import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './ArticleEditor.module.css';
import { useArticles, useCategories, useAuth, useUI } from '../../../contexts';
import { useLock, useDebounce } from '../../../hooks';
import { CreateArticleInput, UpdateArticleInput } from '../../../types';
import { Button, Input, Select, Spinner, TextArea } from '../../common';

const AUTOSAVE_DELAY = 30000; // 30 seconds

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'indent',
  'blockquote',
  'code-block',
  'link',
  'image',
];

export function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { layoutMode, addToast } = useUI();
  const { user, canCreate, canEdit } = useAuth();
  const { categories, getRootCategories } = useCategories();
  const { currentArticle, isLoading, isCreating, isUpdating, getArticle, createArticle, updateArticle, clearCurrent } = useArticles();
  const { isLocked, isOwnLock, lockedByUser, acquire, release } = useLock(id);

  const isNew = !id;
  const [briefTitle, setBriefTitle] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lockAcquired, setLockAcquired] = useState(false);

  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load article for editing
  useEffect(() => {
    if (id) {
      getArticle(id);
    } else {
      clearCurrent();
    }
    
    return () => {
      clearCurrent();
    };
  }, [id, getArticle, clearCurrent]);

  // Populate form when article loads
  useEffect(() => {
    if (currentArticle && id) {
      setBriefTitle(currentArticle.briefTitle);
      setDetailedDescription(currentArticle.detailedDescription);
      setCategory(currentArticle.category || '');
      setTags(currentArticle.tags || []);
    }
  }, [currentArticle, id]);

  // Acquire lock when editing
  useEffect(() => {
    const acquireLock = async () => {
      if (id && !isNew && !lockAcquired) {
        const acquired = await acquire();
        setLockAcquired(acquired);
        if (!acquired) {
          addToast('Could not acquire lock. Article may be locked by another user.', 'warning');
        }
      }
    };

    acquireLock();

    return () => {
      if (lockAcquired) {
        release();
      }
    };
  }, [id, isNew, acquire, release, lockAcquired, addToast]);

  // Autosave for drafts
  useEffect(() => {
    if (!isNew && lockAcquired && hasUnsavedChanges && currentArticle?.status === 'draft') {
      autosaveTimer.current = setTimeout(() => {
        handleAutosave();
      }, AUTOSAVE_DELAY);

      return () => {
        if (autosaveTimer.current) {
          clearTimeout(autosaveTimer.current);
        }
      };
    }
  }, [hasUnsavedChanges, briefTitle, detailedDescription, category, tags]);

  const handleAutosave = async () => {
    if (!id || !lockAcquired) return;
    
    try {
      await updateArticle(id, { briefTitle, detailedDescription, category, tags });
      setHasUnsavedChanges(false);
      addToast('Changes saved automatically', 'info');
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  };

  const handleContentChange = (value: string) => {
    setDetailedDescription(value);
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBriefTitle(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setHasUnsavedChanges(true);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
      setHasUnsavedChanges(true);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!briefTitle.trim()) {
      addToast('Title is required', 'error');
      return;
    }

    if (!detailedDescription.trim() || detailedDescription === '<p><br></p>') {
      addToast('Content is required', 'error');
      return;
    }

    if (!category) {
      addToast('Category is required', 'error');
      return;
    }

    try {
      if (isNew) {
        const input: CreateArticleInput = {
          briefTitle: briefTitle.trim(),
          detailedDescription,
          category,
          tags,
        };
        const article = await createArticle(input);
        addToast('Article created successfully', 'success');
        navigate(`/articles/${article.id}`);
      } else if (id) {
        const input: UpdateArticleInput = {
          briefTitle: briefTitle.trim(),
          detailedDescription,
          category,
          tags,
        };
        await updateArticle(id, input, changeReason || undefined);
        addToast('Article updated successfully', 'success');
        navigate(`/articles/${id}`);
      }
    } catch (error: any) {
      addToast(error.message || 'Failed to save article', 'error');
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirm) return;
    }
    navigate(id ? `/articles/${id}` : '/');
  };

  // Check permissions
  if (isNew && !canCreate()) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Permission Denied</h2>
        <p>You don't have permission to create articles.</p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to Articles
        </Button>
      </div>
    );
  }

  if (!isNew && currentArticle && !canEdit(currentArticle.authorId)) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Permission Denied</h2>
        <p>You don't have permission to edit this article.</p>
        <Button variant="primary" onClick={() => navigate(`/articles/${id}`)}>
          Back to Article
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Spinner size="large" />
      </div>
    );
  }

  // Check lock status for editing
  const showLockWarning = !isNew && isLocked && !isOwnLock;

  const categoryOptions = [
    { value: '', label: 'Select Category' },
    ...getRootCategories().map((cat) => ({
      value: cat.id,
      label: cat.name,
    })),
  ];

  const containerClass = [
    styles.editorContainer,
    layoutMode === 'sidebar' && styles.sidebar,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{isNew ? 'New Article' : 'Edit Article'}</h1>
        <div className={styles.actions}>
          {hasUnsavedChanges && (
            <div className={styles.autosaveIndicator}>
              <span className={`${styles.autosaveDot} ${isUpdating ? styles.saving : ''}`} />
              {isUpdating ? 'Saving...' : 'Unsaved changes'}
            </div>
          )}
        </div>
      </div>

      {/* Lock Warning */}
      {showLockWarning && (
        <div className={styles.lockBanner}>
          <span>
            This article is being edited by <strong>{lockedByUser}</strong>. Your changes may be lost.
          </span>
        </div>
      )}

      {/* Lock acquired indicator */}
      {lockAcquired && (
        <div className={styles.lockBanner} style={{ backgroundColor: '#dcfce7', borderColor: '#bbf7d0', color: '#166534' }}>
          <span>You have locked this article for editing.</span>
        </div>
      )}

      {/* Form */}
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Title"
          value={briefTitle}
          onChange={handleTitleChange}
          placeholder="Enter article title"
          required
        />

        <div className={styles.formRow}>
          <Select
            label="Category"
            options={categoryOptions}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setHasUnsavedChanges(true);
            }}
            required
          />
        </div>

        {/* Tags Input */}
        <div className={styles.tagsInput}>
          <label className={styles.tagsLabel}>Tags</label>
          <div className={styles.tagsContainer}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tagItem}>
                {tag}
                <button
                  type="button"
                  className={styles.tagRemove}
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              className={styles.tagInput}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              placeholder={tags.length === 0 ? 'Add tags...' : ''}
            />
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className={styles.editorWrapper}>
          <label className={styles.editorLabel}>Content</label>
          <div className={styles.editor}>
            <ReactQuill
              theme="snow"
              value={detailedDescription}
              onChange={handleContentChange}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Write your article content here..."
            />
          </div>
        </div>

        {/* Change Reason for updates */}
        {!isNew && (
          <div className={styles.changeReason}>
            <TextArea
              label="Change Reason (optional)"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Describe what you changed..."
              rows={2}
            />
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isCreating || isUpdating}
            disabled={showLockWarning}
          >
            {isNew ? 'Create Article' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ArticleEditor;
