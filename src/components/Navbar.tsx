"use client";

import { ArrowDownRight } from "lucide-react";

type NavbarProps = {
  activeTab: "presentation" | "services";
  onTabChange: (tab: "presentation" | "services") => void;
  onOrder: () => void;
};

export default function Navbar({ activeTab, onTabChange, onOrder }: NavbarProps) {
  return (
    <header className="topbar">
      <div className="site-shell topbar-inner">
        <a className="wordmark" href="#accueil" aria-label="EX3D Service, accueil"><span className="brand-mark" aria-hidden="true" /><span>EX3D SERVICE</span></a>
        <nav className="primary-tabs" role="tablist" aria-label="Sections principales">
          <button role="tab" aria-selected={activeTab === "presentation"} className="primary-tab" type="button" onClick={() => onTabChange("presentation")}>Présentation & Catalogue</button>
          <button role="tab" aria-selected={activeTab === "services"} className="primary-tab" type="button" onClick={() => onTabChange("services")}>Services & Infos Commande</button>
        </nav>
        <div className="topbar-actions">
          <button className="button button-gold" type="button" onClick={onOrder}>Commander / Order <ArrowDownRight size={14} aria-hidden="true" /></button>
        </div>
      </div>
    </header>
  );
}