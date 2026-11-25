import type { Metadata } from 'next';
import './globals.css';
import '../components/crm/crm.css';
import '../components/financeiro.css';
import '../components/entrega.css';
export const metadata:Metadata={title:'Liderapp | CRM, Entrega, Financeiro e Metas',description:'Painel de performance comercial e metas da agência'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
