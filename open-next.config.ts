import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 最小構成。ISR/オンデマンド再検証を本格利用する場合は incremental cache（R2/KV）と
// tag cache（SQLite 方式の Durable Object）をここで設定する。動的中心の本アプリでは未設定で開始。
export default defineCloudflareConfig({});
