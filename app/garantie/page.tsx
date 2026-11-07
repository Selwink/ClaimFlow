import type { Metadata } from 'next';
import { GarantieApp } from '@/components/garantie/garantie-app';

export const metadata: Metadata = {
  title: 'Garantie – al je garanties en bonnen op één plek',
  description:
    'Houd garanties, kassabonnen en garantieclaims bij en krijg een seintje voordat je garantie verloopt.',
  manifest: '/garantie.webmanifest',
};

export default function GarantiePage() {
  return <GarantieApp />;
}
