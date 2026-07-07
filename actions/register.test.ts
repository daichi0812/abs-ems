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

vi.mock("@/lib/workspace", () => ({
  joinDefaultWorkspace: vi.fn(),
}));

import { db } from "@/lib/db";
import { getUserByEmail } from "@/data/user";
import { sendVerificationEmail } from "@/lib/mail";
import { generateVerificationToken } from "@/lib/tokens";
import { joinDefaultWorkspace } from "@/lib/workspace";
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

  it("creates user, joins default workspace, generates token, sends email, and returns success", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({ id: "new-user" } as never);
    vi.mocked(generateVerificationToken).mockResolvedValue({
      email: "user@example.com",
      token: "vt",
    } as never);

    const result = await register(validInput);

    expect(db.user.create).toHaveBeenCalledWith({
      data: { name: "Taro", email: "user@example.com", password: "hashed-pw" },
    });
    // 新規ユーザーは既定ワークスペース（放送部）へ自動所属
    expect(joinDefaultWorkspace).toHaveBeenCalledWith("new-user");
    expect(generateVerificationToken).toHaveBeenCalledWith("user@example.com");
    expect(sendVerificationEmail).toHaveBeenCalledWith("user@example.com", "vt");
    expect(result).toEqual({ success: "確認メールを送信しました！" });
  });
});
