/** @type {import('next').NextConfig} */
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // ↓開発中にservice workerを無効にする場合は以下のコメントを外す
  // disable: process.env.NODE_ENV === "development",
});

const nextConfig = withSerwist({
  images: {
    domains: ['a9imy1jqjrudia3w.public.blob.vercel-storage.com', 'www.paypalobjects.com'],
  }
});

export default nextConfig;
