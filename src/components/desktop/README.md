# Componentes Desktop

Esta pasta contém componentes exclusivos para visualização desktop (telas >= 768px).

## Organização

Componentes nesta pasta devem utilizar classes do Tailwind como `hidden md:block` ou `hidden md:flex` para serem exibidos apenas em telas maiores.

## Componentes Disponíveis

*Nenhum componente desktop exclusivo criado ainda.*

## Quando usar cada pasta

- **`components/mobile/`**: Componentes que aparecem APENAS em mobile (< 768px)
  - Exemplo: Header mobile, Bottom navigation bar
  
- **`components/desktop/`**: Componentes que aparecem APENAS em desktop (>= 768px)
  - Exemplo: Sidebar fixa, Header desktop expandido
  
- **`components/`** (raiz): Componentes compartilhados ou adaptativos
  - Exemplo: Logo, Buttons, Cards que se adaptam responsivamente
