"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableQrModal } from "./table-qr-modal";

type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";

interface DiningTable {
  id: string;
  identifier: string;
  capacity: number | null;
  status: TableStatus;
  isActive: boolean;
}

interface Props {
  restaurantId: string;
  /** Restaurant slug used to build QR code menu URLs */
  restaurantSlug: string;
}

const statusLabels: Record<TableStatus, string> = {
  AVAILABLE: "Livre",
  OCCUPIED: "Ocupada",
  RESERVED: "Reservada",
};

export function TablesSettings({ restaurantId, restaurantSlug }: Props) {
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrTable, setQrTable] = useState<DiningTable | null>(null);

  const { data: tables = [], isLoading } = useQuery<DiningTable[]>({
    queryKey: ["tables", restaurantId],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/tables?isActive=true`);
      if (!response.ok) throw new Error("Falha ao carregar mesas");
      return response.json() as Promise<DiningTable[]>;
    },
  });

  async function createTable() {
    if (!identifier.trim()) {
      toast.error("Informe o identificador da mesa.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/restaurants/${restaurantId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          capacity: capacity ? Number(capacity) : undefined,
          isActive: true,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Erro ao criar mesa");
      }

      setIdentifier("");
      setCapacity("");
      await queryClient.invalidateQueries({ queryKey: ["tables", restaurantId] });
      toast.success("Mesa criada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar mesa.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mesas</h1>
        <p className="text-sm text-neutral-500">
          Cadastre e acompanhe as mesas disponíveis para comandas.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_auto]">
          <div>
            <label className="text-sm font-medium text-neutral-700">Identificador</label>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Ex.: 1, VIP, Balcão 3"
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Capacidade</label>
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="Opcional"
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={createTable} loading={isSubmitting} className="w-full md:w-auto">
              Nova mesa
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <p className="text-sm text-neutral-500">Carregando mesas...</p>
          ) : tables.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
              Nenhuma mesa cadastrada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-neutral-900">Mesa {table.identifier}</p>
                    <p className="text-sm text-neutral-500">
                      {table.capacity ? `${table.capacity} lugares` : "Capacidade não informada"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={table.status === "AVAILABLE" ? "secondary" : "outline"}>
                      {statusLabels[table.status]}
                    </Badge>
                    <button
                      onClick={() => setQrTable(table)}
                      className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                      title="Ver QR Code"
                      aria-label={`QR Code da Mesa ${table.identifier}`}
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {qrTable && (
        <TableQrModal
          tableIdentifier={qrTable.identifier}
          menuSlug={restaurantSlug}
          onClose={() => setQrTable(null)}
        />
      )}
    </div>
  );
}
