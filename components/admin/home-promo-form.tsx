"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Search, X, Check } from "lucide-react";
import {
  saveHomePromo,
  searchPromoRecipes,
  type PromoRecipeOption,
} from "@/actions/admin-home-promo";
import { MAX_PROMO_BODY } from "@/lib/home-promo";

export function HomePromoForm({
  initialBody,
  initialRecipeId,
  initialRecipeTitle,
  canEdit,
}: {
  initialBody: string;
  initialRecipeId: string | null;
  initialRecipeTitle: string | null;
  canEdit: boolean;
}) {
  const [body, setBody] = useState(initialBody);
  const [recipeId, setRecipeId] = useState(initialRecipeId);
  const [recipeTitle, setRecipeTitle] = useState(initialRecipeTitle);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PromoRecipeOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const dirty =
    body !== initialBody || recipeId !== initialRecipeId;

  // Debounced search. Without the delay every keystroke is a server round-trip,
  // and out-of-order responses can overwrite newer results with older ones —
  // the `cancelled` flag drops any response whose query is no longer current.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(async () => {
      const res = await searchPromoRecipes(query);
      if (cancelled) return;
      setResults("recipes" in res ? res.recipes : []);
      setSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const remaining = useMemo(
    () => MAX_PROMO_BODY - body.length,
    [body.length],
  );

  const submit = () => {
    setMessage(null);
    startSaving(async () => {
      const res = await saveHomePromo({ body, recipeId });
      if ("error" in res) {
        setMessage({ kind: "error", text: res.error });
        return;
      }
      setMessage({ kind: "ok", text: "Saved. The homepage is updated." });
    });
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* ── Card text ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label htmlFor="promo-body" className="block text-sm font-medium">
          Card text
        </label>
        <textarea
          id="promo-body"
          value={body}
          disabled={!canEdit}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_PROMO_BODY))}
          rows={3}
          className="w-full rounded-lg border border-[#E2E4E4] px-4 py-3 text-sm outline-none focus:border-mint-green disabled:bg-[#F5F5F4]"
          placeholder="Your energy dipped this week? …"
        />
        <p
          className={`text-xs ${remaining < 20 ? "text-[#DC2323]" : "text-subtle"}`}
        >
          {remaining} characters left
        </p>
      </div>

      {/* ── Recipe picker ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <span className="block text-sm font-medium">Linked recipe</span>

        {recipeId ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E2E4E4] px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {recipeTitle ?? "(untitled recipe)"}
              </p>
              <p className="truncate text-xs text-subtle">/recipes/{recipeId}</p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setRecipeId(null);
                  setRecipeTitle(null);
                }}
                className="shrink-0 rounded-full p-1.5 hover:bg-[#F5F5F4]"
                aria-label="Remove linked recipe"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[#E2E4E4] px-4 py-3 text-sm text-subtle">
            No recipe linked — the card shows text only, with no View button.
          </p>
        )}

        {canEdit && (
          <div ref={panelRef} className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder="Search approved recipes…"
                className="w-full rounded-lg border border-[#E2E4E4] py-2.5 pl-9 pr-4 text-sm outline-none focus:border-mint-green"
              />
            </div>

            {open && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-[#E2E4E4] bg-white shadow-lg">
                {searching ? (
                  <p className="px-4 py-3 text-sm text-subtle">Searching…</p>
                ) : results.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-subtle">
                    No approved recipe matches that.
                  </p>
                ) : (
                  results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setRecipeId(r.id);
                        setRecipeTitle(r.title);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#F5F5F4]"
                    >
                      <span className="truncate">{r.title}</span>
                      {r.id === recipeId && (
                        <Check className="size-4 shrink-0 text-mint-green" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Save ────────────────────────────────────────────────────────── */}
      {canEdit && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={submit}
            disabled={saving || !dirty || !body.trim()}
            className="rounded-full bg-mint-green px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {message && (
            <p
              className={`text-sm ${
                message.kind === "ok" ? "text-mint-green" : "text-[#DC2323]"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      )}

      {!canEdit && (
        <p className="text-sm text-subtle">
          You have read-only access. An editor or above can change this card.
        </p>
      )}
    </div>
  );
}
