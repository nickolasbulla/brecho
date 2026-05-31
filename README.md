# 🛍️ Brechó App

Marketplace mobile de roupas e itens usados — Expo React Native + Supabase.

---

## ⚡ Setup rápido

### 1. Clone e instale

```bash
npm install
```

### 2. Configure o Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Vá em **SQL Editor** → Cole o conteúdo de `supabase-schema.sql` → Execute
3. Vá em **Storage** → **New bucket** → Nome: `product-images` → marque **Public bucket**
4. Adicione as policies de storage (veja o final do SQL)
5. Vá em **Project Settings** → **API** → copie a **URL** e **anon key**

### 3. Crie o arquivo `.env`

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```
EXPO_PUBLIC_SUPABASE_URL=https://SEUPROJETOID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 4. Rode o app

```bash
# No celular com Expo Go
npm start

# Web
npm run web

# Android (emulador)
npm run android
```

---

## 📱 Funcionalidades

| Tela | Descrição |
|------|-----------|
| **Login / Cadastro** | Autenticação via e-mail + senha |
| **Feed** | Grid de produtos com filtro por categoria |
| **Busca** | Busca por texto + filtro de condição |
| **Detalhe** | Carrossel de fotos, descrição, compra simulada |
| **Vender** | Upload de fotos, cadastro de anúncio |
| **Favoritos** | Produtos salvos pelo usuário |
| **Perfil** | Meus anúncios, minhas compras, editar perfil |

---

## 🗄️ Banco de dados

```
profiles     → dados do usuário
categories   → categorias de produto
products     → anúncios
orders       → compras simuladas
favorites    → produtos favoritos
```

---

## 🛠️ Tech Stack

- **Expo SDK 56** + **Expo Router**
- **Supabase** (PostgreSQL + Auth + Storage)
- **TypeScript**
- **@expo-google-fonts/poppins**
- **expo-image-picker**
- **expo-linear-gradient**
