# Documento de Entrega - Sama Conecta v1.0

**Data de Entrega:** 25 de Fevereiro de 2026
**Versão:** 1.0.0
**Projeto:** Plataforma Sama Conecta

---

## 1. Visão Geral

O **Sama Conecta** é uma plataforma web progressiva (PWA) que conecta trabalhadores temporários a empresas que precisam de mão de obra para diárias. O sistema permite o gerenciamento completo do ciclo de contratação, desde a publicação de vagas até o acompanhamento de trabalhos realizados.

---

## 2. Acesso à Plataforma

### URL de Produção
```
https://sama-conecta.vercel.app
```
*(Substituir pela URL real de produção)*

### Instalação como App (PWA)
A plataforma pode ser instalada como aplicativo no celular:
- **Android:** Ao acessar o site, toque em "Instalar" no popup ou acesse Menu > "Instalar aplicativo"
- **iOS:** Toque no ícone de compartilhar > "Adicionar à Tela de Início"

---

## 3. Perfis de Usuário

### 3.1 Administrador
Acesso completo ao sistema para gerenciamento da plataforma.

**Funcionalidades:**
- Dashboard com métricas gerais
- Gerenciamento de clientes (empresas)
- Gerenciamento de trabalhadores
- Aprovação/rejeição de cadastros de trabalhadores
- Criação de vagas em nome de clientes
- Monitoramento de check-in/check-out
- Gestão de desistências

### 3.2 Cliente (Empresa)
Empresas que publicam vagas e contratam trabalhadores.

**Funcionalidades:**
- Dashboard com resumo de vagas e trabalhadores
- Criação e gerenciamento de vagas
- Visualização de trabalhadores atribuídos às vagas
- Histórico de trabalhos realizados
- Visualização de localização das vagas no mapa

### 3.3 Trabalhador
Profissionais que buscam oportunidades de trabalho temporário.

**Funcionalidades:**
- Dashboard com vagas disponíveis e trabalhos agendados
- Busca e candidatura a vagas
- Visualização de detalhes das vagas com mapa
- Gerenciamento de trabalhos aceitos
- Possibilidade de desistência com justificativa
- Histórico de trabalhos realizados
- Perfil com habilidades e avaliações

---

## 4. Funcionalidades Implementadas

### 4.1 Autenticação e Cadastro
- [x] Login com email e senha
- [x] Cadastro de novos trabalhadores
- [x] Recuperação de senha
- [x] Fluxo de aprovação de trabalhadores pelo admin
- [x] Completar perfil após cadastro

### 4.2 Gestão de Vagas
- [x] Criação de vagas com múltiplas datas
- [x] Definição de habilidades requeridas
- [x] Número de vagas por trabalho
- [x] Valor da diária
- [x] Localização com visualização em mapa
- [x] Status da vaga (aberta, atribuída, concluída)

### 4.3 Candidatura e Atribuição
- [x] Trabalhador aceita vagas disponíveis
- [x] Verificação de conflito de horários
- [x] Atribuição automática ao aceitar
- [x] Desistência com registro de motivo
- [x] Histórico de desistências para admin

### 4.4 Monitoramento
- [x] Check-in e check-out de trabalhadores
- [x] Registro de presença por dia de trabalho
- [x] Painel de monitoramento para admin

### 4.5 Interface Mobile (PWA)
- [x] Design responsivo otimizado para celular
- [x] Instalação como aplicativo
- [x] Popup de instalação elegante
- [x] Navegação inferior para mobile
- [x] Cards de acesso rápido
- [x] Suporte offline básico

### 4.6 Mapas e Localização
- [x] Visualização do local da vaga no mapa
- [x] Integração com OpenStreetMap
- [x] Geocodificação de endereços

---

## 5. Tecnologias Utilizadas

| Tecnologia | Finalidade |
|------------|------------|
| React 19 | Framework frontend |
| TypeScript | Tipagem estática |
| Vite | Build e desenvolvimento |
| Tailwind CSS 4 | Estilização |
| Supabase | Backend (autenticação, banco de dados) |
| Leaflet | Mapas interativos |
| Lucide React | Ícones |
| PWA (Workbox) | Funcionalidade de app |

---

## 6. Estrutura de Páginas

### Administrador (`/admin`)
- `/admin` - Dashboard
- `/admin/clients` - Lista de clientes
- `/admin/clients/:id` - Detalhes do cliente
- `/admin/clients/new` - Novo cliente
- `/admin/workers` - Lista de trabalhadores
- `/admin/jobs/new` - Nova vaga
- `/admin/monitoring` - Monitoramento
- `/admin/withdrawals` - Desistências

### Cliente (`/client`)
- `/client` - Dashboard
- `/client/jobs` - Minhas vagas
- `/client/jobs/new` - Nova vaga
- `/client/workers` - Trabalhadores
- `/client/history` - Histórico

### Trabalhador (`/worker`)
- `/worker` - Dashboard
- `/worker/jobs` - Vagas disponíveis
- `/worker/my-jobs` - Meus trabalhos
- `/worker/history` - Histórico
- `/worker/profile` - Meu perfil

---

## 7. Banco de Dados

O sistema utiliza **Supabase** como backend, com as seguintes tabelas principais:

- `users` - Usuários do sistema
- `workers` - Perfil de trabalhadores
- `clients` - Perfil de empresas
- `jobs` - Vagas publicadas
- `job_applications` - Candidaturas
- `job_assignments` - Atribuições de trabalhadores
- `work_records` - Registros de trabalho (check-in/out)
- `withdrawal_history` - Histórico de desistências

---

## 8. Próximos Passos (Sugestões para v2.0)

- [ ] Notificações push
- [ ] Chat entre cliente e trabalhador
- [ ] Avaliação de trabalhadores pelos clientes
- [ ] Relatórios e exportação de dados
- [ ] Pagamentos integrados
- [ ] Geolocalização para check-in
- [ ] Filtros avançados de busca de vagas

---

## 9. Suporte

Para dúvidas ou suporte técnico:
- **Email:** suporte@samaconecta.com.br
- **Telefone:** (XX) XXXXX-XXXX

---

## 10. Considerações Finais

Esta é a primeira versão funcional da plataforma Sama Conecta. O sistema está preparado para uso em produção, com todas as funcionalidades essenciais para o gerenciamento de trabalhadores temporários.

Recomenda-se realizar testes com usuários reais antes do lançamento oficial para identificar possíveis ajustes de usabilidade.

---

**Desenvolvido por:** [Seu Nome/Empresa]
**Data:** Fevereiro de 2026

---

*Este documento é confidencial e destinado exclusivamente ao cliente contratante.*
