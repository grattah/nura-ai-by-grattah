/**
 * Shared shape for admin comment moderation.
 *
 * Split out of actions/admin-comments.ts because a "use server" file may export
 * ONLY async functions — a plain constant there fails the build with
 * "Only async functions are allowed to be exported in a 'use server' file",
 * and the page and the client table both need these.
 */

export type CommentFilter = "all" | "visible" | "hidden";

export interface AdminComment {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  hidden: boolean;
  hiddenAt: string | null;
  hiddenReason: string | null;
  /** null for a top-level comment. */
  parentId: string | null;
  recipeId: string;
  recipeTitle: string;
  authorId: string | null;
  authorName: string;
  /** Replies that would be deleted along with this one (FK cascade). */
  replyCount: number;
}

export const COMMENTS_PAGE_SIZE = 25;
