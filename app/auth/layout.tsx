import React from 'react'

// children は子のpage.tsx
const AuthLayout = ({ children }: {children: React.ReactNode}) => {
  return (
    <div className="h-full flex items-center justify-center px-4
    bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
    from-sky-400 to-blue-800">
        {children}
    </div>
  )
}

export default AuthLayout