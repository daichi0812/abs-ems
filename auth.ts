import NextAuth from "next-auth"
import { UserRole } from "@prisma/client"
import { PrismaAdapter } from "@auth/prisma-adapter"

import { db } from "@/lib/db"
import authConfig from "@/auth.config"
import { getUserById } from "@/data/user"
import { getTwoFactorConfirmationByUserId } from "@/data/two-factor-confirmation"
import { refreshJwtToken } from "@/lib/jwt-refresh"

export const {
  auth,
  handlers,
  signIn,
  signOut,
} = NextAuth({
  /* OAuthでログインに失敗した時にデフォルトのエラーページに飛ばない様にする pages: */
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  /* GoogleやGithubで登録した際に emailVerified を真(date)にする event: */
  events: {
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      })
    }
  },

  callbacks: {
    async signIn({ user, account }) {
      // Allow OAuth without email verification
      if (account?.provider !== "credentials") return true;

      // このif文はGPTから引っ張ってきたやつだから注意
      if (!user || !user.id) {
        return false; // user オブジェクトまたは id が存在しない場合はサインインを拒否
      }

      const existingUser = await getUserById(user.id);

      // Prevbent sign in without email verification
      if (!existingUser?.emailVerified) return false;

      if (existingUser.isTwoFactorEnabled) {
        const twoFactorConfirmation = await getTwoFactorConfirmationByUserId(existingUser.id);

        // console.log({
        //   twoFactorConfirmation
        // })

        if(!twoFactorConfirmation) return false;

        // Delete two factor confirmation for next sign in
        // これでログインするたび2段階認証が必要になる
        // したければexpiresを自分で設定して
        await db.twoFactorConfirmation.delete({
          where: { id: twoFactorConfirmation.id }
        });
      }

      return true;

    },
    async session({ token, session }) {
      /* トークンにユーザーID（token.sub）が存在し、セッションのユーザーオブジェクトが存在する場合 */
      if (token.sub && session.user) {
        /* トークンのユーザーIDをセッションのユーザーIDに設定 */
        session.user.id = token.sub;
      }

      /* 必要に応じてカスタムフィールドをセッションに追加することが可能 */
      //session.user.customField = "anythig"

      /* トークンにユーザーのロール情報（token.role）が存在し、セッションのユーザーオブジェクトが存在する場合 */
      if (token.role && session.user) {
        /* トークンのロールをセッションのユーザーロールに設定 */
        session.user.role = token.role as UserRole;
      }

       /* セッションのユーザーオブジェクトが存在する場合 */
       if (session.user) {
        /* トークンの2FAをセッションの2FAに設定 */
        session.user.isTwoFactorEnabled = token.isTwoFactorEnabled as boolean;
      }

      if(session.user){
        session.user.name = token.name;
        session.user.email = token.email as string;
        session.user.isOAuth = token.isOAuth as boolean;
      }

      /* 更新されたセッションを返す */
      return session;
    },
    async jwt({ token, user, trigger }) {
      // 方針とテストは lib/jwt-refresh.ts を参照（通常リクエストは DB フリー、
      // サインイン・update({})・15分経過時のみ user/account を再照会する）。
      return refreshJwtToken({ token, user, trigger });
    }
  },
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  // trustHost: true は auth.config.ts に集約（ハンドラ用と middleware 用の両インスタンスに効かせるため）。
  ...authConfig,
})