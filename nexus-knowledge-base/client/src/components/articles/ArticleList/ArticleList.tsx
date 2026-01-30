import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ArticleList.module.css';
import { useArticles, useCategories, useAuth, useUI } from '../../../contexts';
import { ArticleStatus } from '../../../types';
import { Button, Input, Select, Spinner, EmptyState } from '../../common';
import { ArticleCard } from '../ArticleCard';
import { useDebounce } from '../../../hooks';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M14 14L10.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M2 4H14M4 8H12M6 12H10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function ArticleList() {
  const navigate = useNavigate();
  const { layoutMode } = useUI();
  const { canCreate } = useAuth();
  const { categories, getRootCategories } = useCategories();
  const {
    articles,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    searchParams,
    searchArticles,
    fetchTags,
    tags,
  } = useArticles();

  const [searchQuery, setSearchQuery] = useState(searchParams.query || '');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(
    (searchParams.status as string) || ''
  );
  const [selectedCategory, setSelectedCategory] = useState(searchParams.category || '');

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Initial fetch
  useEffect(() => {
    searchArticles();
    fetchTags();
  }, []);

  // Search on debounced query change
  useEffect(() => {
    searchArticles({
      query: debouncedSearch || undefined,
      status: selectedStatus as ArticleStatus || undefined,
      category: selectedCategory || undefined,
      page: 1,
    });
  }, [debouncedSearch, selectedStatus, selectedCategory, searchArticles]);

  const handlePageChange = useCallback(
    (page: number) => {
      searchArticles({ page });
    },
    [searchArticles]
  );

  const handleCreateArticle = () => {
    navigate('/articles/new');
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...getRootCategories().map((cat) => ({
      value: cat.id,
      label: cat.name,
    })),
  ];

  const containerClass = [
    styles.listContainer,
    layoutMode === 'sidebar' && styles.sidebar,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className={styles.listHeader}>
        <h1 className={styles.listTitle}>
          Knowledge Base
          {totalCount > 0 && (
            <span className={styles.articleCount}>({totalCount} articles)</span>
          )}
        </h1>
        <div className={styles.listActions}>
          {canCreate() && (
            <Button
              variant="primary"
              size={layoutMode === 'sidebar' ? 'small' : 'medium'}
              leftIcon={<PlusIcon />}
              onClick={handleCreateArticle}
            >
              New Article
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className={styles.searchBar}>
        <div className={styles.searchInput}>
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<SearchIcon />}
            inputSize={layoutMode === 'sidebar' ? 'small' : 'medium'}
          />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          size={layoutMode === 'sidebar' ? 'small' : 'medium'}
          leftIcon={<FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <Select
            label="Status"
            options={statusOptions}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            selectSize="small"
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            selectSize="small"
          />
        </div>
      )}

      {/* Article List */}
      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Spinner size="large" />
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          title="No articles found"
          description={
            searchQuery || selectedStatus || selectedCategory
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first article'
          }
          action={
            canCreate() && !searchQuery && !selectedStatus && !selectedCategory ? (
              <Button variant="primary" leftIcon={<PlusIcon />} onClick={handleCreateArticle}>
                Create Article
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={styles.articleList}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="secondary"
            size="small"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="small"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default ArticleList;
