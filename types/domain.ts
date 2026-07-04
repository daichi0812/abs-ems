/**
 * UI 層で使用されるドメイン型の集約。
 * Prisma 生成型と完全一致しない箇所は、API レスポンスや既存 UI 実装に合わせた形で定義している。
 * 真の正規化は API 層リファクタの段階で実施する予定。
 */

export interface Equipment {
  id: number;
  name: string;
  detail: string;
  image: string;
  tag_id: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Reserve {
  id: number;
  user_id: string;
  start: string;
  end: string;
  list_id: number;
}
