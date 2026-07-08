"use client";

export interface ApiMutateOptions {
  method: string;
  /** JSON ボディ。渡すと Content-Type: application/json を付与し JSON 直列化して送る。 */
  body?: unknown;
}

/** apiMutate が投げるエラー。message にはサーバーの error 文言（あれば）を載せる。 */
export class ApiMutateError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiMutateError";
    this.status = status;
  }
}

/**
 * 社内 API への mutation 用 fetch。
 *
 * 各フックに散在していた「JSON を送る → fetch は HTTP エラーで throw しないので
 * !res.ok を明示的に throw に変換する」という定型を1本化する。
 * 失敗時はサーバーの { error } 文言（無ければ HTTP ステータス）を message に載せた
 * ApiMutateError を投げるので、呼び出し側は try/catch でまとめて扱える。
 */
export async function apiMutate(
  url: string,
  options: ApiMutateOptions
): Promise<void> {
  const { method, body } = options;
  const hasBody = body !== undefined;

  // 管理操作の認可はサーバー側（requireWorkspaceManager が membership を検証）に一本化
  // されており、クライアントから特別なヘッダーは送らない（旧 x-manager-key は廃止）。
  const headers: Record<string, string> = {};
  if (hasBody) headers["Content-Type"] = "application/json";

  const init: RequestInit = { method, headers };
  if (hasBody) init.body = JSON.stringify(body);

  const res = await fetch(url, init);
  if (!res.ok) {
    const data =
      typeof res.json === "function"
        ? ((await res.json().catch(() => null)) as { error?: string } | null)
        : null;
    throw new ApiMutateError(data?.error ?? `HTTP ${res.status}`, res.status);
  }
}
