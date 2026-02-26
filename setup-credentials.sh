#!/bin/bash
# =============================================================================
# Setup de Credenciais - plataforma-sama
# Conta: adailtonadorador
# =============================================================================

echo "Configurando credenciais para plataforma-sama (conta: adailtonadorador)..."

# -----------------------------------------------------------------------------
# GIT - Configuração local
# -----------------------------------------------------------------------------
echo ""
echo "[Git] Configurando user.name e user.email locais..."
git config --local user.name "adailtonadorador"
git config --local user.email "adailtonadorador@gmail.com"
git remote set-url origin https://adailtonadorador@github.com/adailtonadorador/Localization-l10n.git

echo "[Git] Configurado:"
git config --local user.name
git config --local user.email
git remote -v

# -----------------------------------------------------------------------------
# VERCEL - Requer login manual
# -----------------------------------------------------------------------------
echo ""
echo "[Vercel] Para configurar a Vercel:"
echo "  1. vercel logout"
echo "  2. vercel login  (use a conta adailtonadorador)"
echo "  3. vercel link   (selecione o projeto plat-sama)"
echo ""
read -p "Deseja fazer login na Vercel agora? (s/n): " vercel_login
if [ "$vercel_login" = "s" ]; then
    vercel logout 2>/dev/null
    vercel login
    vercel link
fi

# -----------------------------------------------------------------------------
# SUPABASE - Requer login manual
# -----------------------------------------------------------------------------
SUPABASE_PROJECT_REF="axznhbmdaqhpjpkvrghq"

echo ""
echo "[Supabase] Para configurar o Supabase CLI:"
echo "  1. supabase logout"
echo "  2. supabase login  (use a conta adailtonadorador)"
echo "  3. supabase link --project-ref $SUPABASE_PROJECT_REF"
echo ""
read -p "Deseja fazer login no Supabase agora? (s/n): " supabase_login
if [ "$supabase_login" = "s" ]; then
    echo "y" | supabase logout 2>/dev/null
    supabase login
    echo ""
    echo "[Supabase] Vinculando ao projeto Plataforma Sama..."
    supabase link --project-ref "$SUPABASE_PROJECT_REF"
fi

echo ""
echo "============================================================================="
echo "Setup concluido!"
echo "============================================================================="
echo ""
echo "Credenciais configuradas para: adailtonadorador"
echo ""
