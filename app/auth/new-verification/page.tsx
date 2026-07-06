import { NewVerificationForm } from "@/components/auth/new-verification-form"

// 素の <div> で包むと flex アイテムがコンテンツ幅に縮み、
// CardWrapper の w-full / max-w が効かず極端に細くなる（直接返す）
const NewVerificationPage = () => {
  return <NewVerificationForm />
}

export default NewVerificationPage
