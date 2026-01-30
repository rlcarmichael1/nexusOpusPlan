import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Category } from '../types';
import { categoryService } from '../services';

/**
 * Category State Interface
 */
interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Category Actions
 */
type CategoryAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Category[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string };

/**
 * Initial state
 */
const initialState: CategoryState = {
  categories: [],
  isLoading: false,
  error: null,
};

/**
 * Category reducer
 */
function categoryReducer(state: CategoryState, action: CategoryAction): CategoryState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, categories: action.payload, isLoading: false };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };
    default:
      return state;
  }
}

/**
 * Category Context Interface
 */
interface CategoryContextType extends CategoryState {
  fetchCategories: () => Promise<void>;
  createCategory: (name: string, description?: string, parentId?: string) => Promise<Category>;
  updateCategory: (id: string, name?: string, description?: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryPath: (id: string) => Category[];
  getRootCategories: () => Category[];
  getChildCategories: (parentId: string) => Category[];
}

/**
 * Create context
 */
const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

/**
 * Category Provider Component
 */
interface CategoryProviderProps {
  children: ReactNode;
}

export function CategoryProvider({ children }: CategoryProviderProps) {
  const [state, dispatch] = useReducer(categoryReducer, initialState);
  const hasFetched = useRef(false);

  /**
   * Fetch all categories
   */
  const fetchCategories = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const response = await categoryService.getAll();
      dispatch({ type: 'FETCH_SUCCESS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: 'Failed to load categories' });
    }
  }, []);

  /**
   * Create a new category
   */
  const createCategory = useCallback(
    async (name: string, description?: string, parentId?: string): Promise<Category> => {
      const response = await categoryService.create(name, description, parentId);
      dispatch({ type: 'ADD_CATEGORY', payload: response.data });
      return response.data;
    },
    []
  );

  /**
   * Update a category
   */
  const updateCategory = useCallback(
    async (id: string, name?: string, description?: string): Promise<Category> => {
      const response = await categoryService.update(id, name, description);
      dispatch({ type: 'UPDATE_CATEGORY', payload: response.data });
      return response.data;
    },
    []
  );

  /**
   * Delete a category
   */
  const deleteCategory = useCallback(async (id: string) => {
    await categoryService.delete(id);
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  }, []);

  /**
   * Get category by ID
   */
  const getCategoryById = useCallback(
    (id: string): Category | undefined => {
      return state.categories.find((c) => c.id === id);
    },
    [state.categories]
  );

  /**
   * Get category path (breadcrumb)
   */
  const getCategoryPath = useCallback(
    (id: string): Category[] => {
      const path: Category[] = [];
      let current = getCategoryById(id);
      
      while (current) {
        path.unshift(current);
        current = current.parentId ? getCategoryById(current.parentId) : undefined;
      }
      
      return path;
    },
    [getCategoryById]
  );

  /**
   * Get root categories (no parent)
   */
  const getRootCategories = useCallback((): Category[] => {
    return state.categories.filter((c) => !c.parentId);
  }, [state.categories]);

  /**
   * Get child categories of a parent
   */
  const getChildCategories = useCallback(
    (parentId: string): Category[] => {
      return state.categories.filter((c) => c.parentId === parentId);
    },
    [state.categories]
  );

  /**
   * Fetch categories on mount
   */
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchCategories();
    }
  }, [fetchCategories]);

  const value: CategoryContextType = {
    ...state,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryPath,
    getRootCategories,
    getChildCategories,
  };

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

/**
 * Custom hook to use category context
 */
export function useCategories(): CategoryContextType {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
}

export default CategoryContext;
