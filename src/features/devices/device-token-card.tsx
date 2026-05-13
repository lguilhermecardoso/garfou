"use client";

import { useState } from "react";
import { Smartphone, Tv, Copy, RefreshCw, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeviceTokenCardProps {
  restaurantId: string;
  tokenId: string;
  token: string;
  type: "WAITER" | "KITCHEN";
  sessionsCount: number;
  creatorName: string;
  onTokenUpdated: () => void;
}

export default function DeviceTokenCard({
  restaurantId,
  tokenId,
  token,
  type,
  sessionsCount,
  creatorName,
  onTokenUpdated,
}: DeviceTokenCardProps) {
  const [copied, setCopied] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const icon = type === "WAITER" ? Smartphone : Tv;
  const Icon = icon;
  const title = type === "WAITER" ? "App Garçom" : "App Cozinha";
  const bgColor = type === "WAITER" ? "bg-blue-50" : "bg-orange-50";
  const textColor = type === "WAITER" ? "text-blue-600" : "text-orange-600";
  const activationUrl =
    type === "WAITER"
      ? `${window.location.origin}/waiter-app/activate`
      : `${window.location.origin}/kitchen-app/activate`;

  // Format token: 123456 → 123 456
  const formattedToken = token.slice(0, 3) + " " + token.slice(3);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/tokens/${tokenId}`, {
        method: "PUT",
      });

      if (response.ok) {
        onTokenUpdated();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao revogar token");
      }
    } catch (error) {
      console.error("Error revoking token:", error);
      alert("Erro ao revogar token");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/tokens/${tokenId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onTokenUpdated();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao deletar token");
      }
    } catch (error) {
      console.error("Error deleting token:", error);
      alert("Erro ao deletar token");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={bgColor}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${textColor}`} />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              disabled={copied}
              className="h-8"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" />
                  Copiar
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={isRevoking} className="h-8">
                  <RefreshCw className={`mr-1 h-3 w-3 ${isRevoking ? "animate-spin" : ""}`} />
                  Revogar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revogar e Regenerar Token</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá <strong>desconectar TODOS os {sessionsCount} dispositivos</strong>{" "}
                    ativos e gerar um novo token. Você precisará reativar cada dispositivo com o
                    novo token.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRevoke}>Revogar e Regenerar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={isDeleting} className="h-8">
                  <Trash2 className="mr-1 h-3 w-3" />
                  Deletar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deletar Token Permanentemente</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá <strong>deletar permanentemente</strong> este token e{" "}
                    <strong>desconectar TODOS os dispositivos</strong>. Esta ação não pode ser
                    desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Deletar Permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <CardDescription>
          {sessionsCount} {sessionsCount === 1 ? "dispositivo" : "dispositivos"} conectado
          {sessionsCount === 1 ? "" : "s"} • Criado por {creatorName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Token Display */}
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-4">
          <p className="mb-1 text-xs font-semibold text-gray-500 uppercase">Token de Acesso</p>
          <p className="text-center font-mono text-5xl font-bold tracking-wider text-gray-900">
            {formattedToken}
          </p>
        </div>

        {/* Activation URL */}
        <div className="rounded-lg bg-white p-3">
          <p className="mb-1 text-xs text-gray-500">Acesse na TV/Tablet:</p>
          <p className="font-mono text-sm break-all text-gray-900">{activationUrl}</p>
        </div>

        {/* Instructions */}
        <div className="space-y-1 text-xs text-gray-600">
          <p className="font-semibold">📱 Instruções:</p>
          <ol className="ml-2 list-inside list-decimal space-y-1">
            <li>Abra o navegador no dispositivo (tablet/TV)</li>
            <li>Acesse a URL acima</li>
            <li>Digite o token de 6 dígitos</li>
            <li>Dispositivo ficará conectado permanentemente</li>
            <li>Use F11 para fullscreen</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
