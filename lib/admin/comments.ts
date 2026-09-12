export type CommentFilter = "all" | "visible" | "hidden";

export interface AdminComment {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  hidden: boolean;
  hiddenAt: string | null;
  hiddenReason: string | null;
  parentId: string | null;
  recipeId: string;
  recipeTitle: string;
  authorId: string | null;
  authorName: string;
  replyCount: number;
}

export const COMMENTS_PAGE_SIZE = 25;
