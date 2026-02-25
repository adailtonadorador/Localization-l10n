# Plano de Testes - Cadastro de Cliente pelo Admin

## Data de Implementação
2026-02-12

## Objetivo
Validar que o novo fluxo de cadastro de clientes pelo admin está funcionando corretamente e que o cadastro público foi removido.

---

## Cenários de Teste

### 1. Cadastro Público de Cliente Bloqueado ✓

#### 1.1 Landing Page
- [ ] Acessar página inicial (/)
- [ ] Verificar que NÃO existe botão "Sou Empresa" no hero
- [ ] Verificar que existe apenas botão "Cadastre-se como Trabalhador"
- [ ] Verificar seção "Para Empresas" mostra mensagem para entrar em contato
- [ ] Verificar CTA final tem botão "Sou Empresa - Falar com Consultor"

#### 1.2 Página de Registro
- [ ] Acessar /register
- [ ] Verificar que NÃO existem tabs de "Trabalhador" e "Empresa"
- [ ] Verificar que mostra apenas formulário de trabalhador
- [ ] Título deve ser "Criar Conta de Trabalhador"
- [ ] Tentar acessar /register?type=client
- [ ] Verificar que ignora o parâmetro e mostra apenas formulário de trabalhador

### 2. Acesso ao Cadastro de Cliente na Área Admin ✓

#### 2.1 Navegação
- [ ] Fazer login como admin
- [ ] Acessar /admin/clients
- [ ] Verificar que existe botão "Cadastrar Cliente" no header
- [ ] Clicar no botão
- [ ] Verificar redirecionamento para /admin/clients/new

#### 2.2 Interface da Página
- [ ] Verificar título "Cadastrar Novo Cliente"
- [ ] Verificar breadcrumb (Dashboard / Clientes / Novo Cliente)
- [ ] Verificar card informativo sobre credenciais
- [ ] Verificar botão de voltar (seta) no header
- [ ] Clicar no botão voltar, verificar retorno para /admin/clients

### 3. Formulário de Cadastro - Validações ✓

#### 3.1 Credenciais de Acesso
- [ ] Campo email aceita apenas emails válidos
- [ ] Campo senha exige mínimo 6 caracteres
- [ ] Campo confirmar senha valida igualdade com senha
- [ ] Tentar submeter com senhas diferentes - deve mostrar erro
- [ ] Tentar submeter com senha < 6 caracteres - deve mostrar erro

#### 3.2 Dados do Responsável
- [ ] Campo nome é obrigatório
- [ ] Campo telefone formata automaticamente (XX) XXXXX-XXXX
- [ ] Tentar submeter sem preencher - deve mostrar erro

#### 3.3 Dados da Empresa
- [ ] Campo CNPJ formata automaticamente XX.XXX.XXX/XXXX-XX
- [ ] Digitar CNPJ válido e verificar busca automática (spinner aparece)
- [ ] Verificar preenchimento automático de:
  - Razão Social
  - Nome Fantasia
  - Endereço (CEP, logradouro, número, bairro, cidade, UF)
  - Telefone (se disponível)
- [ ] Tentar CNPJ inválido - deve mostrar erro
- [ ] Campos razão social e nome fantasia são editáveis

#### 3.4 Endereço
- [ ] Campo CEP formata automaticamente XXXXX-XXX
- [ ] Digitar CEP válido e verificar busca automática (spinner aparece)
- [ ] Verificar preenchimento automático de logradouro, bairro, cidade, UF
- [ ] CEP inválido deve mostrar erro
- [ ] Todos os campos de endereço (exceto complemento) são obrigatórios
- [ ] Campo UF aceita apenas 2 caracteres maiúsculos

### 4. Cadastro Completo Bem-Sucedido ✓

#### 4.1 Criar Cliente
- [ ] Preencher todos os campos obrigatórios corretamente
- [ ] Email: teste-cliente-[timestamp]@teste.com
- [ ] Senha: senha123
- [ ] Nome: Cliente Teste
- [ ] Telefone: (11) 99999-9999
- [ ] CNPJ: buscar um CNPJ válido
- [ ] Clicar em "Criar Cliente"
- [ ] Verificar loading state (botão desabilitado com spinner)
- [ ] Aguardar criação
- [ ] Verificar redirecionamento para /admin/clients/[id]
- [ ] Verificar que cliente aparece na lista de clientes

#### 4.2 Cliente Consegue Fazer Login
- [ ] Fazer logout do admin
- [ ] Acessar /login
- [ ] Usar credenciais criadas pelo admin
- [ ] Verificar login bem-sucedido
- [ ] Cliente deve ser redirecionado para /complete-profile ou /client
- [ ] Verificar dados do cliente no perfil

### 5. Tratamento de Erros ✓

#### 5.1 Email Duplicado
- [ ] Tentar criar cliente com email já existente
- [ ] Verificar mensagem de erro "Este e-mail já está cadastrado"
- [ ] Formulário não deve ser limpo
- [ ] Usuário pode corrigir o email

#### 5.2 CNPJ Duplicado
- [ ] Tentar criar cliente com CNPJ já cadastrado
- [ ] Verificar mensagem de erro "Este CNPJ já está cadastrado"
- [ ] Formulário não deve ser limpo

#### 5.3 Validações de Campo
- [ ] Tentar submeter formulário vazio
- [ ] Verificar que campos obrigatórios são destacados
- [ ] Tentar submeter com dados incompletos
- [ ] Cada erro deve ter mensagem clara e específica

#### 5.4 Cancelamento
- [ ] Preencher formulário parcialmente
- [ ] Clicar em "Cancelar"
- [ ] Verificar retorno para /admin/clients
- [ ] Verificar que cliente NÃO foi criado

### 6. Responsividade e UX ✓

#### 6.1 Layout Desktop
- [ ] Verificar que formulário está bem organizado
- [ ] Campos alinhados corretamente
- [ ] Ícones visíveis e apropriados
- [ ] Espaçamento adequado

#### 6.2 Layout Mobile
- [ ] Acessar em dispositivo móvel ou modo responsivo
- [ ] Verificar que formulário é utilizável
- [ ] Botões acessíveis
- [ ] Campos não cortados

#### 6.3 Estados de Loading
- [ ] Loading ao buscar CNPJ
- [ ] Loading ao buscar CEP
- [ ] Loading ao criar cliente
- [ ] Botões desabilitados durante operações

### 7. Segurança e Permissões ✓

#### 7.1 Acesso Restrito
- [ ] Fazer logout
- [ ] Tentar acessar /admin/clients/new sem login
- [ ] Verificar redirecionamento para /login
- [ ] Fazer login como trabalhador
- [ ] Tentar acessar /admin/clients/new
- [ ] Verificar que acesso é negado
- [ ] Fazer login como cliente
- [ ] Tentar acessar /admin/clients/new
- [ ] Verificar que acesso é negado

#### 7.2 Dados Sensíveis
- [ ] Verificar que senhas não aparecem em logs do console
- [ ] Verificar que senhas não são expostas em URLs
- [ ] Verificar que dados são transmitidos de forma segura

---

## Bugs Encontrados

*Documentar aqui qualquer bug encontrado durante os testes*

### Bug #1
- **Descrição:**
- **Passos para reproduzir:**
- **Resultado esperado:**
- **Resultado atual:**
- **Prioridade:** (Alta/Média/Baixa)

---

## Observações e Melhorias Futuras

*Sugestões de melhorias ou observações importantes*

1. Considerar adicionar confirmação por email para o cliente
2. Considerar adicionar log de auditoria para criação de clientes
3. Considerar adicionar preview dos dados antes de submeter
4. Considerar enviar email automático ao cliente com as credenciais

---

## Conclusão

- [ ] Todos os testes passaram
- [ ] Bugs documentados e priorizados
- [ ] Funcionalidade aprovada para produção

**Testado por:** _________________
**Data:** _________________
**Aprovado por:** _________________
**Data:** _________________
