import React from 'react'

// children は子の page.tsx（login / register / reset / new-password / error など認証系の全画面）。
// アプリ本体の刷新後デザイン（navy ヘッダー + brand ブルー）に合わせ、
// 旧テンプレートの水色グラデーション背景を navy 基調 + 上部にごく淡い brand の光へ置き換える。
// bg-navy が background-color、radial-gradient が background-image なので両立する。
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-navy px-4 py-10
      bg-[radial-gradient(ellipse_at_top,_rgba(46,144,250,0.25),_transparent_65%)]"
    >
      {children}
    </div>
  )
}

export default AuthLayout
