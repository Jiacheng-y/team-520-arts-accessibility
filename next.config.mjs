import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  trailingSlash: true,
  basePath: (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, ''),
  images: { unoptimized: true },
};
export default nextConfig;
