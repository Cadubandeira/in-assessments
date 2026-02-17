# Componentes Mobile

Esta pasta contém componentes exclusivos para visualização mobile (telas < 768px).

## Componentes Disponíveis

### Header.jsx
Header fixo no topo da tela mobile contendo:
- Logo da aplicação (esquerda)
- Avatar do usuário com inicial (direita)
- Menu dropdown com opção de logout

**Props:**
- `user` (object, required): Objeto do usuário autenticado do Supabase

**Uso:**
```jsx
import MobileHeader from '../components/mobile/Header';

<MobileHeader user={user} />
```

### BottomNav.jsx
Barra de navegação fixa no rodapé da tela mobile com 4 seções:
- Home (Dashboard)
- Iniciar (Assessment)
- Histórico
- Perfil

**Props:**
- `onStartAssessment` (function, required): Callback para iniciar novo assessment

**Uso:**
```jsx
import MobileBottomNav from '../components/mobile/BottomNav';

<MobileBottomNav onStartAssessment={handleStart} />
```

## Responsividade

Todos os componentes desta pasta utilizam a classe `md:hidden` do Tailwind para serem exibidos apenas em telas menores que 768px.

Para componentes desktop, utilize a pasta `components/desktop/` (se existir).
Para componentes compartilhados entre mobile e desktop, mantenha na pasta raiz `components/`.
