"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, LogOut, Pencil, Plus, Save, Trash2, Upload } from "lucide-react";
import { defaultCategories, services as defaultServices, type Service, type ServiceCategory } from "@/data/services";
import { deleteCatalogCategory, deleteCatalogItem, fetchCategories, fetchCatalog, restoreDefaultCatalog, renameCatalogCategory, saveCatalogCategory, saveCatalogItem, subscribeToCategories, subscribeToCatalog, uploadCatalogImage, type CatalogCategory } from "@/lib/catalogStore";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type EditorForm = {
  id: string;
  title: string;
  category: Exclude<ServiceCategory, "Tout">;
  description: string;
  price: string;
  deliverables: string;
  notes: string;
  imageUrl: string;
  visual: string;
  kind: "creation" | "service";
  status: "Disponible" | "Sur devis";
  sortOrder: number;
};

const emptyForm: EditorForm = {
  id: "",
  title: "",
  category: defaultCategories[0],
  description: "",
  price: "Sur devis",
  deliverables: "",
  notes: "",
  imageUrl: "",
  visual: "branding",
  kind: "creation",
  status: "Sur devis",
  sortOrder: 1,
};

function itemToForm(item: Service): EditorForm {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    description: item.description,
    price: item.price,
    deliverables: item.deliverables,
    notes: item.notes ?? "",
    imageUrl: item.imageUrl ?? "",
    visual: item.visual,
    kind: item.kind ?? "service",
    status: item.status ?? (item.price.toLowerCase().includes("devis") ? "Sur devis" : "Disponible"),
    sortOrder: item.sortOrder ?? 1,
  };
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerChecked, setOwnerChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [catalog, setCatalog] = useState<Service[]>(defaultServices);
  const [categoryItems, setCategoryItems] = useState<CatalogCategory[]>(defaultCategories.map((name, index) => ({ name, sortOrder: index + 1 })));
  const [categoryName, setCategoryName] = useState("");
  const [categoryOrder, setCategoryOrder] = useState(1);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [replacementCategory, setReplacementCategory] = useState("");
  const [form, setForm] = useState<EditorForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imagePreviewUrl = useRef("");
  const editorRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();
  const client = getSupabaseBrowserClient();

  useEffect(() => () => {
    if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current);
  }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthChecked(true);
      }
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setIsOwner(false);
        setOwnerChecked(false);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!session || !client) return;
    let active = true;
    void client.from("ex3d_admins").select("user_id").eq("user_id", session.user.id).maybeSingle().then(({ data, error }) => {
      if (active) {
        setIsOwner(Boolean(data && !error));
        setOwnerChecked(true);
        if (error) setMessage("La vérification du compte propriétaire a échoué. Vérifiez le schéma RLS Supabase.");
      }
    });
    return () => { active = false; };
  }, [client, session]);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    void fetchCatalog().then((items) => { if (active) setCatalog(items); });
    void fetchCategories().then((items) => {
      if (active) {
        setCategoryItems(items);
        setCategoryOrder(items.length + 1);
      }
    });
    const unsubscribe = subscribeToCatalog((items) => { if (active) setCatalog(items); });
    const unsubscribeCategories = subscribeToCategories((items) => { if (active) setCategoryItems(items); });
    return () => { active = false; unsubscribe(); unsubscribeCategories(); };
  }, [isOwner]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage("Connexion refusée. Vérifiez les identifiants du compte propriétaire.");
    else setMessage("Connexion vérifiée. Chargement du mode propriétaire…");
  }

  async function signOut() {
    await client?.auth.signOut();
    setSession(null);
    setIsOwner(false);
    setMessage("Vous êtes déconnecté.");
  }

  function updateForm(field: keyof EditorForm, value: string | number) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startNewItem() {
    setForm({ ...emptyForm, sortOrder: catalog.length + 1 });
    setImageFile(null);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startNewService() {
    setForm({
      ...emptyForm,
      kind: "service",
      category: categoryItems[0]?.name ?? defaultCategories[0],
      sortOrder: catalog.length + 1,
    });
    setImageFile(null);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openCatalogEditor() {
    itemsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    if (categoryItems.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && item.name !== editingCategory)) {
      setMessage("Une catégorie avec ce nom existe déjà.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (editingCategory) {
        await renameCatalogCategory(editingCategory, name, categoryOrder);
        setForm((current) => current.category === editingCategory ? { ...current, category: name } : current);
        setMessage("Catégorie renommée; les créations et services associés ont été mis à jour.");
      } else {
        await saveCatalogCategory(name, categoryOrder);
        setMessage("Catégorie ajoutée au catalogue.");
      }
      setCategoryItems(await fetchCategories());
      setCatalog(await fetchCatalog());
      setCategoryName("");
      setCategoryOrder(categoryItems.length + 1);
      setEditingCategory(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’enregistrer cette catégorie.");
    } finally {
      setBusy(false);
    }
  }

  function startCategoryEdit(category: CatalogCategory) {
    setEditingCategory(category.name);
    setCategoryName(category.name);
    setCategoryOrder(category.sortOrder);
    setDeletingCategory(null);
  }

  async function confirmCategoryDelete() {
    if (!deletingCategory || !replacementCategory) return;
    setBusy(true);
    setMessage("");
    try {
      await deleteCatalogCategory(deletingCategory, replacementCategory);
      setCategoryItems(await fetchCategories());
      setCatalog(await fetchCatalog());
      setForm((current) => current.category === deletingCategory ? { ...current, category: replacementCategory } : current);
      setMessage(`Catégorie supprimée. Les éléments ont été réaffectés à « ${replacementCategory} ».`);
      setDeletingCategory(null);
      setReplacementCategory("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de supprimer cette catégorie.");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const id = form.id || `${slugify(form.title)}-${crypto.randomUUID().slice(0, 6)}`;
      const imageUrl = imageFile ? await uploadCatalogImage(imageFile) : form.imageUrl.trim();
      const item: Service = { ...form, id, imageUrl: imageUrl || undefined, notes: form.notes || undefined };
      const currentIndex = catalog.findIndex((entry) => entry.id === id);
      await saveCatalogItem(item, currentIndex >= 0 ? currentIndex : form.sortOrder - 1);
      setCatalog(await fetchCatalog());
      setForm(emptyForm);
      setImageFile(null);
      setMessage("Élément enregistré et diffusé sur le catalogue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’enregistrer cet élément.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: Service) {
    if (!window.confirm(`Supprimer « ${item.title} » du catalogue ?`)) return;
    setBusy(true);
    try {
      await deleteCatalogItem(item.id);
      setCatalog(await fetchCatalog());
      if (form.id === item.id) setForm(emptyForm);
      setMessage("Élément supprimé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de supprimer cet élément.");
    } finally {
      setBusy(false);
    }
  }

  async function resetCatalog() {
    if (!window.confirm("Remplacer le catalogue cloud par les 8 offres EX3D initiales ?")) return;
    setBusy(true);
    try {
      await restoreDefaultCatalog();
      setCatalog(await fetchCatalog());
      setForm(emptyForm);
      setMessage("Le catalogue EX3D initial a été restauré.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de restaurer le catalogue.");
    } finally {
      setBusy(false);
    }
  }

  function exportCatalog() {
    const file = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ex3d-catalogue.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!configured) {
    return <main className="admin-page"><section className="admin-auth"><Link className="admin-back" href="/"><ArrowLeft size={14} /> Retour au site</Link><span className="section-kicker">EX3D SERVICE · MODE PROPRIÉTAIRE</span><h1 className="display-serif">Connexion propriétaire.</h1><p>Le portail d’administration est en mode configuration. Ajoutez les variables Supabase et appliquez les instructions du README pour activer l’authentification sécurisée.</p><div className="admin-setup-box"><strong>Configuration requise</strong><code>NEXT_PUBLIC_SUPABASE_URL</code><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code><span>Créez le compte propriétaire Exaucé X3D dans Supabase Auth puis inscrivez son UUID dans <code>public.ex3d_admins</code>.</span></div></section></main>;
  }

  if (!authChecked) return <main className="admin-page"><p className="admin-loading">Vérification de la session propriétaire…</p></main>;

  if (!session) {
    return <main className="admin-page"><section className="admin-auth"><Link className="admin-back" href="/"><ArrowLeft size={14} /> Retour au site</Link><span className="section-kicker">EX3D SERVICE · ESPACE PRIVÉ</span><h1 className="display-serif">Connexion propriétaire.</h1><p>Connectez-vous avec le compte propriétaire Exaucé X3D pour accéder à la gestion complète du catalogue : modifier ou supprimer chaque création, changer les titres, descriptions, prix et images, ou ajouter de nouveaux éléments.</p><form className="admin-login-form" onSubmit={signIn}><div className="form-field"><label htmlFor="admin-email">Email propriétaire</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="form-field"><label htmlFor="admin-password">Mot de passe</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div><button className="button button-gold" type="submit" disabled={busy}>{busy ? "Connexion…" : "Se connecter pour modifier le catalogue"}</button>{message && <p className="admin-message" role="status">{message}</p>}</form></section></main>;
  }

  if (!ownerChecked) return <main className="admin-page"><p className="admin-loading">Vérification du compte propriétaire…</p></main>;

  if (!isOwner) {
    return <main className="admin-page"><section className="admin-auth"><Link className="admin-back" href="/"><ArrowLeft size={14} /> Retour au site</Link><span className="section-kicker">ACCÈS REFUSÉ</span><h1 className="display-serif">Compte non autorisé.</h1><p>Cette session n’est pas le compte propriétaire enregistré dans <code>ex3d_admins</code>.</p><div className="admin-toolbar"><button className="button button-outline" type="button" onClick={signOut}><LogOut size={14} /> Se déconnecter</button></div></section></main>;
  }

  return (
    <main className="admin-page">
      <header className="admin-header"><div><Link className="admin-back" href="/"><ArrowLeft size={14} /> Voir le site</Link><span className="section-kicker">EX3D SERVICE · MODE ÉDITION</span><h1 className="display-serif">Gérer le catalogue.</h1><p>Connecté en tant que {session.user.email}. Modifiez les titres, images, prix, descriptions et catégories de chaque élément.</p></div><div className="admin-toolbar"><button className="button button-outline" type="button" onClick={openCatalogEditor}><Pencil size={14} /> Modifier le catalogue</button><button className="button button-gold" type="button" onClick={startNewItem}><Plus size={14} /> Ajouter une création / service</button><button className="button button-outline" type="button" onClick={exportCatalog}>Exporter JSON</button><button className="button button-outline" type="button" onClick={resetCatalog} disabled={busy}>Restaurer les offres initiales</button><button className="button button-quiet" type="button" onClick={signOut}><LogOut size={14} /> Déconnexion</button></div></header>
      {message && <p className="admin-message admin-global-message" role="status">{message}</p>}
      <div className="admin-layout">
        <div className="admin-catalog-tables" ref={itemsRef}>
          <section className="admin-items" aria-label="Créations du catalogue">
            <div className="admin-section-title"><div><h2>Créations du catalogue</h2><p>Modifier ou supprimer les éléments affichés dans « Présentation & Catalogue ».</p></div><span>{catalog.filter((item) => item.kind === "creation").length} créations</span></div>
            {catalog.filter((item) => item.kind === "creation").map((item) => <article className="admin-item" key={item.id}><div><span className="service-category">{item.category} · Création</span><h3>{item.title}</h3><span className="admin-item-meta">{item.price} · {item.status ?? "Disponible"} · N° {item.sortOrder ?? "–"}</span></div><div className="admin-item-actions"><button className="button button-quiet admin-row-action" type="button" aria-label={`Modifier ${item.title}`} onClick={() => { setForm(itemToForm(item)); setImageFile(null); editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><Pencil size={13} /> Modifier</button><button className="button button-quiet admin-row-action admin-delete-action" type="button" aria-label={`Supprimer ${item.title}`} onClick={() => void removeItem(item)} disabled={busy}><Trash2 size={13} /> Supprimer</button></div></article>)}
          </section>
          <section className="admin-items admin-services-table" aria-label="Services et activités">
            <div className="admin-section-title"><div><h2>Services & Infos Commande</h2><p>Gérer les offres visibles dans l’onglet public « Services & Infos Commande ».</p></div><span>{catalog.filter((item) => item.kind !== "creation").length} services</span></div>
            <div className="admin-service-table-actions"><button className="button button-gold" type="button" onClick={startNewService}><Plus size={14} /> Ajouter un service</button></div>
            {catalog.filter((item) => item.kind !== "creation").map((item) => <article className="admin-item" key={item.id}><div><span className="service-category">{item.category} · Service</span><h3>{item.title}</h3><span className="admin-item-meta">{item.price} · {item.status ?? "Disponible"} · N° {item.sortOrder ?? "–"}</span></div><div className="admin-item-actions"><button className="button button-quiet admin-row-action" type="button" aria-label={`Modifier le service ${item.title}`} onClick={() => { setForm(itemToForm(item)); setImageFile(null); editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><Pencil size={13} /> Modifier</button><button className="button button-quiet admin-row-action admin-delete-action" type="button" aria-label={`Supprimer le service ${item.title}`} onClick={() => void removeItem(item)} disabled={busy}><Trash2 size={13} /> Supprimer</button></div></article>)}
          </section>
        </div>
        <section className="admin-editor" aria-labelledby="editor-title" ref={editorRef}>
          <div className="admin-section-title"><div><h2 id="editor-title">{form.id ? "Modifier l’élément" : "Ajouter une création ou un service"}</h2><p>Complétez les informations ci-dessous puis enregistrez pour publier les changements.</p></div><button className="button button-quiet" type="button" onClick={startNewItem}><Plus size={14} /> Nouveau</button></div>
          <form onSubmit={saveItem}>
            <div className="form-field"><label htmlFor="item-title">Titre</label><input id="item-title" required value={form.title} onChange={(event) => updateForm("title", event.target.value)} /></div>
            <div className="form-row"><div className="form-field"><label htmlFor="item-category">Catégorie</label><select id="item-category" required value={form.category} onChange={(event) => updateForm("category", event.target.value)}>{categoryItems.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}</select></div><div className="form-field"><label htmlFor="item-kind">Type</label><select id="item-kind" value={form.kind} onChange={(event) => updateForm("kind", event.target.value as EditorForm["kind"])}><option value="creation">Création (galerie)</option><option value="service">Service</option></select></div></div>
            <div className="form-field"><label htmlFor="item-description">Description</label><textarea id="item-description" required value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></div>
            <div className="form-field"><label htmlFor="item-details">Détails complets</label><textarea id="item-details" value={form.deliverables} onChange={(event) => updateForm("deliverables", event.target.value)} /></div>
            <div className="form-field"><label htmlFor="item-notes">Notes complémentaires</label><textarea id="item-notes" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Informations utiles visibles dans le panneau de renseignement" /></div>
            <div className="form-row"><div className="form-field"><label htmlFor="item-price">Prix / devis</label><input id="item-price" required value={form.price} onChange={(event) => updateForm("price", event.target.value)} /></div><div className="form-field"><label htmlFor="item-status">Disponibilité</label><select id="item-status" value={form.status} onChange={(event) => updateForm("status", event.target.value as EditorForm["status"])}><option>Disponible</option><option>Sur devis</option></select></div></div>
            <div className="form-row"><div className="form-field"><label htmlFor="item-order">Ordre d’affichage</label><input id="item-order" type="number" min="1" required value={form.sortOrder} onChange={(event) => updateForm("sortOrder", Number(event.target.value))} /></div><div className="form-field"><label htmlFor="item-visual">Style d’aperçu</label><select id="item-visual" value={form.visual} onChange={(event) => updateForm("visual", event.target.value)}><option value="branding">Branding</option><option value="identity">Identité</option><option value="audio">Audio</option><option value="cinema">Cinéma</option><option value="product">Produit</option><option value="space">Web / espace</option><option value="lettering">Pâtisserie / éditorial</option><option value="motion">Motion</option></select></div></div>
            <div className="form-field"><label htmlFor="item-image-url">URL d’image</label><input id="item-image-url" type="url" value={form.imageUrl} onChange={(event) => updateForm("imageUrl", event.target.value)} placeholder="https://…" /></div>
            <label className="admin-upload" htmlFor="item-image-file"><ImagePlus size={16} /><span>{imageFile ? imageFile.name : "Ou téléverser une image dans Supabase Storage"}</span><Upload size={14} /><input id="item-image-file" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current); imagePreviewUrl.current = file ? URL.createObjectURL(file) : ""; setImageFile(file); if (file) updateForm("imageUrl", imagePreviewUrl.current); }} /></label>
            {form.imageUrl && <div className="admin-image-preview" role="img" aria-label="Aperçu de l’image sélectionnée" style={{ backgroundImage: `url("${form.imageUrl}")` }} />}
            <div className="admin-form-actions"><button className="button button-gold" type="submit" disabled={busy}><Save size={14} /> {busy ? "Enregistrement…" : form.id ? "Enregistrer les modifications" : "Ajouter au catalogue"}</button>{form.id && <button className="button button-quiet" type="button" onClick={() => setForm(emptyForm)}>Annuler</button>}</div>
          </form>
        </section>
      </div>
      <section className="admin-category-manager" aria-labelledby="category-manager-title">
        <div className="admin-section-title"><div><h2 id="category-manager-title">Gérer les catégories</h2><p>Les filtres du site et le formulaire de création se mettent à jour automatiquement.</p></div><span>{categoryItems.length} catégories</span></div>
        <form className="admin-category-form" onSubmit={submitCategory}>
          <div className="form-field"><label htmlFor="category-name">{editingCategory ? "Renommer la catégorie" : "Nouvelle catégorie"}</label><input id="category-name" required maxLength={70} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Nom de la catégorie" /></div>
          <div className="form-field category-order-field"><label htmlFor="category-order">Ordre</label><input id="category-order" type="number" min="1" required value={categoryOrder} onChange={(event) => setCategoryOrder(Number(event.target.value))} /></div>
          <button className="button button-gold" type="submit" disabled={busy}>{editingCategory ? <Save size={14} /> : <Plus size={14} />}{editingCategory ? "Enregistrer" : "Ajouter"}</button>
          {!editingCategory && <button className="button button-quiet" type="button" onClick={() => { setCategoryName(""); setCategoryOrder(categoryItems.length + 1); }}><Plus size={14} /> Nouvelle</button>}
          {editingCategory && <button className="button button-quiet" type="button" onClick={() => { setEditingCategory(null); setCategoryName(""); setCategoryOrder(categoryItems.length + 1); }}>Annuler</button>}
        </form>
        <div className="admin-category-list">
          {[...categoryItems].sort((a, b) => a.sortOrder - b.sortOrder).map((category) => <article className="admin-category-row" key={category.name}>
            <span className="admin-category-order">{String(category.sortOrder).padStart(2, "0")}</span><strong>{category.name}</strong>
            <div className="admin-item-actions"><button className="icon-action" type="button" aria-label={`Renommer ${category.name}`} onClick={() => startCategoryEdit(category)}><Save size={14} /></button><button className="icon-action" type="button" aria-label={`Supprimer ${category.name}`} disabled={busy || categoryItems.length <= 1} onClick={() => { setDeletingCategory(category.name); setReplacementCategory(categoryItems.find((item) => item.name !== category.name)?.name ?? ""); setEditingCategory(null); }}><Trash2 size={14} /></button></div>
            {deletingCategory === category.name && <div className="category-delete-confirm"><label htmlFor={`replacement-${category.sortOrder}`}>Réaffecter ses éléments à</label><select id={`replacement-${category.sortOrder}`} value={replacementCategory} onChange={(event) => setReplacementCategory(event.target.value)}>{categoryItems.filter((item) => item.name !== category.name).map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select><button className="button button-gold" type="button" disabled={busy || !replacementCategory} onClick={() => void confirmCategoryDelete()}>{busy ? "Suppression…" : "Confirmer la suppression"}</button><button className="button button-quiet" type="button" onClick={() => setDeletingCategory(null)}>Annuler</button></div>}
          </article>)}
        </div>
      </section>
    </main>
  );
}