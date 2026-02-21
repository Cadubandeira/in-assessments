# 📋 Padrões de Skeleton Screens

## Princípios Fundamentais

### 1. **Manter TODAS as cores de fundo da página real**
- ✅ Hero sections com gradientes coloridos
- ✅ Fundos de página (gradient from-[#F5F3EC] to-[#EEF2FF])
- ✅ Cards com `bg-white/80 backdrop-blur-sm border border-white/60`
- ✅ Sections com cores específicas (roxo, azul, etc)

### 2. **Usar `SkeletonBase` APENAS para conteúdo interno**
- ✅ Textos que serão carregados
- ✅ Imagens que serão carregadas
- ✅ Dados dinâmicos (scores, nomes, datas)
- ❌ **NUNCA sobrescrever o background do SkeletonBase com `className="bg-white/XX"`**

### 3. **Elementos decorativos mantêm-se inalterados**
- ✅ Círculos blur de fundo
- ✅ Overlays com opacity
- ✅ Bordas e sombras

---

## ✅ Padrão Correto

```jsx
// Hero Section mantém cores originais
<section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-32">
  <div className="max-w-7xl mx-auto">
    {/* SkeletonBase PURO - sem sobrescrever bg */}
    <SkeletonBase width="w-32" height="h-4" className="mb-2" />
    <SkeletonBase width="w-96" height="h-12" />
  </div>
</section>

// Cards mantêm estrutura visual original
<div className="bg-white/80 backdrop-blur-sm border border-white/50 p-6 rounded-2xl">
  <SkeletonBase width="w-48" height="h-6" className="mb-4" />
  <SkeletonBase width="w-full" height="h-4" />
</div>

// Sections coloridas mantêm seu background
<div className="bg-gradient-to-r from-[#4F46E5] to-[#6366F1] p-6 rounded-xl">
  <SkeletonBase width="w-48" height="h-6" />
</div>
```

---

## ❌ Padrões INCORRETOS

```jsx
// ❌ NUNCA usar divs com bg-white em vez de SkeletonBase
<div className="h-4 w-32 bg-white/30 rounded"></div>  // ERRADO

// ❌ NUNCA sobrescrever o background do SkeletonBase
<SkeletonBase width="w-32" height="h-4" className="bg-white/30" />  // ERRADO

// ❌ NUNCA remover cores de fundo da página/sections
<div className="bg-gray-100">  // Se o original é colorido, manter colorido!
  <SkeletonBase />
</div>
```

---

## 🎨 Estrutura Visual Consistente

### Fundo da Página
```jsx
<div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
```

### Hero Sections (Dashboard, RealScenarios)
```jsx
<section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-32">
  {/* Elementos decorativos */}
  <div className="absolute inset-0 opacity-10 pointer-events-none">
    <div className="absolute top-20 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
  </div>
  {/* Conteúdo com SkeletonBase */}
  <div className="max-w-7xl mx-auto px-4 pt-16 relative z-10">
    <SkeletonBase width="w-32" height="h-4" className="mb-2" />
    <SkeletonBase width="w-96" height="h-12" />
  </div>
</section>
```

### Cards Brancos (padrão)
```jsx
<div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm">
  <SkeletonBase width="w-48" height="h-6" className="mb-4" />
  <SkeletonBase width="w-full" height="h-4" />
</div>
```

### Cards Coloridos
```jsx
<div className="bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-xl p-6">
  <SkeletonBase width="w-48" height="h-6" className="mb-2" />
  <SkeletonBase width="w-64" height="h-4" />
</div>
```

---

## 📐 Alinhamento e Espaçamento

### Use as MESMAS classes da página real
```jsx
// Se a página real tem:
<div className="flex items-center gap-4 mb-6">

// O skeleton deve ter EXATAMENTE:
<div className="flex items-center gap-4 mb-6">
  <SkeletonBase width="w-12" height="h-12" rounded="rounded-full" />
  <SkeletonBase width="w-48" height="h-6" />
</div>
```

### Responsive breakpoints IDÊNTICOS
```jsx
// Real:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Skeleton:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <SkeletonBase width="w-full" height="h-48" />
</div>
```

---

## 🔍 Checklist de Validação

Antes de criar/modificar um skeleton, verificar:

- [ ] Mantém o mesmo `className` de fundo da página original?
- [ ] Hero sections coloridas mantêm suas cores?
- [ ] Cards mantêm `bg-white/80`, bordas e sombras?
- [ ] `SkeletonBase` usado SEM `bg-` no className?
- [ ] Espaçamentos (gap, mb, p) IDÊNTICOS ao original?
- [ ] Grid/flex layouts com mesmas classes responsive?
- [ ] Elementos decorativos (blur circles) preservados?
- [ ] Zero layout shift ao transicionar para conteúdo real?

---

## 📦 Componentes Disponíveis

### SkeletonBase
Componente base - **NUNCA sobrescrever seu background**

```jsx
<SkeletonBase 
  width="w-full"      // Tailwind width class
  height="h-4"        // Tailwind height class
  rounded="rounded"   // Tailwind border-radius
  className="mb-2"    // APENAS spacing/positioning, NUNCA bg-
/>
```

### Propriedades Aceitas no className:
- ✅ Spacing: `mb-2`, `mt-4`, `mx-auto`, `gap-3`
- ✅ Positioning: `relative`, `absolute`
- ✅ Display: `flex`, `grid`, `block`
- ✅ Responsive: `md:mx-0`, `sm:w-32`
- ❌ Background: `bg-white`, `bg-gray-200` (nunca!)

---

## 🎯 Exemplo Completo: DashboardSkeleton

```jsx
const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
      {/* Hero Section - cores originais mantidas */}
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-32">
        <div className="max-w-7xl mx-auto px-4 pt-16">
          <SkeletonBase width="w-32" height="h-4" className="mb-2" />
          <SkeletonBase width="w-96" height="h-12" />
        </div>
      </section>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 -mt-24">
        {/* Card branco */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/50 p-8 rounded-2xl">
          <SkeletonBase width="w-48" height="h-6" className="mb-4" />
          <SkeletonBase width="w-full" height="h-4" />
        </div>
      </main>
    </div>
  );
};
```

---

## 🚀 Versionamento

**v1.0** - 21/02/2026
- Padronização inicial
- Definição de regras de uso do SkeletonBase
- Correção de inconsistências (bg-white overrides removidos)
