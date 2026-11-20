# Liderapp — Gestão de Métricas e Metas

Painel SaaS da agência. **Next.js 15, React 19, Recharts, Supabase e Vercel**.

## Funcionalidades
- Interface responsiva com tema escuro, indicadores de contratos, implantação, MRR e ARR.
- Metas mensais e resultados editáveis e persistidos por usuário.
- Funil comercial, histórico de receitas e evolução do MRR com dados efetivamente cadastrados.
- Login obrigatório antes de exibir o dashboard, utilizando Supabase Auth.
- Ações do mês com conclusão persistida.
- Nenhum registro é ilustrativo ou pré-carregado. Novas contas começam com métricas vazias, que aparecem somente depois de salvar dados reais.
- As metas começam sem configuração e podem ser criadas e editadas após o login.

## Desenvolver
1. Copie `.env.example` para `.env.local` e adicione **somente a chave publicável** do Supabase.
2. `npm install` e `npm run dev`.
3. No Supabase, aplique a migração em `supabase/migrations/20261120_init_dashboard.sql`.
4. Ative cadastro via e-mail em Supabase Authentication. Se exigir confirmação de e-mail, confirme o link recebido antes de entrar.

## Segurança
Todas as tabelas têm Row Level Security habilitado e políticas por `auth.uid()`. Não use service role no frontend.
Dados de funil, comparativos e projeções são exibidos apenas com registros suficientes.

## CRM — Funil, clientes e atividades

- **Comercial**: pipeline por etapas configuráveis, oportunidades arrastáveis (HTML5 Drag and Drop), pesquisa, próximos compromissos, status aberto/ganho/perdido, valores de implantação e mensalidade e histórico.
- **Clientes**: pessoas e empresas vinculadas a negócios e atividades; pesquisa, edição e painel de relacionamento.
- **Atividades**: agenda centralizada com ligações, reuniões, tarefas, e-mails, follow-ups e prazos; lista/semana, pesquisa e filtros de pendentes, atrasadas, hoje, concluídas.
- **Metas e métricas**: consulta `crm_monthly_wins` (view PostgreSQL com `security_invoker` + RLS) para somar negócios marcados como **ganhos**, agrupados pelo mês do fechamento no horário de São Paulo. As métricas atualizam ao mudar o negócio e também quando a aba é aberta.
- Para não duplicar vendas, o formulário de resultados mensais inclui **somente valores adicionais fora do CRM**. Não digite novamente no formulário um negócio registrado no funil.
- Ao reabrir um negócio ganho ou marcar perdido, ele deixa de contar como ganho no painel. Alterar valores de negócios ganhos também atualiza os totais automaticamente pela view.
- O cadastro de etapas padrão é feito apenas como configuração inicial da conta; nenhuma oportunidade, contato ou atividade fictícia é criada.
- Banco: `supabase/migrations/20261120_create_crm.sql`, aplicado ao projeto Supabase existente.
- O calendário, o funil e o cadastro já operam sem integrações externas de e-mail/Google Calendar. Sincronização e automações serão etapas opcionais.
