import type { Metadata } from 'next';
import './globals.css';
import '../components/crm/crm.css';
export const metadata:Metadata={title:'Liderapp | CRM, Atividades e Metas',description:'Painel de performance comercial e metas da agência'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
