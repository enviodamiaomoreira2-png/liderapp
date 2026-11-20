# Liderapp — Gestão de Métricas e Metas

Painel SaaS da agência. **Next.js 15, React 19, Recharts, Supabase e Vercel**.

## Funcionalidades
- Interface responsiva com tema escuro, indicadores de contratos, implantação, MRR e ARR.
- Metas mensais e resultados editáveis e persistidos por usuário.
- Funil comercial, histórico de receitas e evolução do MRR; só apresenta números efetivamente cadastrados.
- Autenticação de e-mail e senha pelo Supabase Auth.
- Ações do mês com conclusão persistida.
- Estado de prévia com os **14 contratos, R$ 14.000 de implantação e R$ 4.200 de novo MRR** relatados pelo proprietário, identificados como ainda não gravados no banco; clique em "Salvar dados informados" para persistir na conta.
- Meta inicial ilustrativa de 20 contratos, R$ 20.000 e R$ 6.000; editável.

## Desenvolver
1. Copie `.env.example` para `.env.local` e adicione **somente a chave publicável** do Supabase.
2. `npm install` e `npm run dev`.
3. No Supabase, aplique a migração em `supabase/migrations/20261120_init_dashboard.sql`.
4. Ative cadastro via e-mail em Supabase Authentication. Se exigir confirmação de e-mail, confirme o link recebido antes de entrar.

## Segurança
Todas as tabelas têm Row Level Security habilitado e políticas por `auth.uid()`. Não use service role no frontend.
Dados de funil, comparativos e projeções são exibidos apenas com registros suficientes.
