import type { Metadata, Viewport } from 'next';
import Dashboard from '../../components/dashboard';
import '../../src/dashboard.css';
export const metadata: Metadata = { title: 'Research dashboard · Beyond the Frame', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
export default function DashboardPage() { return <Dashboard />; }
