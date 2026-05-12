# Masked Input Components

Componentes de input com máscaras e validações brasileiras prontos para uso em todo o sistema.

## Localização

- **Funções de máscara**: `src/lib/masks.ts`
- **Componentes React**: `src/components/ui/masked-input.tsx`

---

## Componentes Disponíveis

### PhoneInput

Input para telefone/WhatsApp com máscara brasileira.

**Formato**: `(XX) XXXXX-XXXX` ou `(XX) XXXX-XXXX`

**Props**:

- Todas as props padrão de `<input>`
- `label?: string` - Label do campo
- `error?: string` - Mensagem de erro customizada
- `onValidate?: (isValid: boolean) => void` - Callback quando validação muda

**Exemplo**:

```tsx
import { PhoneInput } from "@/components/ui/masked-input";

function CustomerForm() {
  const [phone, setPhone] = useState("");

  return (
    <PhoneInput
      label="WhatsApp"
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      required
    />
  );
}
```

**Validação**: 10 ou 11 dígitos numéricos

---

### CPFInput

Input para CPF com máscara e validação por dígito verificador.

**Formato**: `XXX.XXX.XXX-XX`

**Exemplo**:

```tsx
import { CPFInput } from "@/components/ui/masked-input";

<CPFInput label="CPF" value={cpf} onChange={(e) => setCPF(e.target.value)} required />;
```

**Validação**: Algoritmo oficial de CPF (verifica dígitos verificadores)

---

### CNPJInput

Input para CNPJ com máscara e validação por dígito verificador.

**Formato**: `XX.XXX.XXX/XXXX-XX`

**Exemplo**:

```tsx
import { CNPJInput } from "@/components/ui/masked-input";

<CNPJInput label="CNPJ" value={cnpj} onChange={(e) => setCNPJ(e.target.value)} required />;
```

**Validação**: Algoritmo oficial de CNPJ (verifica dígitos verificadores)

---

### CPFOrCNPJInput

Input que detecta automaticamente se o valor é CPF ou CNPJ e aplica a máscara correta.

**Formato**: CPF até 11 dígitos, CNPJ acima de 11 dígitos

**Exemplo**:

```tsx
import { CPFOrCNPJInput } from "@/components/ui/masked-input";

<CPFOrCNPJInput
  label="CPF ou CNPJ"
  value={document}
  onChange={(e) => setDocument(e.target.value)}
  required
/>;
```

**Validação**: Aplica validação de CPF ou CNPJ dependendo do tamanho

---

### CEPInput

Input para CEP brasileiro com máscara.

**Formato**: `XXXXX-XXX`

**Props adicionais**:

- `onCEPComplete?: (cep: string) => void` - Callback quando CEP completo é digitado (recebe apenas números)

**Exemplo**:

```tsx
import { CEPInput } from "@/components/ui/masked-input";

<CEPInput
  label="CEP"
  value={cep}
  onChange={(e) => setCEP(e.target.value)}
  onCEPComplete={(cep) => {
    // cep = "80000000" (apenas números)
    fetchAddressByCEP(cep);
  }}
  required
/>;
```

**Validação**: 8 dígitos numéricos

---

### EmailInput

Input para email com validação de formato.

**Exemplo**:

```tsx
import { EmailInput } from "@/components/ui/masked-input";

<EmailInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />;
```

**Validação**: Formato padrão de email (`algo@dominio.com`)

---

## Funções de Máscara (uso direto)

Se você precisar apenas das funções de máscara/validação sem os componentes React:

```typescript
import {
  maskPhone,
  unmaskPhone,
  validatePhone,
  maskCPF,
  validateCPF,
  maskCNPJ,
  validateCNPJ,
  maskCPFOrCNPJ,
  validateCPFOrCNPJ,
  maskCEP,
  validateCEP,
  validateEmail,
  formatPhoneInternational,
} from "@/lib/masks";

// Aplicar máscara
const formatted = maskPhone("11987924760"); // "(11) 98792-4760"

// Remover máscara
const numbers = unmaskPhone("(11) 98792-4760"); // "11987924760"

// Validar
const isValid = validatePhone("(11) 98792-4760"); // true

// Formato internacional
const intl = formatPhoneInternational("11987924760"); // "+55 (11) 98792-4760"
```

---

## Funcionalidades Comuns

Todos os componentes de input incluem:

1. **Máscara em tempo real**: Aplica formatação enquanto o usuário digita
2. **Validação on blur**: Valida quando o campo perde foco
3. **Mensagem de erro**: Exibe erro automático se inválido
4. **Callback de validação**: `onValidate` permite reagir a mudanças de validade
5. **Clear error on type**: Limpa erro automaticamente quando usuário começa a digitar
6. **Suporte a label**: Prop `label` opcional para adicionar label ao campo
7. **Indicador de required**: Asterisco vermelho quando `required={true}`
8. **Acessibilidade**: `inputMode` apropriado para cada tipo (numeric, tel, email)

---

## Estilo e Customização

Os componentes usam Tailwind CSS e seguem o design system do Garfou:

- **Border padrão**: `border-neutral-300`
- **Focus**: `focus:border-primary-500 focus:ring-primary-200`
- **Erro**: `border-red-300 focus:border-red-500 focus:ring-red-200`
- **Label**: `text-sm font-medium text-neutral-700`
- **Mensagem de erro**: `text-xs text-red-600`

Para customizar, passe `className` adicional:

```tsx
<PhoneInput className="bg-gray-50" value={phone} onChange={(e) => setPhone(e.target.value)} />
```

---

## Uso no Sistema

### Locais onde aplicar (migração progressiva)

1. **Cadastro de clientes** (`src/features/customers/`)
   - Telefone, Email, CPF/CNPJ

2. **Cardápio digital** (`src/features/menu/digital-menu-client.tsx`)
   - Telefone, Email, CEP (delivery)

3. **Cadastro de usuários** (`src/features/auth/`)
   - Email, Telefone

4. **Configurações de restaurante** (`src/features/settings/`)
   - Telefone, CNPJ, CEP

5. **Cadastro de fornecedores** (inventory)
   - Telefone, Email, CPF/CNPJ

6. **Relatórios e filtros** (finance)
   - CPF/CNPJ para busca

---

## Boas Práticas

### ✅ Fazer

```tsx
// Usar componente apropriado
<PhoneInput value={phone} onChange={(e) => setPhone(e.target.value)} />;

// Validar antes de enviar
const isValid = validatePhone(phone);
if (!isValid) return;

// Remover máscara antes de salvar no banco
const phoneNumbers = unmaskPhone(phone);
await createCustomer({ phone: phoneNumbers });
```

### ❌ Evitar

```tsx
// NÃO usar input genérico para dados brasileiros
<input type="tel" value={phone} />; // ❌

// NÃO salvar com máscara no banco
await createCustomer({ phone: "(11) 98792-4760" }); // ❌

// NÃO confiar apenas em validação client-side
// Sempre validar também no backend
```

---

## API ViaCEP (Integração Futura)

Para o `CEPInput`, recomendamos integração com API ViaCEP:

```tsx
async function fetchAddressByCEP(cep: string) {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const data = await response.json();

  if (!data.erro) {
    setStreet(data.logradouro);
    setDistrict(data.bairro);
    setCity(data.localidade);
    setState(data.uf);
  }
}

<CEPInput value={cep} onChange={(e) => setCEP(e.target.value)} onCEPComplete={fetchAddressByCEP} />;
```

---

## Testes

### Casos de teste recomendados

**PhoneInput**:

- ✅ `11987924760` → `(11) 98792-4760`
- ✅ `1140001234` → `(11) 4000-1234`
- ❌ `119879` → inválido (incompleto)

**CPFInput**:

- ✅ `12345678900` → `123.456.789-00` (se válido)
- ❌ `12345678901` → inválido (dígito verificador errado)
- ❌ `11111111111` → inválido (dígitos repetidos)

**CNPJInput**:

- ✅ `12345678000195` → `12.345.678/0001-95` (se válido)
- ❌ `12345678000100` → inválido (dígito verificador errado)

**CEPInput**:

- ✅ `80000000` → `80000-000`
- ❌ `800` → inválido (incompleto)

**EmailInput**:

- ✅ `user@example.com`
- ❌ `user@example` → inválido
- ❌ `@example.com` → inválido

---

## Roadmap

- [ ] Integração com react-hook-form
- [ ] Testes automatizados (Vitest)
- [ ] Componente de busca de endereço por CEP (ViaCEP)
- [ ] Suporte a máscaras customizadas
- [ ] Validação assíncrona (verificar CPF em API externa, etc.)
- [ ] Internacionalização (i18n) para mensagens de erro
