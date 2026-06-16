"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { setRecipeStatus, deleteRecipe } from "@/actions/admin-recipes";

export function RecipeRowActions({
  id,
  status,
  canEdit,
  canApprove,
  canDelete,
  onDeleted,
  onStatusChanged,
}: {
  id: string;
  status: "pending" | "approved";
  canEdit: boolean;
  canApprove: boolean;
  canDelete: boolean;
  // When provided, update the local cache instead of a full server refresh.
  onDeleted?: (id: string) => void;
  onStatusChanged?: (id: string, status: "pending" | "approved") => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleStatus() {
    const next = status === "approved" ? "pending" : "approved";
    startTransition(async () => {
      const res = await setRecipeStatus(id, next);
      if ("error" in res) alert(res.error);
      else if (onStatusChanged) onStatusChanged(id, next);
      else router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteRecipe(id);
      if ("error" in res) alert(res.error);
      else if (onDeleted) onDeleted(id);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/recipes/${id}`} target="_blank">
          View
        </Link>
      </Button>

      {canEdit && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/recipes/${id}/edit`}>Edit</Link>
        </Button>
      )}

      {canApprove && (
        <Button
          variant={status === "approved" ? "outline" : "default"}
          size="sm"
          onClick={toggleStatus}
          disabled={pending}
        >
          {status === "approved" ? "Unapprove" : "Approve"}
        </Button>
      )}

      {canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={pending}>
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this recipe?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the recipe, its image, and tags for all
                users. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
