/** @type {import('next').NextConfig} */
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // ↓開発中にservice workerを無効にする場合は以下のコメントを外す
  // disable: process.env.NODE_ENV === "development",

  // precache は「アプリの起動に必要な最小限」に絞る。
  // 以前はデフォルト（public/ 全部 + 全ビルド資産）で約19MBを全端末に先読みさせていた:
  // README用画像 5.8MB / manifest用スクリーンショット 5.8MB / フォント全サブセット約5MB。
  // フォントは defaultCache の static-font-assets（実際に使う数個だけ）で十分。
  globPublicPatterns: [
    'manifest.json',
    'favicon.ico',
    'ABS-EMS512_maskable.png',
    'ABS-EMS512_rounded.png',
    'ABS-EMS-Icon.webp',
    'logicode.jpeg',
  ],
  // 先頭2つは serwist のデフォルト exclude（上書きするため明示的に残す）
  exclude: [/\.map$/, /^manifest.*\.js$/, /\.woff2$/],
});

const nextConfig = withSerwist({
  // Prisma Client を workerd 向けにバンドルせず外部化する（OpenNext/Cloudflare 要件）
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  experimental: {
    // 重量級パッケージのバレルインポートをツリーシェイクし、クライアントバンドルを削減する
    optimizePackageImports: [
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
