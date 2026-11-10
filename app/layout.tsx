import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../src/style.css';

export const metadata: Metadata = {
  title: 'Beyond the Frame — The painting is the clue.',
  description: 'A museum experience designed to turn close looking into discovery. Join the museum pilot waitlist.',
  icons: { icon: `${(process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '')}/favicon.svg` },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
