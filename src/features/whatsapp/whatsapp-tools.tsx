"use client";

/**
 * WhatsAppTools
 *
 * Dashboard utility page for WhatsApp communication. Replaces the broken iframe
 * approach (WhatsApp Web blocks embedding via X-Frame-Options).
 *
 * Features:
 * - One-click link to WhatsApp Web in a new tab
 * - wa.me deep-link builder: enter customer phone → open WhatsApp chat
 * - Ready-made message templates with copy-to-clipboard buttons
 *
 * Templates use [nome] and [número] as placeholders that the operator
 * replaces before sending.
 */

import { useState } from "react";
import { MessageCircle, ExternalLink, Copy, Check } from "lucide-react";

const TEMPLATES = [
  {
    label: "Pedido confirmado",
    text: "Olá [nome], seu pedido #[número] foi confirmado e já está sendo preparado! Em breve notificamos você.",
  },
  {
    label: "Pedido pronto para retirada",
    text: "Olá [nome], seu pedido #[número] está pronto para retirada! Pode vir buscar.",
  },
  {
    label: "Saiu para entrega",
    text: "Olá [nome], seu pedido #[número] saiu para entrega! Em breve você receberá.",
  },
  {
    label: "Pedido cancelado",
    text: "Olá [nome], infelizmente tivemos que cancelar seu pedido #[número]. Entre em contato para mais informações.",
  },
  {
    label: "Demora no preparo",
    text: "Olá [nome], informamos que o pedido #[número] está levando um pouco mais de tempo que o esperado. Agradecemos sua paciência!",
  },
];

export function WhatsAppTools() {
  const [phone, setPhone] = useState("");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  function openWame() {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return;
    window.open(`https://wa.me/55${digits}`, "_blank", "noopener,noreferrer");
  }

  async function copyTemplate(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">WhatsApp</h1>
        <p className="text-sm text-neutral-500">
          Acesse o WhatsApp Web e use os templates de mensagem para se comunicar com seus clientes.
        </p>
      </div>

      {/* Open WhatsApp Web */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-neutral-900">Abrir WhatsApp Web</h2>
        <p className="mb-4 text-sm text-neutral-500">
          O WhatsApp Web não pode ser incorporado nesta tela. Clique abaixo para abrir em uma nova
          aba.
        </p>
        <a
          href="https://web.whatsapp.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          Abrir WhatsApp Web
          <ExternalLink className="h-3.5 w-3.5 opacity-80" />
        </a>
      </div>

      {/* wa.me deep-link builder */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-1 font-semibold text-neutral-900">Enviar mensagem rápida</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Digite o número do cliente com DDD (somente números) e clique em Abrir.
        </p>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && openWame()}
            placeholder="Ex.: 11987654321"
            className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
            aria-label="Número do cliente"
          />
          <button
            type="button"
            onClick={openWame}
            className="rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Abrir
          </button>
        </div>
      </div>

      {/* Message templates */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-neutral-900">Templates de mensagem</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Clique em Copiar, substitua{" "}
          <code className="rounded bg-neutral-100 px-1 text-xs">[nome]</code> e{" "}
          <code className="rounded bg-neutral-100 px-1 text-xs">[número]</code> e envie no WhatsApp.
        </p>
        <div className="space-y-3">
          {TEMPLATES.map((tpl) => {
            const copied = copiedLabel === tpl.label;
            return (
              <div
                key={tpl.label}
                className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 p-4"
              >
                <div>
                  <p className="text-xs font-semibold text-neutral-700">{tpl.label}</p>
                  <p className="mt-0.5 text-sm text-neutral-600">{tpl.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyTemplate(tpl.label, tpl.text)}
                  className={`shrink-0 rounded-lg border p-1.5 transition-colors ${
                    copied
                      ? "border-green-300 bg-green-50 text-green-600"
                      : "border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                  }`}
                  aria-label={`Copiar template: ${tpl.label}`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
