// dev DB 用シード。`npm run db:seed` で実行する。
// 既存の Tag / List / Reserve を消して作り直す破壊的スクリプトのため、
// 本番 DB（logicode-auth）に対しては実行を拒否する。
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "";
if (url.includes("logicode-auth")) {
  console.error("DATABASE_URL が本番 (logicode-auth) を指しています。シードを中止しました。");
  process.exit(1);
}

const prisma = new PrismaClient();

// デザイン案（UI刷新案.dc.html）のモックデータに合わせたカテゴリとカラー
const TAGS = [
  { name: "カメラ", color: "#2E90FA" },
  { name: "照明", color: "#F79009" },
  { name: "モニター", color: "#12B76A" },
  { name: "音響", color: "#7A5AF8" },
  { name: "三脚・ジンバル", color: "#F04438" },
  { name: "その他", color: "#667085" },
];

const EQUIPMENTS = [
  ["α6600セット", "カメラ", "SONY α6600 ボディ + SIGMA 16mm F1.4。予備バッテリー2本・SD付き"],
  ["DJI POCKET2", "カメラ", "小型ジンバルカメラ。手持ち移動撮影・Vlogに"],
  ["ブラマジ", "カメラ", "Blackmagic Pocket Cinema。本格シネマ撮影向け"],
  ["600d照明", "照明", "Aputure 600d。大光量のパワフルなCOB照明"],
  ["Amaran 照明", "照明", "Amaran COBライト。取り回しの良い定番照明"],
  ["nanlite照明", "照明", "NANLITE。色温度が変えられるLEDパネル"],
  ["Fiilex P360 3灯セット", "照明", "Fiilex P360 を3灯セットで。ロケの主力照明"],
  ["SmallRig照明", "照明", "SmallRig LED。小型で卓上・取材向き"],
  ["ACERモニター", "モニター", "ACER 外部モニター。編集・確認用の大画面"],
  ["atomosモニター", "モニター", "ATOMOS。収録もできる高輝度モニター"],
  ["Feelworldモニター", "モニター", "FEELWORLD 5.5型。カメラ上部に載せる確認用"],
  ["oseeモニター", "モニター", "OSEE 高輝度モニター。屋外でも視認しやすい"],
  ["F4", "音響", "ZOOM F4。多チャンネル収録フィールドレコーダー"],
  ["F6", "音響", "ZOOM F6。32bit float録音対応レコーダー"],
  ["JBL スピーカー", "音響", "JBL。上映・確認用のポータブルスピーカー"],
  ["RS2", "三脚・ジンバル", "DJI RS2。一眼向けの安定ジンバル"],
  ["RS3", "三脚・ジンバル", "DJI RS3。軽量で素早くセットできるジンバル"],
  ["ザハトラー 三脚", "三脚・ジンバル", "Sachtler。滑らかなパン・チルトの映像三脚"],
  ["センチュリー1", "三脚・ジンバル", "Century。ハイポジション対応の大型三脚"],
  ["Vバッテリー(140)", "その他", "V-Mount 140Wh。照明・カメラ用の大容量電源"],
  ["Vバッテリー(99)", "その他", "V-Mount 99Wh。機内持込可の予備電源"],
  ["ポータブル電源", "その他", "ロケ先でAC電源として。長時間の撮影に"],
  ["レフ板", "その他", "光を回す定番レフ板。屋内外どちらでも"],
  ["ワゴン", "その他", "機材運搬用ワゴン。搬入出をまとめて"],
];

// dev1 は管理者画面の動作確認用に ADMIN
const USERS = [
  { email: "dev1@example.com", name: "川崎蒼汰", role: "ADMIN" },
  { email: "dev2@example.com", name: "星野琉生" },
  { email: "dev3@example.com", name: "三浦ひな" },
  { email: "dev4@example.com", name: "大森悠人" },
];

// Reserve.start/end は「JST の日付を UTC 00:00 として保存」する運用
// （app/api/reserves/route.ts の正規化と同じ）。
const jstDay = (offset) => {
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate() + offset));
};

// lib/workspace.ts の DEFAULT_WORKSPACE_ID と同じ固定 id（seed.mjs は CJS/ESM の都合で直書き）
const DEFAULT_WORKSPACE_ID = "ws_abs_default";

async function main() {
  await prisma.reserve.deleteMany();
  await prisma.list.deleteMany();
  await prisma.tag.deleteMany();

  // 既定ワークスペース（migration でも作られるが、リセット直後の DB でも動くよう upsert）
  await prisma.workspace.upsert({
    where: { id: DEFAULT_WORKSPACE_ID },
    update: {},
    create: { id: DEFAULT_WORKSPACE_ID, name: "ABS（放送部）", slug: "abs" },
  });

  const tagIds = {};
  for (const t of TAGS) {
    const tag = await prisma.tag.create({ data: t });
    tagIds[t.name] = tag.id;
  }

  const listIds = {};
  for (const [name, cat, detail] of EQUIPMENTS) {
    const list = await prisma.list.create({ data: { name, detail, tag_id: tagIds[cat] } });
    listIds[name] = list.id;
  }

  const password = await bcrypt.hash("devpass123", 10);
  const userIds = [];
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role ?? "USER" },
      create: { ...u, password, emailVerified: new Date() },
    });
    userIds.push(user.id);
    // 全員を既定ワークスペースへ所属（グローバル ADMIN はワークスペース ADMIN として引き継ぐ）
    await prisma.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: DEFAULT_WORKSPACE_ID } },
      update: {},
      create: {
        userId: user.id,
        workspaceId: DEFAULT_WORKSPACE_ID,
        role: u.role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastWorkspaceId: DEFAULT_WORKSPACE_ID },
    });
  }

  // 今日を跨ぐ・過去・未来の予約を混ぜ、カレンダー/マイ予約/ガントの全状態を再現する
  const RESERVES = [
    ["α6600セット", 0, -1, 1, 2],   // dev1 が今日を含む期間で貸出中
    ["Amaran 照明", 0, -1, 1, 2],
    ["ザハトラー 三脚", 0, -1, 1, 2],
    ["F6", 1, -2, 3, 2],            // dev2 長め
    ["Vバッテリー(140)", 1, -2, 3, 2],
    ["600d照明", 2, -1, 1, 2],      // dev3
    ["nanlite照明", 2, -1, 1, 2],
    ["RS3", 3, -1, 1, 2],           // dev4
    ["レフ板", 0, -6, -2, 0],       // 過去（返却済相当）
    ["DJI POCKET2", 2, 4, 5, 0],    // 未来の予約
    ["JBL スピーカー", 3, 7, 8, 0],
    ["Feelworldモニター", 0, 2, 4, 0],
  ];
  for (const [eq, userIdx, s, e, isRenting] of RESERVES) {
    await prisma.reserve.create({
      data: {
        list_id: listIds[eq],
        user_id: userIds[userIdx],
        start: jstDay(s),
        end: jstDay(e),
        isRenting,
      },
    });
  }

  console.log(
    `seeded: ${TAGS.length} tags, ${EQUIPMENTS.length} lists, ${USERS.length} users (pw: devpass123), ${RESERVES.length} reserves`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
