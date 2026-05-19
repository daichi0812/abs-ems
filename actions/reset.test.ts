import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/tokens", () => ({
  generatePasswordResetToken: vi.fn(),
}));

import { getUserByEmail } from "@/data/user";
import { sendPasswordResetEmail } from "@/lib/mail";
import { generatePasswordResetToken } from "@/lib/tokens";
import { reset } from "./reset";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("reset", () => {
  it("returns error on invalid email", async () => {
    const result = await reset({ email: "not-an-email" });
    expect(result).toEqual({ error: "正しくないメールアドレスです！" });
    expect(getUserByEmail).not.toHaveBeenCalled();
  });

  it("returns error when user does not exist", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await reset({ email: "missing@b.com" });

    expect(result).toEqual({ error: "メールアドレスが見つかりません！" });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("generates reset token, sends email, and returns success", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(generatePasswordResetToken).mockResolvedValue({
      email: "a@b.com",
      token: "prt",
    } as never);

    const result = await reset({ email: "a@b.com" });

    expect(generatePasswordResetToken).toHaveBeenCalledWith("a@b.com");
    expect(sendPasswordResetEmail).toHaveBeenCalledWith("a@b.com", "prt");
    expect(result).toEqual({ success: "再設定用のメールを送りました！" });
  });
});
