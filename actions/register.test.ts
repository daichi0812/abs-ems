import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: { create: vi.fn() },
  },
}));

vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/tokens", () => ({
  generateVerificationToken: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "hashed-pw") },
}));

import { db } from "@/lib/db";
import { getUserByEmail } from "@/data/user";
import { sendVerificationEmail } from "@/lib/mail";
import { generateVerificationToken } from "@/lib/tokens";
import { register } from "./register";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("register", () => {
  const validInput = {
    email: "user@example.com",
    password: "tenchars12",
    name: "Taro",
  };

  it("returns error on invalid input", async () => {
    const result = await register({ email: "bad", password: "short", name: "" });
    expect(result).toEqual({ error: "入力に誤りがあります！" });
    expect(getUserByEmail).not.toHaveBeenCalled();
  });

  it("returns error when email is already registered", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({ id: "u1" } as never);

    const result = await register(validInput);

    expect(result).toEqual({ error: "そのメールは既に使用されています！" });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("creates user (without any workspace membership), sends email, and returns success", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({ id: "new-user" } as never);
    vi.mocked(generateVerificationToken).mockResolvedValue({
      email: "user@example.com",
      token: "vt",
    } as never);

    const result = await register(validInput);

    // 招待制: 登録時点ではワークスペース所属を付与しない
    //（所属ゼロのユーザーは /workspaces/new へ案内され、招待リンクか自作で参加する）
    expect(db.user.create).toHaveBeenCalledWith({
      data: { name: "Taro", email: "user@example.com", password: "hashed-pw" },
    });
    expect(generateVerificationToken).toHaveBeenCalledWith("user@example.com");
    expect(sendVerificationEmail).toHaveBeenCalledWith("user@example.com", "vt");
    expect(result).toEqual({ success: "確認メールを送信しました！" });
  });
});
