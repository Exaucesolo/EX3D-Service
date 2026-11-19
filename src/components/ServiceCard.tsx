"use client";

import { ArrowUpRight, Eye } from "lucide-react";
import type { Service } from "@/data/services";

type ServiceCardProps = {
  service: Service;
  index: number;
  totalCount: number;
  onPreview: (service: Service) => void;
  onOrder: (service: Service) => void;
};

export function ServiceArtwork({ service, index }: { service: Service; index: number }) {
  const imageStyle = service.imageUrl
    ? { backgroundImage: `linear-gradient(0deg, rgba(9,9,11,.16), rgba(9,9,11,.04)), url("${service.imageUrl.replaceAll('"', "%22")}")` }
    : undefined;
  return <div className={`service-art art-${service.visual}${service.imageUrl ? " has-photo" : ""}`} style={imageStyle} role="img" aria-label={`Visuel pour ${service.title}`}><span className="art-mark">EX3D / STUDIO</span><span className="art-number">N° {String(index + 1).padStart(2, "0")}</span></div>;
}

export default function ServiceCard({ service, index, totalCount, onPreview, onOrder }: ServiceCardProps) {
  return (
    <article className="service-card" style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}>
      <ServiceArtwork service={service} index={index} />
      <div className="service-content">
        <div className="service-meta"><span className="service-category">{service.category}</span><span className="service-index">{String(index + 1).padStart(2, "0")} / {String(totalCount).padStart(2, "0")}</span></div>
        <h3>{service.title}</h3>
        <p className="service-description">{service.description}</p>
        <div className="service-bottom">
          <span className="price-label">Tarif / devis<strong className="price-value">{service.price}</strong></span>
          <div className="service-actions">
            <button className="button button-outline inquire-button" type="button" onClick={() => onPreview(service)}><Eye size={13} aria-hidden="true" /> Se renseigner</button>
            <button className="icon-action" type="button" aria-label={`Commander ${service.title}`} title="Commander" onClick={() => onOrder(service)}><ArrowUpRight size={16} aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    </article>
  );
}