// Admin role model + permission predicates. Pure (no I/O) so it's easy to test
// and safe to import on the client for showing/hiding UI affordances. The server
// always re-checks via lib/admin/auth.ts — never trust the client.

export type AdminRole = "owner" | "admin" | "editor" | "viewer";

export const ADMIN_ROLES: AdminRole[] = ["owner", "admin", "editor", "viewer"];

const RANK: Record<AdminRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

/** True if `role` is at least as privileged as `min`. */
export function atLeast(role: AdminRole, min: AdminRole): boolean {
  return RANK[role] >= RANK[min];
}

export const canCreate = (r: AdminRole) => atLeast(r, "admin");
export const canEdit = (r: AdminRole) => atLeast(r, "editor");
export const canDelete = (r: AdminRole) => atLeast(r, "admin");
export const canApprove = (r: AdminRole) => atLeast(r, "admin");
export const canManageMembers = (r: AdminRole) => atLeast(r, "admin");

/** Roles an inviter may assign (never owner). */
export const ASSIGNABLE_ROLES: AdminRole[] = ["admin", "editor", "viewer"];
