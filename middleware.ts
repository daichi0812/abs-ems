import authConfig from "./auth.config"
import NextAuth from "next-auth"
import {
    DEFAULT_LOGIN_REDIRECT,
    apiAuthPrefix,
    authRoutes,
    publicRoutes,
} from "@/routes"

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    // req.auth
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    // console.log("ROUTE: ", req.nextUrl.pathname);
    // console.log("IS LOGGEDIN: ", isLoggedIn);

    const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
    const ispublicRoute = publicRoutes.includes(nextUrl.pathname);
    const isAuthRoute = authRoutes.includes(nextUrl.pathname);

    if (isApiAuthRoute) {
        return undefined;   // 動画だとnullで返してた。
    }

    if (isAuthRoute) {
        if (isLoggedIn) {
            return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
        }
        return undefined;   // 動画だとnullで返してた
    }

    if (!isLoggedIn && !ispublicRoute) {
        let callbackUrl = nextUrl.pathname;
        if (nextUrl.search) {
            callbackUrl += nextUrl.search;
        }

        const encodedCallbackUrl = encodeURIComponent(callbackUrl);

        return Response.redirect(new URL(
            `/auth/login?callbackUrl=${encodedCallbackUrl}`,
            nextUrl
        ));
    }

    return undefined;   // 動画だとnullで返してた

})

// Optionally, don't invoke Middleware on some paths
//
// /api/auth/* は matcher から除外する。
// 理由: このファイルの auth() ラッパーは、マッチした全リクエストで Auth.js を走らせ、
// jwt セッション cookie を再発行（Set-Cookie）する。/api/auth/signout もマッチすると、
// route handler が出すセッション削除 Set-Cookie を middleware 側の再発行が打ち消し、
// Cloudflare Workers(OpenNext) 上ではログアウトしてもセッションが消えない（Vercel では
// cookie マージ順で削除が勝つため顕在化しない＝Workers 固有）。
// ログインは「まだセッションが無い」ため再発行と衝突せず正常に動く（login/logout 非対称）。
// → /api/auth を除外し、認証エンドポイントは route handler だけに cookie を触らせる。
export const config = {
    matcher: [
        '/((?!api/auth|.+\\.[\\w]+$|_next).*)',
        '/',
        '/(api(?!/auth)|trpc)(.*)',
    ],
}