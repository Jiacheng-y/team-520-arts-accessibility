import type { Viewport } from 'next';
import Landing from '../../../../components/landing';
export const viewport: Viewport = { width: 1200, themeColor: '#142820' };
export const dynamicParams = false;
export function generateStaticParams() {
  return ['mobile', 'device'].flatMap(concept => ['inquiry', 'pilot'].map(offer => ({concept, offer})));
}
export default function MuseumLandingPage() { return <Landing />; }
