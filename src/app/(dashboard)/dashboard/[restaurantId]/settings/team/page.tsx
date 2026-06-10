"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  User,
  ChefHat,
  CreditCard,
  UtensilsCrossed,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";

type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "WAITER" | "KITCHEN" | "CASHIER";
  joinedAt: string;
};

type NewMemberForm = {
  name: string;
  email: string;
  password: string;
  role: "MANAGER" | "WAITER" | "KITCHEN" | "CASHIER";
};

export default function TeamManagementPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId as string;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newMember, setNewMember] = useState<NewMemberForm>({
    name: "",
    email: "",
    password: "",
    role: "WAITER",
  });

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  async function fetchMembers() {
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/team`);
      if (!res.ok) {
        if (res.status === 403) {
          setError("Apenas OWNER pode gerenciar equipe");
          return;
        }
        throw new Error("Erro ao carregar equipe");
      }
      const data = await res.json();
      setMembers(data.members);
    } catch {
      setError("Erro ao carregar equipe");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAddingMember(true);

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao adicionar membro");
        setAddingMember(false);
        return;
      }

      setSuccess("Membro adicionado com sucesso!");
      setShowAddModal(false);
      setNewMember({ name: "", email: "", password: "", role: "WAITER" });
      fetchMembers();
    } catch {
      setError("Erro ao conectar com o servidor");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(membershipId: string, memberName: string) {
    if (!confirm(`Tem certeza que deseja remover ${memberName} da equipe?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/team?membershipId=${membershipId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao remover membro");
        return;
      }

      setSuccess("Membro removido com sucesso!");
      fetchMembers();
    } catch {
      setError("Erro ao remover membro");
    }
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case "OWNER":
        return <Shield className="h-5 w-5 text-purple-600" />;
      case "MANAGER":
        return <User className="h-5 w-5 text-blue-600" />;
      case "WAITER":
        return <UtensilsCrossed className="h-5 w-5 text-green-600" />;
      case "KITCHEN":
        return <ChefHat className="h-5 w-5 text-orange-600" />;
      case "CASHIER":
        return <CreditCard className="h-5 w-5 text-indigo-600" />;
      default:
        return <User className="h-5 w-5 text-neutral-600" />;
    }
  }

  function getRoleLabel(role: string) {
    const labels: Record<string, string> = {
      OWNER: "Proprietário",
      MANAGER: "Gerente",
      WAITER: "Garçom",
      KITCHEN: "Cozinha",
      CASHIER: "Caixa",
    };
    return labels[role] || role;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary-200 border-t-primary-600 mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4" />
          <p className="text-sm text-neutral-600">Carregando equipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Gestão de Equipe</h1>
              <p className="mt-1 text-neutral-600">Gerencie os membros do seu restaurante</p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Membro
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Erro</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError("")}>
              <X className="h-5 w-5 text-red-600" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Sucesso</p>
              <p className="mt-1 text-sm text-green-700">{success}</p>
            </div>
            <button onClick={() => setSuccess("")}>
              <X className="h-5 w-5 text-green-600" />
            </button>
          </div>
        )}

        {/* Members List */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-6">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-neutral-600" />
              <h2 className="text-lg font-semibold text-neutral-900">Membros ({members.length})</h2>
            </div>
          </div>

          <div className="divide-y divide-neutral-200">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-6 hover:bg-neutral-50"
              >
                <div className="flex items-center gap-4">
                  {getRoleIcon(member.role)}
                  <div>
                    <p className="font-medium text-neutral-900">{member.name}</p>
                    <p className="text-sm text-neutral-600">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                    {getRoleLabel(member.role)}
                  </span>

                  {member.role !== "OWNER" && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="text-red-600 hover:text-red-700"
                      title="Remover membro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-neutral-900">Adicionar Membro</h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="h-5 w-5 text-neutral-600" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Nome completo
                  </label>
                  <Input
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="João da Silva"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">Email</label>
                  <Input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    placeholder="joao@exemplo.com"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Senha inicial
                  </label>
                  <Input
                    type="password"
                    value={newMember.password}
                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">Função</label>
                  <select
                    value={newMember.role}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        role: e.target.value as NewMemberForm["role"],
                      })
                    }
                    className="w-full rounded-lg border border-neutral-300 p-2"
                    required
                  >
                    <option value="MANAGER">Gerente</option>
                    <option value="WAITER">Garçom</option>
                    <option value="KITCHEN">Cozinha</option>
                    <option value="CASHIER">Caixa</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                    disabled={addingMember}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={addingMember} className="flex-1">
                    {addingMember ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
