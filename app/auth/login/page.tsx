import { LoginForm } from '@/components/auth/login-form'
import React from 'react'

// 素の <div> で包むと flex アイテムがコンテンツ幅に縮み、
// CardWrapper の w-full / max-w が効かず極端に細くなる（直接返す）
const LoginPage = () => {
  return <LoginForm />
}

export default LoginPage
