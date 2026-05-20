import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.stubEnv("AUTH_SECRET", "test-secret");
vi.stubEnv("RESEND_API_KEY", "test-resend-key");
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
