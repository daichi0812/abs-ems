import { describe, expect, it } from "vitest";
import {
  LoginSchema,
  NewPasswordSchema,
  RegisterSchema,
  ResetSchema,
  SettingsSchema,
} from "./index";

describe("LoginSchema", () => {
  it("accepts valid email + password", () => {
    const result = LoginSchema.safeParse({
      email: "user@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional 2FA code", () => {
    const result = LoginSchema.safeParse({
      email: "user@example.com",
      password: "anything",
      code: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = LoginSchema.safeParse({
      email: "not-an-email",
      password: "anything",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = LoginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("RegisterSchema", () => {
  it("accepts valid input", () => {
    const result = RegisterSchema.safeParse({
      email: "user@example.com",
      password: "tenchars12",
      name: "Taro",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 10 chars", () => {
    const result = RegisterSchema.safeParse({
      email: "user@example.com",
      password: "short",
      name: "Taro",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = RegisterSchema.safeParse({
      email: "user@example.com",
      password: "tenchars12",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = RegisterSchema.safeParse({
      email: "no-at-sign",
      password: "tenchars12",
      name: "Taro",
    });
    expect(result.success).toBe(false);
  });
});

describe("ResetSchema", () => {
  it("accepts valid email", () => {
    const result = ResetSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = ResetSchema.safeParse({ email: "no-at-sign" });
    expect(result.success).toBe(false);
  });
});

describe("NewPasswordSchema", () => {
  it("accepts password >= 10 chars", () => {
    const result = NewPasswordSchema.safeParse({ password: "tenchars12" });
    expect(result.success).toBe(true);
  });

  it("rejects password < 10 chars", () => {
    const result = NewPasswordSchema.safeParse({ password: "short" });
    expect(result.success).toBe(false);
  });
});

describe("SettingsSchema", () => {
  it("accepts role-only update", () => {
    const result = SettingsSchema.safeParse({ role: "USER" });
    expect(result.success).toBe(true);
  });

  it("accepts ADMIN role", () => {
    const result = SettingsSchema.safeParse({ role: "ADMIN" });
    expect(result.success).toBe(true);
  });

  it("accepts both password and newPassword together", () => {
    const result = SettingsSchema.safeParse({
      role: "USER",
      password: "currentpass",
      newPassword: "newpass1234",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password without newPassword", () => {
    const result = SettingsSchema.safeParse({
      role: "USER",
      password: "currentpass",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["newPassword"]);
    }
  });

  it("rejects newPassword without password", () => {
    const result = SettingsSchema.safeParse({
      role: "USER",
      newPassword: "newpass1234",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["password"]);
    }
  });

  it("accepts optional name and email", () => {
    const result = SettingsSchema.safeParse({
      role: "USER",
      name: "Taro",
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = SettingsSchema.safeParse({
      role: "USER",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects role outside enum", () => {
    const result = SettingsSchema.safeParse({ role: "GUEST" });
    expect(result.success).toBe(false);
  });

  it("rejects newPassword shorter than 10 chars", () => {
    const result = SettingsSchema.safeParse({
      role: "USER",
      password: "currentpass",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});
