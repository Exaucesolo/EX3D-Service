"use client";

import { defaultCategories, services as defaultServices, type Service } from "@/data/services";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const CACHE_KEY = "ex3d-catalog-v3";
const CATEGORY_CACHE_KEY = "ex3d-categories-v1";
const STORAGE_BUCKET = "ex3d-assets";

export type CatalogCategory = { name: string; sortOrder: number };

type CatalogRow = {
  id: string;
  title: string;
  category: Service["category"];
  description: string;
  price: string;
  visual: string;
  deliverables: string;
  notes: string | null;
  image_url: string | null;
  kind: Service["kind"];
  status: Service["status"];
  sort_order: number;
};

function fromRow(row: CatalogRow): Service {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    price: row.price,
    visual: row.visual,
    deliverables: row.deliverables,
    notes: row.notes ?? undefined,
    imageUrl: row.image_url ?? undefined,
    kind: row.kind ?? "service",
    status: row.status ?? "Disponible",
    sortOrder: row.sort_order,
  };
}

function toRow(item: Service, index: number): CatalogRow {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    description: item.description,
    price: item.price,
    visual: item.visual,
    deliverables: item.deliverables,
    notes: item.notes ?? null,
    image_url: item.imageUrl ?? null,
    kind: item.kind ?? "service",
    status: item.status ?? (item.price.toLowerCase().includes("devis") ? "Sur devis" : "Disponible"),
    sort_order: item.sortOrder ?? index + 1,
  };
}

function saveCache(items: Service[]) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    // The catalog remains usable if browser storage is disabled or full.
  }
}

export function getCachedCatalog(): Service[] {
  try {
    const stored = window.localStorage.getItem(CACHE_KEY) ?? window.localStorage.getItem("ex3d-catalog-v2");
    if (stored) {
      const items = JSON.parse(stored) as Service[];
      saveCache(items);
      return items;
    }
  } catch {
    try { window.localStorage.removeItem(CACHE_KEY); } catch { return defaultServices; }
  }
  saveCache(defaultServices);
  return defaultServices;
}

export async function fetchCatalog(): Promise<Service[]> {
  const client = getSupabaseBrowserClient();
  if (!client) return getCachedCatalog();

  const { data, error } = await client.from("ex3d_items").select("*").order("sort_order", { ascending: true });
  if (error || !data?.length) return getCachedCatalog();

  const items = (data as CatalogRow[]).map(fromRow);
  saveCache(items);
  return items;
}

export function subscribeToCatalog(onChange: (items: Service[]) => void) {
  const client = getSupabaseBrowserClient();
  if (!client) return () => undefined;

  const channel = client
    .channel("ex3d-items-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "ex3d_items" }, () => {
      void fetchCatalog().then(onChange);
    })
    .subscribe();

  return () => { void client.removeChannel(channel); };
}

export function subscribeToCategories(onChange: (items: CatalogCategory[]) => void) {
  const client = getSupabaseBrowserClient();
  if (!client) return () => undefined;

  const channel = client
    .channel("ex3d-categories-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "ex3d_categories" }, () => {
      void fetchCategories().then(onChange);
    })
    .subscribe();

  return () => { void client.removeChannel(channel); };
}

function dispatchCatalogChanges(items: Service[], categoryItems: CatalogCategory[]) {
  saveCache(items);
  saveCategoryCache(categoryItems);
  window.dispatchEvent(new CustomEvent("ex3d-catalog-updated", { detail: items }));
  window.dispatchEvent(new CustomEvent("ex3d-categories-updated", { detail: categoryItems }));
}

export async function saveCatalogCategory(name: string, sortOrder: number) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Configurez Supabase pour enregistrer les catégories.");

  const { error } = await client.from("ex3d_categories").insert({ name: name.trim(), sort_order: sortOrder });
  if (error) throw new Error(error.message);

  const categoryItems = await fetchCategories();
  saveCategoryCache(categoryItems);
  window.dispatchEvent(new CustomEvent("ex3d-categories-updated", { detail: categoryItems }));
}

export async function renameCatalogCategory(previousName: string, name: string, sortOrder: number) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Configurez Supabase pour modifier les catégories.");

  const { data, error } = await client
    .from("ex3d_categories")
    .update({ name: name.trim(), sort_order: sortOrder })
    .eq("name", previousName)
    .select("name")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Catégorie introuvable. Vérifiez que le schéma Supabase est à jour.");

  const [items, categoryItems] = await Promise.all([fetchCatalog(), fetchCategories()]);
  dispatchCatalogChanges(items, categoryItems);
}

export async function deleteCatalogCategory(name: string, replacementName: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Configurez Supabase pour supprimer les catégories.");

  const currentCategories = await fetchCategories();
  if (currentCategories.length <= 1) throw new Error("La dernière catégorie ne peut pas être supprimée.");
  if (!replacementName || replacementName === name || !currentCategories.some((category) => category.name === replacementName)) {
    throw new Error("Choisissez une autre catégorie valide pour réaffecter les éléments.");
  }

  const { error: moveError } = await client.from("ex3d_items").update({ category: replacementName }).eq("category", name);
  if (moveError) throw new Error(moveError.message);

  const { error } = await client.from("ex3d_categories").delete().eq("name", name);
  if (error) throw new Error(error.message);

  const [items, categoryItems] = await Promise.all([fetchCatalog(), fetchCategories()]);
  dispatchCatalogChanges(items, categoryItems);
}

export async function saveCatalogItem(item: Service, index: number) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Configurez Supabase pour enregistrer le catalogue.");

  const { error } = await client.from("ex3d_items").upsert(toRow(item, index));
  if (error) throw new Error(error.message);

  const items = await fetchCatalog();
  saveCache(items);
  window.dispatchEvent(new CustomEvent("ex3d-catalog-updated", { detail: items }));
}

export async function deleteCatalogItem(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Configurez Supabase pour modifier le catalogue.");

  const { error } = await client.from("ex3d_items").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const items = await fetchCatalog();
  saveCache(items);
  window.dispatchEvent(new CustomEvent("ex3d-catalog-updated", { detail: items }));
}

export async function restoreDefaultCatalog() {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Configurez Supabase pour réinitialiser le catalogue.");

  const { error: deleteError } = await client.from("ex3d_items").delete().not("id", "is", null);
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await client.from("ex3d_items").upsert(defaultServices.map(toRow));
  if (insertError) throw new Error(insertError.message);

  const items = await fetchCatalog();
  saveCache(items);
  window.dispatchEvent(new CustomEvent("ex3d-catalog-updated", { detail: items }));
}

export async function uploadCatalogImage(file: File) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Configurez Supabase Storage pour envoyer des images.");

  const filePath = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(filePath, file, { upsert: false });
  if (error) throw new Error(error.message);

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

function saveCategoryCache(items: CatalogCategory[]) {
  try {
    window.localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Keep the storefront available when browser storage is disabled or full.
  }
}

export function getCachedCategories(): CatalogCategory[] {
  try {
    const stored = window.localStorage.getItem(CATEGORY_CACHE_KEY);
    if (stored) return JSON.parse(stored) as CatalogCategory[];
  } catch {
    try { window.localStorage.removeItem(CATEGORY_CACHE_KEY); } catch { return defaultCategories.map((name, index) => ({ name, sortOrder: index + 1 })); }
  }
  const seeded = defaultCategories.map((name, index) => ({ name, sortOrder: index + 1 }));
  saveCategoryCache(seeded);
  return seeded;
}

export async function fetchCategories(): Promise<CatalogCategory[]> {
  const client = getSupabaseBrowserClient();
  if (!client) return getCachedCategories();

  const { data, error } = await client.from("ex3d_categories").select("name, sort_order").order("sort_order", { ascending: true });
  if (error || !data?.length) return getCachedCategories();

  const items = data.map((row) => ({ name: row.name as string, sortOrder: row.sort_order as number }));
  saveCategoryCache(items);
  return items;
}