"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, MoveUpRight } from "lucide-react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import IntroOverlay from "@/components/IntroOverlay";
import OrderDrawer from "@/components/OrderDrawer";
import ServiceCard from "@/components/ServiceCard";
import InquiryModal from "@/components/InquiryModal";
import { defaultCategories, services as defaultServices, type Service, type ServiceCategory } from "@/data/services";
import { fetchCatalog, fetchCategories, getCachedCatalog, getCachedCategories, subscribeToCatalog, subscribeToCategories } from "@/lib/catalogStore";

type StorefrontTab = "presentation" | "services";

export default function Storefront() {
  const [activeTab, setActiveTab] = useState<StorefrontTab>("presentation");
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>("Tout");
  const [catalog, setCatalog] = useState<Service[]>(defaultServices);
  const [categoryNames, setCategoryNames] = useState<string[]>([...defaultCategories]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [inquiryService, setInquiryService] = useState<Service | null>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const galleryItems = catalog.filter((item) => item.kind === "creation");
  const serviceItems = catalog.filter((item) => item.kind !== "creation");
  const filteredCatalog = activeCategory === "Tout" ? galleryItems : galleryItems.filter((item) => item.category === activeCategory);

  useEffect(() => {
    let active = true;
    void fetchCatalog().then((items) => { if (active) setCatalog(items); });
    void fetchCategories().then((items) => { if (active) setCategoryNames(items.map((item) => item.name)); });
    const unsubscribe = subscribeToCatalog((items) => { if (active) setCatalog(items); });
    const unsubscribeCategories = subscribeToCategories((items) => {
      if (!active) return;
      const names = items.map((item) => item.name);
      setCategoryNames(names);
      setActiveCategory((current) => current === "Tout" || names.includes(current) ? current : "Tout");
    });
    const onCatalogUpdate = (event: Event) => {
      const items = (event as CustomEvent<Service[]>).detail;
      if (items) setCatalog(items);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "ex3d-catalog-v3") setCatalog(getCachedCatalog());
      if (event.key === "ex3d-categories-v1") {
        const names = getCachedCategories().map((item) => item.name);
        setCategoryNames(names);
        setActiveCategory((current) => current === "Tout" || names.includes(current) ? current : "Tout");
      }
    };
    const onCategoryUpdate = (event: Event) => {
      const items = (event as CustomEvent<{ name: string }[]>).detail;
      if (!items) return;
      const names = items.map((item) => item.name);
      setCategoryNames(names);
      setActiveCategory((current) => current === "Tout" || names.includes(current) ? current : "Tout");
    };
    window.addEventListener("ex3d-catalog-updated", onCatalogUpdate);
    window.addEventListener("ex3d-categories-updated", onCategoryUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      unsubscribe();
      unsubscribeCategories();
      window.removeEventListener("ex3d-catalog-updated", onCatalogUpdate);
      window.removeEventListener("ex3d-categories-updated", onCategoryUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!inquiryService) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setInquiryService(null); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inquiryService]);

  function openOrder(service: Service | null = null) {
    setSelectedService(service);
    setInquiryService(null);
    setDrawerOpen(true);
  }

  return (
    <>
      <IntroOverlay />
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} onOrder={() => openOrder()} />
      <main id="accueil">
        {activeTab === "presentation" ? (
          <div className="tab-content" role="tabpanel" aria-label="Présentation & Catalogue" key={activeTab}>
            <section className="site-shell hero" aria-labelledby="hero-title">
              <div>
                <span className="eyebrow">EXAUCÉ X3D <span aria-hidden="true">•</span> EX3D SERVICE</span>
                <h1 className="display-serif" id="hero-title">PORTFOLIO & <em>SERVICES</em></h1>
                <p className="hero-copy">Création visuelle, production audio, cinéma, web et pâtisserie. Un studio indépendant, plusieurs savoir-faire.</p>
                <div className="hero-actions"><button className="button button-gold" type="button" onClick={() => document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" })}>Explorer le portfolio <ArrowDown size={14} aria-hidden="true" /></button><button className="button button-outline" type="button" onClick={() => setActiveTab("services")}>Voir les services <ArrowUpRight size={14} aria-hidden="true" /></button></div>
              </div>
              <div className="hero-art" role="img" aria-label="Composition graphique architecturale du studio EX3D"><div className="hero-art-grid" /><span className="hero-art-caption">STUDIO · ÉDITION 01</span><span className="hero-art-index">EXAUCÉ X3D</span><span className="hero-art-orbit" /><span className="hero-art-title">EX3D</span></div>
            </section>
            <section className="site-shell catalogue" id="catalogue" aria-labelledby="catalogue-title">
              <div className="catalogue-head"><div><span className="section-kicker">PORTFOLIO & SERVICES</span><h2 className="catalogue-title display-serif" id="catalogue-title">Créations & savoir-faire.</h2></div><p className="catalogue-intro">Parcourez les activités du studio et renseignez-vous sur une création pour découvrir ses détails.</p></div>
              <nav className="category-strip" aria-label="Filtrer les créations">
                {["Tout", ...categoryNames].map((category) => <button key={category} className="filter-pill" type="button" aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>{category}</button>)}
              </nav>
              {filteredCatalog.length ? <div className="service-grid" aria-live="polite">{filteredCatalog.map((item, index) => <ServiceCard key={item.id} service={item} index={index} totalCount={filteredCatalog.length} onPreview={setInquiryService} onOrder={openOrder} />)}</div> : <p className="empty-catalog">Aucune création dans cette catégorie pour le moment.</p>}
            </section>
          </div>
        ) : (
          <div className="site-shell services-tab tab-content" role="tabpanel" aria-label="Services & Infos Commande" key={activeTab}>
            <section className="services-intro">
              <span className="section-kicker">EX3D SERVICE · ACTIVITÉS</span>
              <h1 className="display-serif">Services & infos commande.</h1>
              <p>Des créations sur mesure par Exaucé X3D et ses divisions. Choisissez une prestation pour préparer votre demande.</p>
            </section>
            <section className="service-list" aria-label="Liste des services">
              {serviceItems.map((item, index) => <article className="service-list-item" key={item.id}>
                <span className="service-list-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="service-list-copy"><span className="service-category">{item.category}</span><h2>{item.title}</h2><p>{item.description}</p></div>
                <div className="service-list-price"><span>Tarif / devis</span><strong>{item.price}</strong></div>
                <button className="button button-outline service-list-order" type="button" onClick={() => openOrder(item)}>Commander <ArrowUpRight size={14} aria-hidden="true" /></button>
              </article>)}
            </section>
            <section className="order-info-panel">
              <div><span className="section-kicker">INFORMATIONS & FORMULAIRE</span><h2 className="display-serif">Une commande, deux canaux.</h2><p>Renseignez vos coordonnées et les détails de votre projet. Votre demande sera transmise à Gmail et préparée dans WhatsApp, avec un récapitulatif à copier en cas de besoin.</p></div>
              <button className="button button-gold" type="button" onClick={() => openOrder()}>Nouvelle commande <ArrowUpRight size={14} aria-hidden="true" /></button>
            </section>
          </div>
        )}
      </main>
      <footer className="footer"><div className="site-shell footer-inner"><a className="wordmark" href="#accueil"><Image className="brand-logo" src="/Logo.png" alt="" width={24} height={24} /><span>EX3D SERVICE</span></a><span>Exaucé X3D · Studio créatif & activités</span><button className="footer-tab-link" type="button" onClick={() => setActiveTab(activeTab === "presentation" ? "services" : "presentation")}>{activeTab === "presentation" ? "Services & commande" : "Présentation & catalogue"} <MoveUpRight size={12} aria-hidden="true" /></button></div></footer>
      {drawerOpen && <OrderDrawer open={drawerOpen} initialService={selectedService} services={catalog} onClose={closeDrawer} />}
      {inquiryService && <InquiryModal service={inquiryService} index={catalog.findIndex((item) => item.id === inquiryService.id)} onClose={() => setInquiryService(null)} onOrder={openOrder} />}
    </>
  );
}