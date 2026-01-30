import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import styles from './CommentSection.module.css';
import { Comment } from '../../../types';
import { useComments } from '../../../hooks';
import { useAuth, useUI } from '../../../contexts';
import { Button, Spinner, ConfirmDialog } from '../../common';

const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M5 5L2 8L5 11M2 8H9C10.6569 8 12 6.65685 12 5V3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M10 2L12 4M2 12L4 11.5L11 4.5L9.5 3L2.5 10L2 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M2 4H12M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M5 6V10M9 6V10M4 4L4.5 11C4.5 11.5523 4.94772 12 5.5 12H8.5C9.05228 12 9.5 11.5523 9.5 11L10 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface CommentItemProps {
  comment: Comment & { replies?: Comment[] };
  onReply: (parentId: string) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  replyingTo: string | null;
  editingComment: Comment | null;
  onSubmitReply: (content: string, parentId: string) => Promise<void>;
  onCancelReply: () => void;
  onSubmitEdit: (content: string) => Promise<void>;
  onCancelEdit: () => void;
  isSubmitting: boolean;
}

function CommentItem({
  comment,
  onReply,
  onEdit,
  onDelete,
  replyingTo,
  editingComment,
  onSubmitReply,
  onCancelReply,
  onSubmitEdit,
  onCancelEdit,
  isSubmitting,
}: CommentItemProps) {
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState('');

  const isEditing = editingComment?.id === comment.id;
  const isReplying = replyingTo === comment.id;
  const isOwner = user?.id === comment.authorId;

  useEffect(() => {
    if (isEditing) {
      setEditContent(comment.content);
    }
  }, [isEditing, comment.content]);

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    await onSubmitReply(replyContent, comment.id);
    setReplyContent('');
  };

  const handleSubmitEdit = async () => {
    if (!editContent.trim()) return;
    await onSubmitEdit(editContent);
    setEditContent('');
  };

  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        <div className={styles.commentMeta}>
          <span className={styles.commentAuthor}>
            {comment.author?.displayName || 'Unknown'}
          </span>
          <span className={styles.commentDate}>
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
          {comment.isEdited && (
            <span className={styles.editedIndicator}>(edited)</span>
          )}
        </div>
        <div className={styles.commentActions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => onReply(comment.id)}
            title="Reply"
          >
            <ReplyIcon />
          </button>
          {isOwner && (
            <>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => onEdit(comment)}
                title="Edit"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => onDelete(comment.id)}
                title="Delete"
              >
                <TrashIcon />
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className={styles.commentForm}>
          <textarea
            className={styles.commentTextarea}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Edit your comment..."
            rows={3}
          />
          <div className={styles.commentFormActions}>
            <Button variant="secondary" size="small" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleSubmitEdit}
              loading={isSubmitting}
              disabled={!editContent.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className={styles.commentContent}>{comment.content}</p>
      )}

      {isReplying && (
        <div className={styles.replyForm}>
          <textarea
            className={styles.commentTextarea}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
          />
          <div className={styles.commentFormActions}>
            <Button variant="secondary" size="small" onClick={onCancelReply}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleSubmitReply}
              loading={isSubmitting}
              disabled={!replyContent.trim()}
            >
              Reply
            </Button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.replies}>
          {comment.replies.map((reply: Comment & { replies?: Comment[] }) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              replyingTo={replyingTo}
              editingComment={editingComment}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
              onSubmitEdit={onSubmitEdit}
              onCancelEdit={onCancelEdit}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentSectionProps {
  articleId: string;
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { layoutMode } = useUI();
  const { hasPermission } = useAuth();
  const {
    comments,
    totalCount,
    isLoading,
    isSubmitting,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
  } = useComments(articleId);

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment('');
  };

  const handleSubmitReply = async (content: string, parentId: string) => {
    await addComment(content, parentId);
    setReplyingTo(null);
  };

  const handleSubmitEdit = async (content: string) => {
    if (!editingComment) return;
    await updateComment(editingComment.id, content);
    setEditingComment(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCommentId) return;
    await deleteComment(deletingCommentId);
    setDeletingCommentId(null);
  };

  const canComment = hasPermission('comment');

  const containerClass = [
    styles.commentsSection,
    layoutMode === 'sidebar' && styles.sidebar,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          Comments
          {totalCount > 0 && (
            <span className={styles.commentCount}>({totalCount})</span>
          )}
        </h3>
      </div>

      {/* New comment form */}
      {canComment && (
        <div className={styles.commentForm}>
          <textarea
            className={styles.commentTextarea}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
          />
          <div className={styles.commentFormActions}>
            <Button
              variant="primary"
              size="small"
              onClick={handleSubmitComment}
              loading={isSubmitting && !replyingTo && !editingComment}
              disabled={!newComment.trim()}
            >
              Post Comment
            </Button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Spinner />
        </div>
      ) : comments.length === 0 ? (
        <p className={styles.emptyComments}>No comments yet. Be the first to comment!</p>
      ) : (
        <div className={styles.commentList}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment as Comment & { replies?: Comment[] }}
              onReply={setReplyingTo}
              onEdit={setEditingComment}
              onDelete={setDeletingCommentId}
              replyingTo={replyingTo}
              editingComment={editingComment}
              onSubmitReply={handleSubmitReply}
              onCancelReply={() => setReplyingTo(null)}
              onSubmitEdit={handleSubmitEdit}
              onCancelEdit={() => setEditingComment(null)}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCommentId}
        onClose={() => setDeletingCommentId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}

export default CommentSection;
