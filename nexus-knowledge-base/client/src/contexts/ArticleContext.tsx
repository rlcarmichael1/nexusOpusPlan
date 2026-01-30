import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';
import {
  Article,
  ArticleSummary,
  CreateArticleInput,
  UpdateArticleInput,
  ArticleSearchParams,
  PaginatedResponse,
  Tag,
  ApiError,
} from '../types';
import { articleService } from '../services';

/**
 * Article State Interface
 */
interface ArticleState {
  articles: ArticleSummary[];
  currentArticle: Article | null;
  tags: Tag[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: ApiError | null;
  searchParams: ArticleSearchParams;
}

/**
 * Article Actions
 */
type ArticleAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: PaginatedResponse<ArticleSummary> }
  | { type: 'FETCH_ERROR'; payload: ApiError }
  | { type: 'FETCH_SINGLE_SUCCESS'; payload: Article }
  | { type: 'CREATE_START' }
  | { type: 'CREATE_SUCCESS'; payload: Article }
  | { type: 'CREATE_ERROR'; payload: ApiError }
  | { type: 'UPDATE_START' }
  | { type: 'UPDATE_SUCCESS'; payload: Article }
  | { type: 'UPDATE_ERROR'; payload: ApiError }
  | { type: 'DELETE_START' }
  | { type: 'DELETE_SUCCESS'; payload: string }
  | { type: 'DELETE_ERROR'; payload: ApiError }
  | { type: 'SET_SEARCH_PARAMS'; payload: ArticleSearchParams }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'CLEAR_CURRENT' }
  | { type: 'CLEAR_ERROR' };

/**
 * Initial state
 */
const initialState: ArticleState = {
  articles: [],
  currentArticle: null,
  tags: [],
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  pageSize: 10,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  searchParams: {},
};

/**
 * Article reducer
 */
function articleReducer(state: ArticleState, action: ArticleAction): ArticleState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        articles: action.payload.data,
        totalCount: action.payload.total,
        currentPage: action.payload.page,
        totalPages: action.payload.pages,
        pageSize: action.payload.limit,
        isLoading: false,
      };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'FETCH_SINGLE_SUCCESS':
      return { ...state, currentArticle: action.payload, isLoading: false };
    case 'CREATE_START':
      return { ...state, isCreating: true, error: null };
    case 'CREATE_SUCCESS':
      return {
        ...state,
        isCreating: false,
        currentArticle: action.payload,
      };
    case 'CREATE_ERROR':
      return { ...state, isCreating: false, error: action.payload };
    case 'UPDATE_START':
      return { ...state, isUpdating: true, error: null };
    case 'UPDATE_SUCCESS':
      return {
        ...state,
        isUpdating: false,
        currentArticle: action.payload,
        articles: state.articles.map((a) =>
          a.id === action.payload.id
            ? {
                ...a,
                title: action.payload.title,
                status: action.payload.status,
                updatedAt: action.payload.updatedAt,
              }
            : a
        ),
      };
    case 'UPDATE_ERROR':
      return { ...state, isUpdating: false, error: action.payload };
    case 'DELETE_START':
      return { ...state, isDeleting: true, error: null };
    case 'DELETE_SUCCESS':
      return {
        ...state,
        isDeleting: false,
        articles: state.articles.filter((a) => a.id !== action.payload),
        currentArticle:
          state.currentArticle?.id === action.payload ? null : state.currentArticle,
      };
    case 'DELETE_ERROR':
      return { ...state, isDeleting: false, error: action.payload };
    case 'SET_SEARCH_PARAMS':
      return { ...state, searchParams: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'CLEAR_CURRENT':
      return { ...state, currentArticle: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

/**
 * Article Context Interface
 */
interface ArticleContextType extends ArticleState {
  searchArticles: (params?: ArticleSearchParams) => Promise<void>;
  getArticle: (id: string) => Promise<void>;
  createArticle: (input: CreateArticleInput) => Promise<Article>;
  updateArticle: (id: string, input: UpdateArticleInput, changeReason?: string) => Promise<Article>;
  deleteArticle: (id: string) => Promise<void>;
  restoreArticle: (id: string) => Promise<void>;
  publishArticle: (id: string) => Promise<void>;
  archiveArticle: (id: string) => Promise<void>;
  fetchTags: () => Promise<void>;
  setSearchParams: (params: ArticleSearchParams) => void;
  clearCurrent: () => void;
  clearError: () => void;
  setPage: (page: number) => void;
}

/**
 * Create context
 */
const ArticleContext = createContext<ArticleContextType | undefined>(undefined);

/**
 * Article Provider Component
 */
interface ArticleProviderProps {
  children: ReactNode;
}

export function ArticleProvider({ children }: ArticleProviderProps) {
  const [state, dispatch] = useReducer(articleReducer, initialState);

  /**
   * Search articles with filters
   */
  const searchArticles = useCallback(async (params?: ArticleSearchParams) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const mergedParams = { ...state.searchParams, ...params };
      const response = await articleService.search(mergedParams);
      dispatch({ type: 'FETCH_SUCCESS', payload: response });
      dispatch({ type: 'SET_SEARCH_PARAMS', payload: mergedParams });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error as ApiError });
    }
  }, [state.searchParams]);

  /**
   * Get single article by ID
   */
  const getArticle = useCallback(async (id: string) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const response = await articleService.getById(id);
      dispatch({ type: 'FETCH_SINGLE_SUCCESS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error as ApiError });
    }
  }, []);

  /**
   * Create new article
   */
  const createArticle = useCallback(async (input: CreateArticleInput): Promise<Article> => {
    dispatch({ type: 'CREATE_START' });
    try {
      const response = await articleService.create(input);
      dispatch({ type: 'CREATE_SUCCESS', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'CREATE_ERROR', payload: error as ApiError });
      throw error;
    }
  }, []);

  /**
   * Update article
   */
  const updateArticle = useCallback(
    async (id: string, input: UpdateArticleInput, changeReason?: string): Promise<Article> => {
      dispatch({ type: 'UPDATE_START' });
      try {
        const response = await articleService.update(id, input, changeReason);
        dispatch({ type: 'UPDATE_SUCCESS', payload: response.data });
        return response.data;
      } catch (error) {
        dispatch({ type: 'UPDATE_ERROR', payload: error as ApiError });
        throw error;
      }
    },
    []
  );

  /**
   * Delete article (soft delete)
   */
  const deleteArticle = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_START' });
    try {
      await articleService.delete(id);
      dispatch({ type: 'DELETE_SUCCESS', payload: id });
    } catch (error) {
      dispatch({ type: 'DELETE_ERROR', payload: error as ApiError });
      throw error;
    }
  }, []);

  /**
   * Restore deleted article
   */
  const restoreArticle = useCallback(async (id: string) => {
    dispatch({ type: 'UPDATE_START' });
    try {
      const response = await articleService.restore(id);
      dispatch({ type: 'UPDATE_SUCCESS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'UPDATE_ERROR', payload: error as ApiError });
      throw error;
    }
  }, []);

  /**
   * Publish draft article
   */
  const publishArticle = useCallback(async (id: string) => {
    dispatch({ type: 'UPDATE_START' });
    try {
      const response = await articleService.publish(id);
      dispatch({ type: 'UPDATE_SUCCESS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'UPDATE_ERROR', payload: error as ApiError });
      throw error;
    }
  }, []);

  /**
   * Archive article
   */
  const archiveArticle = useCallback(async (id: string) => {
    dispatch({ type: 'UPDATE_START' });
    try {
      const response = await articleService.archive(id);
      dispatch({ type: 'UPDATE_SUCCESS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'UPDATE_ERROR', payload: error as ApiError });
      throw error;
    }
  }, []);

  /**
   * Fetch all tags
   */
  const fetchTags = useCallback(async () => {
    try {
      const response = await articleService.getTags();
      dispatch({ type: 'SET_TAGS', payload: response.data });
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  }, []);

  /**
   * Set search params
   */
  const setSearchParams = useCallback((params: ArticleSearchParams) => {
    dispatch({ type: 'SET_SEARCH_PARAMS', payload: params });
  }, []);

  /**
   * Clear current article
   */
  const clearCurrent = useCallback(() => {
    dispatch({ type: 'CLEAR_CURRENT' });
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  /**
   * Set page
   */
  const setPage = useCallback(
    (page: number) => {
      searchArticles({ ...state.searchParams, page });
    },
    [searchArticles, state.searchParams]
  );

  const value: ArticleContextType = {
    ...state,
    searchArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    restoreArticle,
    publishArticle,
    archiveArticle,
    fetchTags,
    setSearchParams,
    clearCurrent,
    clearError,
    setPage,
  };

  return <ArticleContext.Provider value={value}>{children}</ArticleContext.Provider>;
}

/**
 * Custom hook to use article context
 */
export function useArticles(): ArticleContextType {
  const context = useContext(ArticleContext);
  if (context === undefined) {
    throw new Error('useArticles must be used within an ArticleProvider');
  }
  return context;
}

export default ArticleContext;
