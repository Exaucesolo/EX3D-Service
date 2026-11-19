import type { Service } from "@/data/services";

export type OrderDetails = {
  service: Service;
  name: string;
  phone: string;
  email: string;
  budget: string;
  details: string;
};

export type EmailDeliveryResult = {
  status: "sent" | "unconfigured" | "failed";
  message: string;
};

export function formatOrderMessage(order: OrderDetails) {
  return [
    "EX3D SERVICE — NOUVELLE COMMANDE",
    "",
    `Création / service : ${order.service.title}`,
    `Nom : ${order.name}`,
    `Téléphone / WhatsApp : ${order.phone}`,
    `Email : ${order.email}`,
    `Budget estimé / quantité : ${order.budget || "À définir"}`,
    "",
    "Détails du projet :",
    order.details,
  ].join("\n");
}

export function buildWhatsAppUrl(message: string) {
  const phoneNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const recipient = phoneNumber ? `/${phoneNumber}` : "/";
  return `https://wa.me${recipient}?text=${encodeURIComponent(message)}`;
}

export async function sendOrderByEmail(order: OrderDetails): Promise<EmailDeliveryResult> {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
  if (!accessKey) {
    return { status: "unconfigured", message: "La réception email n’est pas encore configurée. Votre commande reste disponible en copie et sur WhatsApp." };
  }

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `Nouvelle commande EX3D Service — ${order.service.title}`,
        from_name: "EX3D Service — commandes",
        name: order.name,
        email: order.email,
        phone: order.phone,
        service: order.service.title,
        budget: order.budget || "À définir",
        message: formatOrderMessage(order),
      }),
    });
    const result = (await response.json()) as { success?: boolean; message?: string };
    if (!response.ok || !result.success) {
      return { status: "failed", message: result.message ?? "L’email n’a pas pu être envoyé. Utilisez le lien email direct ci-dessous." };
    }
    return { status: "sent", message: "Votre demande a bien été transmise par email." };
  } catch {
    return { status: "failed", message: "La connexion au service email a échoué. Utilisez le lien email direct ci-dessous." };
  }
}