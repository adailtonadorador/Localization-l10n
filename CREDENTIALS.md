# Credenciais do Projeto

Este projeto utiliza a conta **adailtonadorador**.

## Serviços e Contas

| Serviço  | Conta/Username      | Email                      | Project Ref              |
|----------|---------------------|----------------------------|--------------------------|
| GitHub   | adailtonadorador    | adailtonadorador@gmail.com | -                        |
| Vercel   | adailtonadorador    | adailtonadorador@gmail.com | plataforma-sama          |
| Supabase | adailtonadorador    | adailtonadorador@gmail.com | axznhbmdaqhpjpkvrghq     |

## Setup Rápido

Se você trocou de projeto e precisa reconfigurar as credenciais:

```bash
# No Git Bash ou terminal Linux/Mac
./setup-credentials.sh

# No Windows (PowerShell)
bash setup-credentials.sh
```

## Configuração Manual

### Git
```bash
git config --local user.name "adailtonadorador"
git config --local user.email "adailtonadorador@gmail.com"
```

### Vercel
```bash
vercel logout
vercel login
vercel link
```

### Supabase
```bash
supabase logout
supabase login
supabase link --project-ref axznhbmdaqhpjpkvrghq
```

## Verificar Configuração Atual

```bash
# Git
git config --local user.name
git config --local user.email
git remote -v

# Vercel
vercel whoami

# Supabase
supabase projects list
```
