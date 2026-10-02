import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Explicode - Estúdio de Vídeos de Código',
  description: 'Estúdio interativo para criar vídeos explicativos sobre código com narração sincronizada, digitação animada, foco e exportação.',
  openGraph: {
    title: 'Explicode - Estúdio de Vídeos de Código',
    description: 'Estúdio interativo para criar vídeos explicativos sobre código com narração sincronizada, digitação animada, foco e exportação.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explicode - Estúdio de Vídeos de Código',
    description: 'Estúdio interativo para criar vídeos explicativos sobre código com narração sincronizada, digitação animada, foco e exportação.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
