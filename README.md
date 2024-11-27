
# Next Auth プロジェクト

このプロジェクトは **Next.js** を使用して構築された Web アプリケーションであり、認証、ユーザー管理、およびモダンなライブラリやフレームワークを活用した UI/UX に焦点を当てています。

## 特徴

- [NextAuth.js](https://next-auth.js.org/) を使用したユーザー認証とセッション管理
- Prisma を使用したデータベース管理
- Chakra UI と Radix UI によるカスタマイズ可能でアクセシブルな UI
- FullCalendar を使用したカレンダー機能とスケジュール管理
- アニメーション対応の Tailwind CSS を使用したスタイリング
- TypeScript による型安全な開発環境
- React Hook Form と Zod を使用したフォーム管理とスキーマバリデーション

## 技術スタック

### コア
- **[Next.js](https://nextjs.org/):** サーバーサイドレンダリングと静的サイト生成に対応した React ベースのフレームワーク
- **[React](https://reactjs.org/):** ユーザーインターフェイスを構築するためのフロントエンドライブラリ
- **[TypeScript](https://www.typescriptlang.org/):** 開発体験を向上させる型付き JavaScript

### 認証
- **[NextAuth.js](https://next-auth.js.org/):** 柔軟で安全な認証ソリューション
- **[Prisma](https://www.prisma.io/):** データベース統合とスキーマ管理のための ORM

### UI/UX
- **[Chakra UI](https://chakra-ui.com/):** モジュール型でカスタマイズ可能な UI コンポーネントライブラリ
- **[Radix UI](https://www.radix-ui.com/):** アクセシブルなデザインを構築するための非スタイル化 UI コンポーネント
- **[FullCalendar](https://fullcalendar.io/):** インタラクティブなカレンダーライブラリ
- **[Tailwind CSS](https://tailwindcss.com/):** ユーティリティファーストの CSS フレームワーク

### ユーティリティ
- **[React Hook Form](https://react-hook-form.com/):** 簡素化されたフォームバリデーションと管理
- **[Zod](https://zod.dev/):** TypeScript 初のスキーマバリデーション
- **[Axios](https://axios-http.com/):** Promise ベースの HTTP クライアント
- **[Moment Timezone](https://momentjs.com/timezone/):** 日時管理のためのタイムゾーンサポート
- **[UUID](https://www.npmjs.com/package/uuid):** ユニバーサル一意識別子の生成

### アニメーション
- **[Framer Motion](https://www.framer.com/motion/):** React 用アニメーションライブラリ
- **[tailwindcss-animate](https://github.com/tailwindlabs/tailwindcss-animate):** Tailwind CSS 用アニメーションユーティリティ

## 開発セットアップ

### 必要条件

- Node.js >= 18
- npm または yarn
- データベース (Prisma 用に PostgreSQL、MySQL、または SQLite を推奨)

### インストール手順

1. リポジトリをクローン:
   ```bash
   git clone https://github.com/your-repo/next-auth.git
   cd next-auth
   ```

2. 依存関係をインストール:
   ```bash
   npm install
   ```

3. 環境変数を設定:
   `.env` ファイルを作成し、必要な変数 (例: データベース接続、NextAuth 設定) を記述してください。

4. データベースをセットアップ:
   ```bash
   npx prisma migrate dev
   ```

5. 開発サーバーを起動:
   ```bash
   npm run dev
   ```

6. ブラウザでアプリケーションを開く:
   ```
   http://localhost:3000
   ```

### スクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - プロダクション用にアプリケーションをビルド
- `npm run start` - プロダクションサーバーを起動
- `npm run lint` - コード品質チェックのために ESLint を実行
- `npm run postinstall` - 依存関係インストール後に Prisma クライアントを生成

## ライセンス

このプロジェクトは MIT ライセンスの下で提供されています。詳細は [LICENSE](LICENSE) ファイルをご確認ください。