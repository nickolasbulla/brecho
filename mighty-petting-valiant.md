# Plano — App Brechó (Expo React Native + Supabase)

## Contexto
Aplicativo mobile de marketplace de roupas/itens usados (estilo Enjoei/Vinted), trabalho de faculdade.
Precisa rodar em iOS, Android e Web via Expo. Sem pagamento real.

---

## Tech Stack

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| Frontend | Expo SDK 51 + Expo Router v3 | File-based routing, web + mobile |
| Linguagem | TypeScript | Tipagem, menos bugs |
| Backend | Supabase | DB + Auth + Storage, zero servidor |
| UI | React Native Paper + custom | Componentes prontos + visual bonito |
| Fotos | expo-image-picker | Galeria + câmera |
| Ícones | @expo/vector-icons | Já vem no Expo |
| Gradientes | expo-linear-gradient | Visual brechó/colorido |
| Sessão | @react-native-async-storage | Persistência de login |

---

## Banco de Dados (Supabase PostgreSQL)

```sql
-- Perfis de usuário (espelha auth.users)
profiles (id, name, bio, avatar_url, location, created_at)

-- Categorias fixas
categories (id, name, icon_name)
-- Ex: Roupas, Calçados, Acessórios, Bolsas, Eletrônicos, Casa, Outros

-- Produtos anunciados
products (
  id, seller_id, title, description, price,
  category_id, condition,  -- 'Novo', 'Seminovo', 'Usado', 'Muito usado'
  images text[],           -- array de URLs do Storage
  status,                  -- 'available' | 'sold'
  created_at
)

-- Pedidos simulados (sem pagamento)
orders (id, buyer_id, product_id, created_at)

-- Favoritos
favorites (id, user_id, product_id, created_at)
```

**Storage:** bucket público `product-images` (até 5 fotos por anúncio)

**RLS (Row Level Security):** habilitado — usuário só edita/deleta os próprios dados

---

## Estrutura de Arquivos

```
brecho/
├── app/
│   ├── _layout.tsx              ← Root layout + AuthContext + Paper Provider
│   ├── index.tsx                ← Redirect (→ login ou home)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx            ← Tela de login
│   │   └── register.tsx         ← Tela de cadastro
│   └── (tabs)/
│       ├── _layout.tsx          ← Tab bar (Home, Buscar, Vender, Favoritos, Perfil)
│       ├── index.tsx            ← Feed de produtos (grid 2 colunas)
│       ├── search.tsx           ← Busca + filtros (categoria, preço, condição)
│       ├── sell.tsx             ← Formulário de novo anúncio
│       ├── favorites.tsx        ← Produtos favoritados
│       └── profile.tsx          ← Perfil + meus anúncios + minhas compras
├── app/product/[id].tsx         ← Detalhe do produto (carrossel, botão comprar)
├── components/
│   ├── ProductCard.tsx          ← Card do produto (grid)
│   ├── ProductCarousel.tsx      ← Carrossel de imagens
│   ├── CategoryChip.tsx         ← Chip de categoria
│   └── EmptyState.tsx           ← Estado vazio genérico
├── lib/
│   ├── supabase.ts              ← Cliente Supabase configurado
│   └── helpers.ts               ← Funções utilitárias (formatPrice, etc.)
├── hooks/
│   ├── useAuth.ts               ← Hook de autenticação
│   ├── useProducts.ts           ← Hook de produtos (feed, busca)
│   └── useProfile.ts            ← Hook de perfil
├── constants/
│   └── theme.ts                 ← Cores, fontes, espaçamentos
└── assets/
    └── images/                  ← Logo, splash, ícone
```

---

## Telas e Funcionalidades

### 1. Autenticação (`(auth)/`)
- Login com e-mail + senha (Supabase Auth)
- Cadastro com nome, e-mail, senha
- Redirecionamento automático se já logado
- Botão "entrar como convidado" (apenas leitura) — sem obrigatoriedade de cadastro para ver

### 2. Feed (`(tabs)/index.tsx`)
- Grid 2 colunas com scroll infinito
- Header com logo + ícone de carrinho/notificação
- Chips de categorias horizontais (filtro rápido)
- Pull-to-refresh
- ProductCard: foto, título, preço, condição, favorito ❤️

### 3. Busca (`(tabs)/search.tsx`)
- Campo de busca por texto (título)
- Filtros: Categoria, Condição, Faixa de preço (slider)
- Resultados em grid

### 4. Detalhe do Produto (`product/[id].tsx`)
- Carrossel de imagens (swipe)
- Preço em destaque, condição, descrição
- Info do vendedor (avatar, nome) → toque vai ao perfil
- Botões: ❤️ Favoritar | 🛒 Comprar
- "Comprar" abre modal de confirmação → salva em orders + marca produto como vendido

### 5. Vender (`(tabs)/sell.tsx`)
- Upload de até 5 fotos (galeria ou câmera)
- Título, Descrição, Preço, Categoria, Condição
- Validação de campos
- Submit → upload das imagens no Supabase Storage → insert em products

### 6. Favoritos (`(tabs)/favorites.tsx`)
- Lista de produtos favoritados pelo usuário
- Tap remove da lista, card redireciona ao produto

### 7. Perfil (`(tabs)/profile.tsx`)
- Avatar, nome, bio, cidade
- Botão editar perfil
- Tabs: "Meus Anúncios" | "Minhas Compras"
- Botão sair (logout)

---

## Design Visual
- **Paleta:** Rosa/lilás (#E91E8C primário) + branco + cinza claro — vibe brechó feminino/colorido
- **Cards** com sombra suave e bordas arredondadas
- **Tab bar** com ícones bem definidos
- **Tipografia:** Expo Google Fonts (Poppins)

---

## Ordem de Implementação

1. `npx create-expo-app` + instalar dependências
2. Configurar Supabase (criar projeto, tabelas, RLS, storage bucket)
3. `lib/supabase.ts` + `constants/theme.ts`
4. Auth screens (login/register) + `hooks/useAuth.ts`
5. Root layout com AuthContext e redirect
6. Tab layout + telas vazias
7. Feed + ProductCard + hook de produtos
8. Tela de detalhe + compra simulada
9. Tela de venda (form + upload de imagem)
10. Busca com filtros
11. Favoritos
12. Perfil + meus anúncios/compras
13. Polish visual (gradientes, animações, empty states)

---

## Verificação
- Testar no Expo Go (iOS/Android físico ou simulador)
- Testar na web com `npx expo start --web`
- Criar 2 contas: publicar produto com conta A, favoritar e "comprar" com conta B
- Checar que o produto aparece como "Vendido" após compra
