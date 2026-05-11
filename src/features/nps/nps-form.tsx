"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Star } from "lucide-react";

interface Props {
  restaurantId: string;
  restaurantName: string;
  orderId?: string;
}

export function NpsForm({ restaurantId, restaurantName, orderId }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (score === null) return;
    setLoading(true);
    try {
      await fetch(`/api/restaurants/${restaurantId}/nps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment, orderId }),
      });
      setSubmitted(true);
    } catch {
      alert("Erro ao enviar avaliação.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4 text-center">
        <div className="rounded-full bg-accent-100 p-6">
          <Star className="h-12 w-12 text-accent-500" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Obrigado!</h1>
          <p className="mt-2 text-neutral-500">
            Sua avaliação foi registrada. Isso nos ajuda a melhorar cada vez mais!
          </p>
        </div>
      </div>
    );
  }

  const scoreLabels: Record<number, string> = {
    0: "Horrível",
    1: "Muito ruim",
    2: "Ruim",
    3: "Ruim",
    4: "Regular",
    5: "Regular",
    6: "Razoável",
    7: "Bom",
    8: "Muito bom",
    9: "Excelente",
    10: "Incrível!",
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="bg-white border-b border-neutral-100 px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <UtensilsCrossed className="h-5 w-5 text-primary-500" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-neutral-900">{restaurantName}</p>
            <p className="text-xs text-neutral-500">Avaliação de experiência</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8" id="main-content">
        <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-8">
          <div className="text-center">
            <h1 className="text-xl font-bold text-neutral-900">
              Como foi sua experiência?
            </h1>
            <p className="mt-1 text-neutral-500">
              0 = péssimo, 10 = incrível
            </p>
          </div>

          {/* Score buttons */}
          <div role="group" aria-label="Nota de 0 a 10">
            <div className="grid grid-cols-11 gap-1.5">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScore(i)}
                  className={`aspect-square rounded-xl text-sm font-bold transition-all ${score === i
                      ? "bg-primary-500 text-white scale-110 shadow-md"
                      : i <= 6
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : i <= 8
                          ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  aria-pressed={score === i}
                  aria-label={`Nota ${i}`}
                >
                  {i}
                </button>
              ))}
            </div>
            {score !== null && (
              <p className="mt-2 text-center text-sm font-medium text-neutral-600">
                {scoreLabels[score]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label htmlFor="comment" className="block text-sm font-medium text-neutral-700">
              Conta mais (opcional)
            </label>
            <textarea
              id="comment"
              rows={4}
              placeholder="O que você mais gostou? O que podemos melhorar?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              maxLength={500}
            />
            <p className="text-right text-xs text-neutral-400">{comment.length}/500</p>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={score === null || loading}
            loading={loading}
          >
            Enviar avaliação
          </Button>
        </form>
      </main>
    </div>
  );
}
