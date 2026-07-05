/** @type {import('next').NextConfig} */
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // ↓開発中にservice workerを無効にする場合は以下のコメントを外す
  // disable: process.env.NODE_ENV === "development",
});

const nextConfig = withSerwist({
  // Prisma Client を workerd 向けにバンドルせず外部化する（OpenNext/Cloudflare 要件）
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  experimental: {
    // 重量級パッケージのバレルインポートをツリーシェイクし、クライアントバンドルを削減する
    optimizePackageImports: [
      '@chakra-ui/react',
      'react-icons',
      '@heroicons/react',
      '@radix-ui/react-icons',
    ],
  },
  images: {
    // R2 移行期は旧 Vercel Blob ホストと新 R2 カスタムドメインが混在するため、
    // ホスト allowlist（remotePatterns）を張らずに済む unoptimized で開始する。
    // 機材画像の利用は next/image 2箇所のみ（reserve / store）。
    // 画像最適化を Cloudflare 側で有効化するなら後日 remotePatterns へ移行する。
    unoptimized: true,
  }
});

export default nextConfig;
