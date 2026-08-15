# Fix do Login com Google (Supabase Auth)

## Problema

Ao clicar em "Continuar com Google", após escolher a conta, o browser é redirecionado para `http://localhost:8080` (em vez do dashboard) e aparece um erro.

## Causa raiz

- O **Site URL** do projeto Supabase é `http://localhost:8080`.
- O dev server está a correr em `http://localhost:8081` (`npm run web`).
- O app redireciona o OAuth para `window.location.origin` = `http://localhost:8081`.
- A **allowlist de Redirect URLs** do Supabase não inclui `http://localhost:8081`.
- O Supabase só valida o `redirect_to` no **callback** — ou seja, *depois* de escolher a conta Google.
- A validação falha → o Supabase cai no Site URL (`http://localhost:8080`), onde não há nada a correr → erro.

## Passos para corrigir (Dashboard Supabase)

Abrir o projeto em: <https://supabase.com/dashboard/project/zwxplzdadgtiohnuotlu>

Vai a **Authentication → URL Configuration**:

### 1. Site URL

Alterar para a porta que o dev server usa normalmente:

```
http://localhost:8081
```

> Se preferires continuar a usar a porta 8080, mantém o Site URL em
> `http://localhost:8080` e corre sempre o dev server com `npx expo start --web --port 8080`.

### 2. Redirect URLs

Adicionar os seguintes (wildcards são suportados — `*` corresponde a qualquer porta):

```
http://localhost:*
http://127.0.0.1:*
```

Adicionar também a URL de produção, se existir, ex.:

```
https://teu-dominio.vercel.app/**
```

### 3. Guardar

Clicar em **Save**.

## Verificação

Depois de guardar:

```powershell
npm run web
```

Abrir `http://localhost:8081` → **Continuar com Google** → escolher conta → deve entrar
direto no dashboard (já sem a tela de 2,5s do splash).

## Notas

- A partir de agora, qualquer porta local (`8080`, `8081`, `3000`, ...) funciona, graças ao wildcard.
- O app já mostra a mensagem de erro do OAuth no ecrã de login (em vez de ficar escondida),
  o que ajuda a diagnosticar falhas no callback.
