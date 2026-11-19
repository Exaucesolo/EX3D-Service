"use client";

import { ArrowUpRight, X } from "lucide-react";
import type { Service } from "@/data/services";
import { ServiceArtwork } from "@/components/ServiceCard";

type InquiryModalProps = {
  service: Service;
  index: number;
  onClose: () => void;
  onOrder: (service: Service) => void;
};

export default function InquiryModal({ service, index, onClose, onOrder }: InquiryModalProps) {
  return (
    <>
      <button className="preview-backdrop" type="button" aria-label="Fermer les informations" onClick={onClose} />
      <section className="preview-dialog inquiry-dialog" role="dialog" aria-modal="true" aria-labelledby="inquiry-title">
        <button className="drawer-close preview-close" type="button" aria-label="Fermer" onClick={onClose}><X size={15} aria-hidden="true" /></button>
        <ServiceArtwork service={service} index={index} />
        <div className="preview-body">
          <div className="service-meta"><span className="service-category">{service.category}</span><span className="service-index">{service.status ?? "Disponible"}</span></div>
          <h2 className="display-serif" id="inquiry-title">{service.title}</h2>
          <p>{service.description}</p>
          <div className="inquiry-specs">
            <div><span>Tarif / devis</span><strong>{service.price}</strong></div>
            <div><span>Livrables & détails</span><p>{service.deliverables || service.description}</p></div>
            {service.notes && <div><span>Notes</span><p>{service.notes}</p></div>}
          </div>
          <div className="inquiry-order">
            <button className="button button-gold" type="button" onClick={() => onOrder(service)}>Commander <ArrowUpRight size={15} aria-hidden="true" /></button>
          </div>
        </div>
      </section>
    </>
  );
}