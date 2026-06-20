"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  createRecipe,
  updateRecipe,
  uploadRecipeImage,
  type RecipeInput,
} from "@/actions/admin-recipes";
import { DRINK_TYPES } from "@/lib/drink-types";

// Keep in sync with the 5MB cap enforced in uploadRecipeImage (admin-recipes.ts)
// and the server-action bodySizeLimit in next.config.ts.
const MAX_IMAGE_MB = 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

interface TagOption {
  id: string;
  name: string;
}

export interface RecipeFormInitial extends Partial<RecipeInput> {
  id?: string;
}

export function RecipeForm({
  initial,
  tags,
  canSetStatus,
}: {
  initial?: RecipeFormInitial;
  tags: TagOption[];
  canSetStatus: boolean;
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<RecipeInput>({
    title: initial?.title ?? "",
    short_description: initial?.short_description ?? "",
    recipe_section_title: initial?.recipe_section_title ?? "How to make it",
    why_it_works: initial?.why_it_works ?? "",
    inside_tip: initial?.inside_tip ?? "",
    source_url: initial?.source_url ?? "",
    display_order: initial?.display_order ?? null,
    is_todays_recipe: initial?.is_todays_recipe ?? false,
    status: initial?.status ?? "approved",
    drink_type: initial?.drink_type ?? "drinks",
    image_url: initial?.image_url ?? null,
    ingredients: initial?.ingredients ?? [{ emoji: "", label: "" }],
    how_to_make: initial?.how_to_make ?? [{ step: "1", instruction: "" }],
    preview_ingredients: initial?.preview_ingredients ?? [],
    follow_up_questions: initial?.follow_up_questions ?? [],
    tagIds: initial?.tagIds ?? [],
  });

  function set<K extends keyof RecipeInput>(key: K, value: RecipeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onImage(file: File) {
    setError(null);

    // Validate up front so the admin gets a specific reason instead of a generic
    // failure. Large files would otherwise be rejected by the server action's
    // body-size limit and surface only as an opaque thrown error.
    if (!file.type.startsWith("image/")) {
      setError(
        `"${file.name}" isn't an image (${file.type || "unknown type"}). Please choose a JPG, PNG, or WebP file.`,
      );
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(
        `Image is too large (${sizeMb} MB). Please upload an image under ${MAX_IMAGE_MB} MB — try compressing or resizing it first.`,
      );
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadRecipeImage(fd);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      set("image_url", res.url);
    } catch {
      setError(
        `Couldn't upload "${file.name}". Please check your connection and try again, or use a smaller image (under ${MAX_IMAGE_MB} MB).`,
      );
    } finally {
      setUploading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload: RecipeInput = {
        ...form,
        ingredients: form.ingredients.filter((i) => i.label.trim()),
        how_to_make: form.how_to_make.filter((s) => s.instruction.trim()),
        preview_ingredients: form.preview_ingredients
          .map((p) => p.trim())
          .filter(Boolean),
        follow_up_questions: form.follow_up_questions
          .map((q) => q.trim())
          .filter(Boolean),
      };
      const res = isEdit
        ? await updateRecipe(initial!.id!, payload)
        : await createRecipe(payload);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push("/admin/recipes");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <Field label="Title">
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </Field>

      <Field label="Short description">
        <Textarea
          value={form.short_description}
          onChange={(e) => set("short_description", e.target.value)}
          required
        />
      </Field>

      <Field label="Section title">
        <Input
          value={form.recipe_section_title}
          onChange={(e) => set("recipe_section_title", e.target.value)}
        />
      </Field>

      {/* Image */}
      <Field label="Image">
        <div className="flex items-center gap-4">
          {form.image_url && (
            <Image
              src={form.image_url}
              alt=""
              width={96}
              height={64}
              className="rounded-lg object-cover h-16 w-24"
            />
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImage(file);
            }}
            disabled={uploading}
          />
        </div>
      </Field>

      {/* Ingredients */}
      <RepeatableObjects
        label="Ingredients"
        rows={form.ingredients}
        onChange={(rows) => set("ingredients", rows)}
        fields={[
          { key: "emoji", placeholder: "🥤", width: "w-16" },
          { key: "label", placeholder: "1 cup brewed green tea" },
        ]}
        empty={{ emoji: "", label: "" }}
      />

      {/* How to make */}
      <RepeatableObjects
        label="How to make"
        rows={form.how_to_make}
        onChange={(rows) => set("how_to_make", rows)}
        fields={[
          { key: "step", placeholder: "1", width: "w-16" },
          { key: "instruction", placeholder: "Step instruction" },
        ]}
        empty={{ step: "", instruction: "" }}
      />

      <Field label="Preview ingredients (comma-separated)">
        <Input
          value={form.preview_ingredients.join(", ")}
          onChange={(e) =>
            set(
              "preview_ingredients",
              e.target.value.split(",").map((s) => s.trim()),
            )
          }
        />
      </Field>

      <Field label="Why it works">
        <Textarea
          value={form.why_it_works}
          onChange={(e) => set("why_it_works", e.target.value)}
        />
      </Field>

      <Field label="Inside tip">
        <Textarea
          value={form.inside_tip}
          onChange={(e) => set("inside_tip", e.target.value)}
        />
      </Field>

      <Field label="Follow-up questions (one per line)">
        <Textarea
          value={form.follow_up_questions.join("\n")}
          onChange={(e) =>
            set("follow_up_questions", e.target.value.split("\n"))
          }
        />
      </Field>

      <Field label="Source URL">
        <Input
          value={form.source_url}
          onChange={(e) => set("source_url", e.target.value)}
          placeholder="https://…"
        />
      </Field>

      {/* Tags */}
      <Field label="Tags">
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const checked = form.tagIds.includes(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() =>
                  set(
                    "tagIds",
                    checked
                      ? form.tagIds.filter((x) => x !== t.id)
                      : [...form.tagIds, t.id],
                  )
                }
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  checked
                    ? "bg-mint-green text-white border-mint-green"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Drink type (sub-sub-category for the category filter pills) */}
      <Field label="Drink type">
        <div className="flex flex-wrap gap-2">
          {DRINK_TYPES.map((d) => {
            const checked = form.drink_type === d.slug;
            return (
              <button
                type="button"
                key={d.slug}
                onClick={() => set("drink_type", d.slug)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  checked
                    ? "bg-mint-green text-white border-mint-green"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                {d.name}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="flex flex-wrap items-center gap-6">
        <Field label="Display order" inline>
          <Input
            type="number"
            className="w-28"
            value={form.display_order ?? ""}
            onChange={(e) =>
              set(
                "display_order",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            placeholder="auto"
          />
        </Field>

        <label className="flex items-center gap-2">
          <Switch
            checked={form.is_todays_recipe}
            onCheckedChange={(v) => set("is_todays_recipe", v)}
          />
          <span className="text-sm">Today&apos;s recipe</span>
        </label>

        {canSetStatus && (
          <label className="flex items-center gap-2">
            <Switch
              checked={form.status === "approved"}
              onCheckedChange={(v) =>
                set("status", v ? "approved" : "pending")
              }
            />
            <span className="text-sm">
              {form.status === "approved" ? "Published" : "Draft (pending)"}
            </span>
          </label>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create recipe"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/recipes")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  inline,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "space-y-1" : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function RepeatableObjects<T extends Record<string, string>>({
  label,
  rows,
  onChange,
  fields,
  empty,
}: {
  label: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  fields: { key: keyof T; placeholder: string; width?: string }[];
  empty: T;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            {fields.map((f) => (
              <Input
                key={String(f.key)}
                className={f.width}
                placeholder={f.placeholder}
                value={row[f.key]}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, [f.key]: e.target.value };
                  onChange(next);
                }}
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, { ...empty }])}
      >
        + Add
      </Button>
    </div>
  );
}
