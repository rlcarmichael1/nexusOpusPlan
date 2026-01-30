import { useState, useCallback } from 'react';
import { Comment, CreateCommentInput, UpdateCommentInput } from '../types';
import { commentService } from '../services';
import { useUI } from '../contexts';

/**
 * Custom hook for article comments
 */
export function useComments(articleId: string | undefined) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useUI();

  /**
   * Build comment tree with nested replies
   */
  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const map = new Map<string, Comment & { replies: Comment[] }>();
    const roots: (Comment & { replies: Comment[] })[] = [];

    // First pass: create map with empty replies
    flatComments.forEach((comment) => {
      map.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    flatComments.forEach((comment) => {
      const node = map.get(comment.id)!;
      if (comment.parentId) {
        const parent = map.get(comment.parentId);
        if (parent) {
          parent.replies.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // Sort by date (newest first for roots, oldest first for replies)
    roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const sortReplies = (comments: (Comment & { replies: Comment[] })[]) => {
      comments.forEach((c) => {
        c.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        sortReplies(c.replies);
      });
    };
    sortReplies(roots);

    return roots;
  };

  /**
   * Fetch comments for article
   */
  const fetchComments = useCallback(async () => {
    if (!articleId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await commentService.getByArticle(articleId);
      const treeComments = buildCommentTree(response.data.comments);
      setComments(treeComments);
      setTotalCount(response.data.totalCount);
    } catch (err: any) {
      const message = err.message || 'Failed to load comments';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  /**
   * Add a new comment
   */
  const addComment = useCallback(
    async (content: string, parentId?: string): Promise<Comment | null> => {
      if (!articleId) return null;

      setIsSubmitting(true);
      setError(null);

      const input: CreateCommentInput = { content, parentId };

      try {
        const response = await commentService.create(articleId, input);
        addToast('Comment added', 'success');
        // Refresh comments to get updated tree
        await fetchComments();
        return response.data;
      } catch (err: any) {
        const message = err.message || 'Failed to add comment';
        setError(message);
        addToast(message, 'error');
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [articleId, fetchComments, addToast]
  );

  /**
   * Update a comment
   */
  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<Comment | null> => {
      setIsSubmitting(true);
      setError(null);

      const input: UpdateCommentInput = { content };

      try {
        const response = await commentService.update(commentId, input);
        addToast('Comment updated', 'success');
        // Refresh comments to get updated tree
        await fetchComments();
        return response.data;
      } catch (err: any) {
        const message = err.message || 'Failed to update comment';
        setError(message);
        addToast(message, 'error');
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchComments, addToast]
  );

  /**
   * Delete a comment
   */
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);

      try {
        await commentService.delete(commentId);
        addToast('Comment deleted', 'success');
        // Refresh comments to get updated tree
        await fetchComments();
        return true;
      } catch (err: any) {
        const message = err.message || 'Failed to delete comment';
        setError(message);
        addToast(message, 'error');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchComments, addToast]
  );

  return {
    comments,
    totalCount,
    isLoading,
    isSubmitting,
    error,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
  };
}

export default useComments;
