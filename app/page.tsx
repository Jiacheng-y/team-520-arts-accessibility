import type { Viewport } from 'next';
import Landing from '../components/landing';
export const viewport: Viewport = { width: 1200, themeColor: '#142820' };
export default function HomePage() { return <Landing />; }
