"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Copy, LoaderCircle, LockKeyhole, MessageCircle, X } from "lucide-react";
import { services as defaultServices, type Service } from "@/data/services";
import { buildWhatsAppUrl, formatOrderMessage, sendOrderByEmail, type EmailDeliveryResult, type OrderDetails } from "@/lib/orderDelivery";

type OrderDrawerProps = { open: boolean; initialService: Service | null; services: Service[]; onClose: () => void };
const emptyForm = { name: "", phone: "", email: "", budget: "", details: "" };

export default function OrderDrawer({ open, initialService, services: catalog, onClose }: OrderDrawerProps) {
  const [serviceId, setServiceId] = useState(initialService?.id ?? catalog[0]?.id ?? defaultServices[0].id);
  const [form, setForm] = useState(emptyForm);
  const [delivery, setDelivery] = useState<EmailDeliveryResult | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const service = catalog.find((item) => item.id === serviceId) ?? catalog[0] ?? defaultServices[0];
  const order: OrderDetails = { service, ...form };
  const summary = formatOrderMessage(order);
  const whatsappUrl = buildWhatsAppUrl(summary);
  const orderEmail = process.env.NEXT_PUBLIC_ORDER_EMAIL ?? "";
  const mailtoUrl = `mailto:${encodeURIComponent(orderEmail)}?subject=${encodeURIComponent(`Commande EX3D Service — ${service.title}`)}&body=${encodeURIComponent(summary)}`;

  useEffect(() => {
    if (!open) return;
    drawerRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleKeyDown); };
  }, [open, initialService, onClose]);

  if (!open) return null;

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    const result = await sendOrderByEmail(order);
    setDelivery(result);
    setSending(false);
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setCopied(false); }
  }

  return (
    <>
      <button className="drawer-backdrop" type="button" aria-label="Fermer la commande" onClick={onClose} />
      <aside className="order-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={drawerRef}>
        <div className="drawer-header">
          <div><span className="section-kicker">EX3D SERVICE</span><h2 className="drawer-heading" id="drawer-title">{delivery ? "Demande transmise" : "Nouvelle commande"}</h2><p className="drawer-subtitle">{delivery ? "Retrouvez votre récapitulatif et les options de suivi." : "Parlez-nous de votre prochain projet."}</p></div>
          <button className="drawer-close" type="button" aria-label="Fermer" onClick={onClose}><X size={17} aria-hidden="true" /></button>
        </div>
        <div className="drawer-scroll">
          {delivery ? (
            <div className="success-state" aria-live="polite">
              <div className="success-mark"><Check size={21} aria-hidden="true" /></div>
              <h3>Merci, {form.name.split(" ")[0]}.</h3>
              <p className="success-intro">WhatsApp a été lancé si votre navigateur l’autorise. Si rien ne s’est ouvert, utilisez le lien ci-dessous pour terminer l’envoi.</p>
              <div className="delivery-status">{delivery.message}</div>
              <div className="order-summary"><div className="summary-title"><span>Récapitulatif</span><span>{service.title}</span></div><pre className="summary-text">{summary}</pre></div>
              <div className="success-actions">
                <button className="button button-gold" type="button" onClick={copySummary}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied ? "Récapitulatif copié" : "Copier le récapitulatif"}</button>
                <a className="button button-outline" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} aria-hidden="true" /> Ouvrir WhatsApp <ArrowUpRight size={14} aria-hidden="true" /></a>
                {delivery.status !== "sent" && <a className="button button-quiet" href={mailtoUrl}>Envoyer par email <ArrowUpRight size={14} aria-hidden="true" /></a>}
              </div>
            </div>
          ) : (
            <form id="order-form" onSubmit={submitOrder}>
              <div className="form-field"><label htmlFor="service">Service / création <span>*</span></label><select id="service" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{catalog.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.category}</option>)}</select></div>
              <div className="form-field"><label htmlFor="name">Nom complet <span>*</span></label><input id="name" autoComplete="name" required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Votre nom" /></div>
              <div className="form-row">
                <div className="form-field"><label htmlFor="phone">Téléphone / WhatsApp <span>*</span></label><input id="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+33 6 00 00 00 00" /></div>
                <div className="form-field"><label htmlFor="email">Adresse email <span>*</span></label><input id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="vous@exemple.fr" /></div>
              </div>
              <div className="form-field"><label htmlFor="budget">Budget estimé / quantité <span aria-hidden="true">·</span></label><select id="budget" value={form.budget} onChange={(event) => updateField("budget", event.target.value)}><option value="">À définir</option><option value="Moins de 100 €">Moins de 100 €</option><option value="100 à 300 €">100 à 300 €</option><option value="300 à 700 €">300 à 700 €</option><option value="Plus de 700 €">Plus de 700 €</option><option value="Quantité : 1">Quantité : 1</option><option value="Quantité : 2 à 5">Quantité : 2 à 5</option><option value="Quantité : 6 ou plus">Quantité : 6 ou plus</option></select></div>
              <div className="form-field"><label htmlFor="details">Détails du projet <span>*</span></label><textarea id="details" required value={form.details} onChange={(event) => updateField("details", event.target.value)} placeholder="Votre besoin, vos délais, les éléments déjà disponibles…" /></div>
              <div className="order-summary" aria-live="polite"><div className="summary-title"><span>Aperçu de la commande</span><span>Mis à jour en direct</span></div><pre className="summary-text">{summary}</pre></div>
            </form>
          )}
        </div>
        {!delivery && <div className="drawer-footer"><button className="button button-gold" type="submit" form="order-form" disabled={sending}>{sending ? <LoaderCircle className="animate-spin" size={15} aria-hidden="true" /> : <MessageCircle size={15} aria-hidden="true" />}{sending ? "Transmission en cours…" : "Envoyer sur WhatsApp + email"}{!sending && <ArrowUpRight size={14} aria-hidden="true" />}</button><p className="delivery-note"><LockKeyhole size={12} aria-hidden="true" /> Vos informations servent uniquement au traitement de cette demande.</p></div>}
      </aside>
    </>
  );
}