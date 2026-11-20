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
