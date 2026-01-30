import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { Category, Tag, DEFAULT_CATEGORIES } from '../models';
import config from '../config';
import { logger, FileSystemError, NotFoundError, withRetry } from '../utils';

/**
 * Category Repository Interface
 */
export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  create(name: string, description?: string, parentId?: string): Promise<Category>;
  update(id: string, name?: string, description?: string): Promise<Category>;
  delete(id: string): Promise<void>;
  updateArticleCount(categoryName: string, delta: number): Promise<void>;
  seedDefaultCategories(): Promise<void>;
}

/**
 * File-based Category Repository
 * 
 * Stores categories in a single JSON file:
 * /categories/categories.json
 */
export class FileCategoryRepository implements ICategoryRepository {
  private readonly categoriesDir: string;
  private readonly filePath: string;
  private cache: Category[] | null = null;

  constructor() {
    this.categoriesDir = config.storage.categoriesPath;
    this.filePath = path.join(this.categoriesDir, 'categories.json');
  }

  /**
   * Initialize the repository
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.categoriesDir, { recursive: true });
      logger.info('File category repository initialized', { path: this.categoriesDir });
    } catch (error) {
      throw new FileSystemError('initialize category repository', this.categoriesDir, error as Error);
    }
  }

  /**
   * Load categories from file
   */
  private async loadCategories(): Promise<Category[]> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.cache = JSON.parse(content) as Category[];
      return this.cache;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = [];
        return this.cache;
      }
      throw new FileSystemError('load categories', this.filePath, error as Error);
    }
  }

  /**
   * Save categories to file
   */
  private async saveCategories(categories: Category[]): Promise<void> {
    await withRetry(
      async () => {
        await fs.writeFile(this.filePath, JSON.stringify(categories, null, 2), 'utf-8');
        this.cache = categories;
      },
      'save categories to file',
      { maxAttempts: 3 }
    );
  }

  async findAll(): Promise<Category[]> {
    const categories = await this.loadCategories();
    return [...categories].sort((a, b) => a.order - b.order);
  }

  async findById(id: string): Promise<Category | null> {
    const categories = await this.loadCategories();
    return categories.find(c => c.id === id) || null;
  }

  async findByName(name: string): Promise<Category | null> {
    const categories = await this.loadCategories();
    return categories.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
  }

  async create(name: string, description?: string, parentId?: string): Promise<Category> {
    const categories = await this.loadCategories();
    
    // Check for duplicate name
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Category '${name}' already exists`);
    }

    const now = new Date().toISOString();
    const category: Category = {
      id: uuidv4(),
      name,
      description,
      parentId,
      order: categories.length + 1,
      articleCount: 0,
      createdAt: now,
    };

    categories.push(category);
    await this.saveCategories(categories);

    logger.info('Category created', { categoryId: category.id, name });
    return category;
  }

  async update(id: string, name?: string, description?: string): Promise<Category> {
    const categories = await this.loadCategories();
    const index = categories.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new NotFoundError('Category', id);
    }

    // Check for duplicate name if updating name
    if (name && categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Category '${name}' already exists`);
    }

    categories[index] = {
      ...categories[index],
      ...(name && { name }),
      ...(description !== undefined && { description }),
      updatedAt: new Date().toISOString(),
    };

    await this.saveCategories(categories);

    logger.info('Category updated', { categoryId: id });
    return categories[index];
  }

  async delete(id: string): Promise<void> {
    const categories = await this.loadCategories();
    const category = categories.find(c => c.id === id);
    
    if (!category) {
      throw new NotFoundError('Category', id);
    }

    if (category.articleCount > 0) {
      throw new Error(`Cannot delete category '${category.name}' - it has ${category.articleCount} articles`);
    }

    const filtered = categories.filter(c => c.id !== id);
    await this.saveCategories(filtered);

    logger.info('Category deleted', { categoryId: id });
  }

  async updateArticleCount(categoryName: string, delta: number): Promise<void> {
    const categories = await this.loadCategories();
    const category = categories.find(c => c.name === categoryName);
    
    if (category) {
      category.articleCount = Math.max(0, category.articleCount + delta);
      await this.saveCategories(categories);
    }
  }

  async seedDefaultCategories(): Promise<void> {
    const categories = await this.loadCategories();
    
    if (categories.length > 0) {
      logger.info('Categories already exist, skipping seed');
      return;
    }

    const now = new Date().toISOString();
    const seededCategories: Category[] = DEFAULT_CATEGORIES.map((cat, index) => ({
      id: uuidv4(),
      name: cat.name,
      description: cat.description,
      order: cat.order,
      articleCount: 0,
      createdAt: now,
    }));

    await this.saveCategories(seededCategories);
    logger.info('Default categories seeded', { count: seededCategories.length });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache = null;
  }
}

// Export singleton instance
export const fileCategoryRepository = new FileCategoryRepository();
