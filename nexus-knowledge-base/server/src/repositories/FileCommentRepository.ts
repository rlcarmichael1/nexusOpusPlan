import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import {
  Comment,
  CreateCommentInput,
  UpdateCommentInput,
  CommentListResponse,
} from '../models';
import config from '../config';
import { logger, FileSystemError, NotFoundError, withRetry } from '../utils';

/**
 * Comment Repository Interface
 */
export interface ICommentRepository {
  create(
    articleId: string,
    input: CreateCommentInput,
    authorId: string,
    authorName: string
  ): Promise<Comment>;
  
  findById(id: string): Promise<Comment | null>;
  update(id: string, input: UpdateCommentInput): Promise<Comment>;
  delete(id: string): Promise<void>;
  findByArticle(articleId: string): Promise<CommentListResponse>;
  deleteByArticle(articleId: string): Promise<void>;
}

/**
 * File-based Comment Repository
 * 
 * Stores comments in a single JSON file per article:
 * /comments/{articleId}.json
 */
export class FileCommentRepository implements ICommentRepository {
  private readonly commentsDir: string;

  constructor() {
    this.commentsDir = config.storage.commentsPath;
  }

  /**
   * Initialize the repository
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.commentsDir, { recursive: true });
      logger.info('File comment repository initialized', { path: this.commentsDir });
    } catch (error) {
      throw new FileSystemError('initialize comment repository', this.commentsDir, error as Error);
    }
  }

  /**
   * Get file path for an article's comments
   */
  private getFilePath(articleId: string): string {
    return path.join(this.commentsDir, `${articleId}.json`);
  }

  /**
   * Load comments for an article
   */
  private async loadComments(articleId: string): Promise<Comment[]> {
    try {
      const content = await fs.readFile(this.getFilePath(articleId), 'utf-8');
      return JSON.parse(content) as Comment[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new FileSystemError('load comments', articleId, error as Error);
    }
  }

  /**
   * Save comments for an article
   */
  private async saveComments(articleId: string, comments: Comment[]): Promise<void> {
    await withRetry(
      async () => {
        await fs.writeFile(
          this.getFilePath(articleId),
          JSON.stringify(comments, null, 2),
          'utf-8'
        );
      },
      'save comments to file',
      { maxAttempts: 3 }
    );
  }

  async create(
    articleId: string,
    input: CreateCommentInput,
    authorId: string,
    authorName: string
  ): Promise<Comment> {
    const comments = await this.loadComments(articleId);
    
    const now = new Date().toISOString();
    const comment: Comment = {
      id: uuidv4(),
      articleId,
      authorId,
      authorName,
      content: input.content,
      createdAt: now,
      isEdited: false,
    };

    comments.push(comment);
    await this.saveComments(articleId, comments);

    logger.info('Comment created', { commentId: comment.id, articleId, authorId });
    return comment;
  }

  async findById(id: string): Promise<Comment | null> {
    // This is inefficient but necessary for file-based storage
    // In a database, this would be a direct lookup
    const files = await fs.readdir(this.commentsDir);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const articleId = file.replace('.json', '');
      const comments = await this.loadComments(articleId);
      const comment = comments.find(c => c.id === id);
      
      if (comment) {
        return comment;
      }
    }
    
    return null;
  }

  async update(id: string, input: UpdateCommentInput): Promise<Comment> {
    const comment = await this.findById(id);
    if (!comment) {
      throw new NotFoundError('Comment', id);
    }

    const comments = await this.loadComments(comment.articleId);
    const index = comments.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new NotFoundError('Comment', id);
    }

    const updatedComment: Comment = {
      ...comment,
      content: input.content,
      updatedAt: new Date().toISOString(),
      isEdited: true,
    };

    comments[index] = updatedComment;
    await this.saveComments(comment.articleId, comments);

    logger.info('Comment updated', { commentId: id });
    return updatedComment;
  }

  async delete(id: string): Promise<void> {
    const comment = await this.findById(id);
    if (!comment) {
      throw new NotFoundError('Comment', id);
    }

    const comments = await this.loadComments(comment.articleId);
    const filteredComments = comments.filter(c => c.id !== id);
    
    await this.saveComments(comment.articleId, filteredComments);
    logger.info('Comment deleted', { commentId: id });
  }

  async findByArticle(articleId: string): Promise<CommentListResponse> {
    const comments = await this.loadComments(articleId);
    
    // Sort by creation date (oldest first for comments)
    comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return {
      articleId,
      comments,
      totalCount: comments.length,
    };
  }

  async deleteByArticle(articleId: string): Promise<void> {
    try {
      await fs.unlink(this.getFilePath(articleId));
      logger.info('Comments deleted for article', { articleId });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new FileSystemError('delete comments', articleId, error as Error);
      }
    }
  }
}

// Export singleton instance
export const fileCommentRepository = new FileCommentRepository();
