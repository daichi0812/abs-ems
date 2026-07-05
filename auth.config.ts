import bcrypt from "bcryptjs"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { LoginSchema } from "@/schemas";
import { getUserByEmail } from "@/data/user";
 
export default {
    providers: [
        Github({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        Credentials({
            async authorize(credentials){
                const validatedFields = LoginSchema.safeParse(credentials);

                if ( validatedFields.success ){
                    const { email, password } = validatedFields.data;

                    const user = await getUserByEmail ( email );
                    if ( !user || !user.password ) return null;
                    
                    //ログイン時に入力されたパスワードがデータベースのパスワと一致するか確認する
                    const passwordsMatch = await bcrypt.compare(
                        password,
                        user.password,
                    );

                    if ( passwordsMatch ) return user;
                }

                return null;
            }
        })
    ],
    // Cloudflare Workers(OpenNext) では Vercel が自動注入する VERCEL 環境変数が無く、
    // 本番ビルドは NODE_ENV=production のため Auth.js の trustHost 既定が false に落ち、
    // 全 sign-in/callback/session が UntrustedHost で失敗する（＝これまで Vercel が暗黙に
    // trustHost=true にしてくれていた隠れた Vercel 依存）。AUTH_TRUST_HOST 環境変数だけに
    // 頼ると本番 env を1つ落とすだけで認証全断するため、コードで明示的に true にして堅牢化する。
    // ここ（auth.config.ts）に置くことで、auth.ts のハンドラ用インスタンス（...authConfig 展開）と
    // middleware.ts の NextAuth(authConfig) インスタンスの両方に効かせる。
    trustHost: true,
} satisfies NextAuthConfig