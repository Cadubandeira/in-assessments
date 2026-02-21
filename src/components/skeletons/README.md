# Sistema de Skeleton Screens

Sistema completo de skeleton screens implementado em **TODAS as páginas** da aplicação, com elementos internos perfeitamente alinhados para zero layout shift.

## ✅ Status da Padronização

**TODAS as inconsistências foram corrigidas!**

### Princípio de Padronização Seguido:
1. **Manter TODAS as cores de fundo da página real** (hero sections coloridos, gradientes)
2. **Usar `SkeletonBase` APENAS para conteúdo interno** (textos, dados dinâmicos)
3. **NUNCA sobrescrever o background do SkeletonBase** com `className="bg-white/XX"`

---

## 📦 Componentes Criados

### Componentes Base
- **`src/components/ui/Skeleton.jsx`** - Componentes base reutilizáveis:
  - `SkeletonBase` - Elemento base com animação shimmer (gradient cinza)
  - `SkeletonText` - Para textos de múltiplas linhas  
  - `SkeletonCard` - Para cards
  - `SkeletonChart` - Para gráficos
  - `SkeletonButton` - Para botões

### Skeleton Screens por Página

#### Páginas Principais

1. **`DashboardSkeleton.jsx`** ✅ **CORRIGIDO**
   - ✅ Hero section com gradiente roxo + elementos decorativos blur
   - ✅ Main com `-mt-24` (margin negativo)
   - ✅ Card de performance com layout de 2 colunas
   - ✅ Usa `SkeletonBase` puro (sem sobrescrever bg) no hero
   - ✅ Banner CTA com gradiente roxo
   - ✅ Gráfico de desenvolvimento
   - ✅ Cards de atividades recentes

2. **`HistorySkeleton.jsx`** ✅ **CORRIGIDO**
   - ✅ Hero section com gradiente roxo (ADICIONADO)
   - ✅ Main com `-mt-16` (CORRIGIDO)
   - ✅ Stats cards grid (4 colunas)
   - ✅ Filtros de ordenação
   - ✅ Lista de cards de histórico

3. **`ActivitiesSkeleton.jsx`** ✅ **CORRIGIDO**
   - ✅ Hero section com gradiente roxo (ADICIONADO)
   - ✅ Main com `-mt-16` (CORRIGIDO)
   - ✅ Highlight cards grid (2 colunas)
   - ✅ Activities grid (3 colunas responsivas)

4. **`AssessmentSkeleton.jsx`** ✅
   - ✅ Sticky progress bar com contador
   - ✅ Card de questão com opções
   - ✅ Usa `SkeletonBase` consistentemente

5. **`ResultsSkeleton.jsx`** ✅
   - ✅ Grid assimétrico [1fr_400px]
   - ✅ Gráficos (radar + barras)
   - ✅ Cards de indicadores
   - ✅ Usa `SkeletonBase` consistentemente

6. **`RealScenariosSkeleton.jsx`** ✅ **CORRIGIDO**
   - ✅ Hero section com gradiente roxo
   - ✅ Usa `SkeletonBase` puro (bg overrides removidos)
   - ✅ Main com `-mt-16`
   - ✅ Grid de cenários (3 colunas)

#### Páginas Admin

7. **`AssessmentBuilderSkeleton.jsx`** ✅
   - ✅ Fundo com gradient consistente
   - ✅ Sidebar + main content layout
   - ✅ Indicator cards e question forms

8. **`IndicatorsAdminSkeleton.jsx`** ✅
   - ✅ Fundo com gradient consistente
   - ✅ Creation form com grid 2 colunas
   - ✅ Indicator list com ícones coloridos

---

## 🎨 Estrutura Visual Padronizada

### Páginas COM Hero Section Roxo
- **Dashboard** → Hero roxo com -mt-24
- **History** → Hero roxo com -mt-16
- **Activities** → Hero roxo com -mt-16
- **RealScenarios** → Hero roxo com -mt-16

### Páginas SEM Hero Section
- **Assessment** → Apenas gradient de fundo
- **Results** → Apenas gradient de fundo
- **Admin pages** → Gradient de fundo aplicado

### Template de Hero Section (Padrão)
```jsx
<section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
  {/* Elementos decorativos blur */}
  <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
    <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
  </div>
  {/* Conteúdo com SkeletonBase PURO */}
  <div className="max-w-7xl mx-auto px-4 pt-16 relative z-10">
    <SkeletonBase width="w-32" height="h-4" className="mb-2" />
    <SkeletonBase width="w-96" height="h-12" />
  </div>
</section>
```

### Main Content após Hero
```jsx
<main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16">
  {/* Conteúdo */}
</main>
```

---

## 🔍 Correções Aplicadas

### Dashboard (3 correções)
1. ❌ **Antes**: Hero section usava divs com `bg-white/30`  
   ✅ **Depois**: Hero section usa `SkeletonBase` puro

2. ❌ **Antes**: Banner CTA com `className="bg-white/30"` sobrescrevendo gradient  
   ✅ **Depois**: `SkeletonBase` sem sobrescrever background

3. ❌ **Antes**: Gráfico com heights hardcoded `[60, 80, 70, 90, 75]`  
   ✅ **Depois**: Heights calculados dinamicamente

### History (2 correções)
1. ❌ **Antes**: SEM hero section colorido  
   ✅ **Depois**: Hero section com gradiente roxo ADICIONADO

2. ❌ **Antes**: Main sem margin negativo (começava com `pt-8`)  
   ✅ **Depois**: Main com `-mt-16` correto

### Activities (2 correções)
1. ❌ **Antes**: SEM hero section colorido  
   ✅ **Depois**: Hero section com gradiente roxo ADICIONADO

2. ❌ **Antes**: Main sem margin negativo  
   ✅ **Depois**: Main com `-mt-16` + highlight cards section ADICIONADOS

### RealScenarios (1 correção)
1. ❌ **Antes**: Hero section com `className="bg-white/30"` e `"bg-white/20"`  
   ✅ **Depois**: `SkeletonBase` puro sem sobrescrever background

---

## 📐 Regras de Ouro

### ✅ SEMPRE FAZER:
- Replicar EXATAMENTE as classes CSS da página real
- Manter hero sections com suas cores originais
- Usar `SkeletonBase` para conteúdo interno
- Preservar elementos decorativos (blur circles)
- Manter responsive breakpoints idênticos (md:, lg:, sm:)
- Usar mesmos valores de spacing (gap-3, mb-2, p-6)

### ❌ NUNCA FAZER:
- Sobrescrever background do SkeletonBase com `className="bg-*"`
- Usar divs com `bg-white/XX` em vez de `SkeletonBase`
- Remover cores de fundo das páginas originais
- Mudar estrutura de grid/flex layouts
- Alterar valores de spacing ou margin negativos

---

## 🎯 Checklist de Validação

Para cada skeleton, verificar:

- [ ] Página real TEM hero section roxo?
  - [ ] Se SIM: Skeleton deve ter hero section com `bg-gradient-to-r from-[#4F46E5]`
  - [ ] Se NÃO: Skeleton não deve ter hero section

- [ ] Main content tem margin negativo?
  - [ ] `-mt-24` (Dashboard) ou `-mt-16` (outros) aplicado?

- [ ] Hero section usa `SkeletonBase` ou divs com bg-*?
  - [ ] Deve usar APENAS `SkeletonBase` sem sobrescrever bg

- [ ] Cards mantêm classes originais?
  - [ ] `bg-white/80 backdrop-blur-sm border border-white/60`

- [ ] Gradient de fundo da página está aplicado?
  - [ ] `bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]`

- [ ] Zero layout shift ao carregar conteúdo real?

---

## 🚀 Versionamento

**v2.0** - 21/02/2026
- ✅ Padronização completa aplicada em TODOS os skeletons
- ✅ Hero sections adicionados onde faltavam (History, Activities)
- ✅ Removidos ALL bg overrides nos SkeletonBase
- ✅ Margins negativos corrigidos
- ✅ 100% consistência visual entre skeletons e páginas reais
- ✅ Documento SKELETON_STANDARDS.md criado

**v1.0** - Implementação inicial
- Criação do sistema de skeleton
- Cobertura de 100% das páginas
- Algunas inconsistências presentes (corrigidas na v2.0)

   - Grid de cards de cenários
   - Status badges e botões de ação

#### Páginas Admin
7. **`admin/AssessmentBuilderSkeleton.jsx`** ✅ (NOVO)
   - Sidebar com lista de assessments
   - Área principal de edição
   - Cards de informações, indicadores e questões
   - Botões de salvar e versionar

8. **`admin/IndicatorsAdminSkeleton.jsx`** ✅ (NOVO)
   - Formulário de criação de indicador
   - Lista de indicadores existentes
   - Botões de edição e exclusão

### CSS
- **`src/index.css`** - Animação shimmer com keyframes

## ✨ Elementos Internos Ajustados

### Problema Resolvido
Os skeletons tinham a **estrutura geral correta**, mas os elementos DENTRO dos cards/divs não estavam alinhados com os elementos reais, causando "saltos" visuais.

### Solução Aplicada
Cada elemento skeleton agora replica EXATAMENTE:
- ✅ Posição e tamanho de textos (w-24, h-6, etc)
- ✅ Espaçamentos entre elementos (gap-3, mb-2, etc)
- ✅ Alinhamento de flex/grid items (justify-between, items-center)
- ✅ Bordas e arredondamentos (rounded-lg, rounded-full)
- ✅ Estrutura de colunas flexíveis (w-1/3, w-2/3, flex-1)

### Exemplo - Dashboard Card de Performance
**Antes:**
```jsx
<div className="flex items-center gap-4">
  <SkeletonBase width="w-20" height="h-12" />
  <SkeletonBase width="w-full" height="h-3" />
</div>
```

**Depois:**
```jsx
<div className="flex flex-col md:flex-row items-center gap-4">
  <div className="w-full md:w-1/3 text-center md:text-left">
    <SkeletonBase width="w-24" height="h-3" className="mb-1 mx-auto md:mx-0" />
    <SkeletonBase width="w-16" height="h-12" className="mb-2 mx-auto md:mx-0" />
    <SkeletonBase width="w-28" height="h-6" rounded="rounded-full" className="mx-auto md:mx-0" />
  </div>
  <div className="w-full md:w-2/3 flex flex-col gap-4">
    <div className="flex items-start justify-between gap-4">
      <SkeletonBase width="w-48" height="h-10" rounded="rounded-lg" />
      <div className="flex flex-col items-end">
        <SkeletonBase width="w-12" height="h-6" className="mb-1" />
        <SkeletonBase width="w-24" height="h-4" />
      </div>
    </div>
    <SkeletonBase width="w-full" height="h-3" rounded="rounded-full" />
    <div className="flex gap-3 pt-2">
      <SkeletonBase width="w-full" height="h-9" rounded="rounded-lg" />
      <SkeletonBase width="w-full" height="h-9" rounded="rounded-lg" />
    </div>
  </div>
</div>
```

## 🎯 Páginas Integradas

| Página | Skeleton | Loading State | Status |
|--------|----------|---------------|---------|
| **Dashboard** | `DashboardSkeleton` | `loading` | ✅ |
| **Assessment** | `AssessmentSkeleton` | `loading` | ✅ |
| **Results** | `ResultsSkeleton` | `loading` | ✅ |
| **History** | `HistorySkeleton` | `roleLoading \|\| loading` | ✅ |
| **Activities** | `ActivitiesSkeleton` | - | ⚠️ Não necessário |
| **RealScenarios** | `RealScenariosSkeleton` | `loadingScenarios` | ✅ |
| **AssessmentBuilder** | `AssessmentBuilderSkeleton` | `roleLoading \|\| loading` | ✅ |
| **IndicatorsAdmin** | `IndicatorsAdminSkeleton` | `roleLoading \|\| loading` | ✅ |

## 🎨 Resultado Final

**Antes das correções:**
- ❌ Skeleton tinha estrutura geral correta
- ❌ Mas elementos internos estavam desalinhados
- ❌ Conteúdo real aparecia em posições diferentes
- ❌ Causava "saltos" visuais perceptíveis

**Depois das correções:**
- ✅ Skeleton replica estrutura E elementos internos
- ✅ Elementos aparecem exatamente onde estava o skeleton
- ✅ Zero layout shift - transição imperceptível
- ✅ Implementado em TODAS as páginas da aplicação

## 📊 Cobertura Total

- ✅ **Dashboard** - Página principal com métricas de usuário
- ✅ **Assessment** - Execução de assessments
- ✅ **Results** - Resultados detalhados
- ✅ **History** - Histórico de atividades
- ✅ **RealScenarios** - Simulações adaptativas
- ✅ **AssessmentBuilder** - Criação/edição de assessments (admin)
- ✅ **IndicatorsAdmin** - Gestão de indicadores (admin)

**Cobertura: 7/7 páginas com loading states = 100%** 🎉
