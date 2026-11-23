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

## Financeiro — cobranças e MRR recebido

- A aba **Financeiro** apresenta cobranças mensais por negócio, com filtros Pendente, Atrasado, Parcial e Pago, pesquisa, vencimento e mês de referência.
- Para cada negócio ganho, configure no Financeiro **valor da mensalidade**, **dia de vencimento (1 a 28)** e **mês de início da cobrança**. Nenhum desses valores é presumido; os negócios históricos continuam preservados.
- **Gerar cobranças** registra as previsões para o mês selecionado, de modo idempotente. Cobranças não são consideradas pagamentos recebidos.
- **Confirmar recebimento** grava pagamento no livro financeiro crm_recurring_payments, também utilizado pelo Comercial. Pagamento inferior à cobrança resulta em Parcial ou Atrasado (parcial), conforme o vencimento.
- **MRR contratado** = base mensal informada nos negócios ganhos (previsão contratual; não caixa).
- **Mensalidades previstas** = valor de cobranças com vencimento no período escolhido.
- **MRR recebido** = soma de mensalidades efetivamente pagas no período de pagamento; não soma contratos ainda não recebidos.
- **Novo MRR recebido** = valores dos primeiros pagamentos de cada negócio, alocados à data em que entrou o primeiro pagamento. Meses posteriores do mesmo negócio não são contados como novo MRR.
- **Faturamento total** = setups ganhos + mensalidades confirmadas como pagas no período; o cálculo dos setups segue a regra da agência e não comprova a quitação bancária.
- As metas de novo MRR se referem ao novo MRR recebido. Não existem mais lançamentos manuais de novo MRR para evitar duplicações.
- Pagamentos após o vencimento aparecem no período em que o dinheiro entrou, preservando a cobrança no mês de referência original.
- **Importante:** geração de cobranças atualmente é feita por **Gerar cobranças**, sem job periódico no servidor nem integração bancária.
- SQL: supabase/migrations/20261123_recurring_charges_and_billing_terms.sql, com RLS por proprietário.
