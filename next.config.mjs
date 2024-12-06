/** @type {import('next').NextConfig} */
import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // ↓開発中は以下のコメントを外す
  // disable: process.env.NODE_ENV === "development",
});

const nextConfig = withPWA({
  images: {
    domains: ['a9imy1jqjrudia3w.public.blob.vercel-storage.com', 'www.paypalobjects.com'],
  }
});

export default nextConfig;
