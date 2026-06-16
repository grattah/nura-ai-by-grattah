import { describe, it, expect } from "vitest";
import {
  atLeast,
  canCreate,
  canEdit,
  canDelete,
  canApprove,
  canManageMembers,
} from "@/lib/admin/roles";

describe("admin roles", () => {
  it("ranks roles correctly", () => {
    expect(atLeast("owner", "admin")).toBe(true);
    expect(atLeast("admin", "admin")).toBe(true);
    expect(atLeast("editor", "admin")).toBe(false);
    expect(atLeast("viewer", "editor")).toBe(false);
    expect(atLeast("editor", "viewer")).toBe(true);
  });

  it("editor can edit but not create/delete/approve/manage", () => {
    expect(canEdit("editor")).toBe(true);
    expect(canCreate("editor")).toBe(false);
    expect(canDelete("editor")).toBe(false);
    expect(canApprove("editor")).toBe(false);
    expect(canManageMembers("editor")).toBe(false);
  });

  it("viewer can do nothing mutating", () => {
    expect(canEdit("viewer")).toBe(false);
    expect(canCreate("viewer")).toBe(false);
    expect(canDelete("viewer")).toBe(false);
  });

  it("admin and owner can do everything", () => {
    for (const r of ["admin", "owner"] as const) {
      expect(canCreate(r)).toBe(true);
      expect(canEdit(r)).toBe(true);
      expect(canDelete(r)).toBe(true);
      expect(canApprove(r)).toBe(true);
      expect(canManageMembers(r)).toBe(true);
    }
  });
});
