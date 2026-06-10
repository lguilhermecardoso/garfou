import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  PhoneInput,
  CPFInput,
  CNPJInput,
  CEPInput,
  EmailInput,
} from "@/components/ui/masked-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card } from "@/components/ui/card";

const ROWS_SPACER = "h-4";

export default function ComponentsPreviewPage() {
  // Guard: keep this route unavailable in production without throwing during build.
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <main className="min-h-screen space-y-12 bg-neutral-50 p-8">
      <header>
        <h1 className="text-3xl font-bold text-neutral-900">Component Library</h1>
        <p className="mt-1 text-neutral-500">chamou.delivery design system preview — dev only</p>
      </header>

      {/* Buttons */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-neutral-800">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="success">Success</Button>
        </div>
        <div className={ROWS_SPACER} />
        <h3 className="mb-3 text-sm font-semibold text-neutral-600">Sizes</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">XL</Button>
          <Button size="icon">★</Button>
        </div>
        <div className={ROWS_SPACER} />
        <h3 className="mb-3 text-sm font-semibold text-neutral-600">States</h3>
        <div className="flex flex-wrap gap-3">
          <Button loading>Loading...</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-neutral-800">Badge</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
        </div>
      </section>

      {/* Inputs */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-neutral-800">Input</h2>
        <div className="max-w-md space-y-4">
          <Input id="demo-1" label="Label padrão" placeholder="Digite algo..." />
          <Input
            id="demo-2"
            label="Com erro"
            placeholder="Digite algo..."
            error="Campo obrigatório"
          />
          <Input id="demo-3" label="Desabilitado" placeholder="Não editável" disabled />
        </div>
      </section>

      {/* Masked Inputs */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-neutral-800">Masked Inputs (BR)</h2>
        <div className="max-w-md space-y-4">
          <PhoneInput label="Telefone" placeholder="(00) 00000-0000" onChange={() => {}} />
          <CPFInput label="CPF" placeholder="000.000.000-00" onChange={() => {}} />
          <CNPJInput label="CNPJ" placeholder="00.000.000/0000-00" onChange={() => {}} />
          <CEPInput label="CEP" placeholder="00000-000" onChange={() => {}} />
          <EmailInput label="E-mail" placeholder="email@exemplo.com" onChange={() => {}} />
        </div>
      </section>

      {/* Currency Input */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-neutral-800">Currency Input (BRL)</h2>
        <div className="max-w-md space-y-4">
          <CurrencyInput label="Preço" placeholder="R$ 0,00" />
          <CurrencyInput label="Taxa de entrega" placeholder="R$ 0,00" />
          <CurrencyInput label="Desconto" placeholder="R$ 0,00" error="Valor inválido" />
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-neutral-800">Card</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900">Card Padrão</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Este é um card básico com padding e bordas arredondadas.
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900">Card com Badge</h3>
              <Badge variant="success" className="mt-2">
                Ativo
              </Badge>
              <p className="mt-2 text-sm text-neutral-600">Card com badge de status.</p>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900">Card com Ação</h3>
              <p className="mt-2 mb-4 text-sm text-neutral-600">Card com botão de ação.</p>
              <Button size="sm">Ver detalhes</Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Color palette */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-neutral-800">Color Tokens</h2>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => (
            <div key={n} className="space-y-1">
              <div className={`h-10 rounded-lg bg-primary-${n}`} title={`primary-${n}`} />
              <p className="text-center text-xs text-neutral-500">{n}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-neutral-500">Primary (red)</p>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => (
            <div key={n} className="space-y-1">
              <div className={`h-10 rounded-lg bg-accent-${n}`} title={`accent-${n}`} />
              <p className="text-center text-xs text-neutral-500">{n}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-neutral-500">Accent (amber)</p>
      </section>
    </main>
  );
}
