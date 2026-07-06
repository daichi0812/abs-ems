import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BookingWizard の表示優先順位（全画面エラーの出し分け）を固定するテスト。
// データ取得はすべてフックをモックして、UI の分岐だけを検証する。

const { useReservesMock } = vi.hoisted(() => ({ useReservesMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/(protected)/ems/_hooks/use-equipments", () => ({
  useEquipments: () => ({ equipments: [], isLoading: false }),
}));
vi.mock("@/app/(protected)/ems/equipment-list/hooks/use-categories", () => ({
  useCategories: () => ({ categories: [], isLoading: false, refetch: vi.fn() }),
}));
vi.mock("@/app/(protected)/ems/equipment-list/hooks/use-reserves", () => ({
  useReserves: () => useReservesMock(),
}));
vi.mock("@/app/(protected)/ems/equipment-list/hooks/use-create-reservations", () => ({
  useCreateReservations: () => ({ isSubmitting: false, createReservations: vi.fn() }),
}));

import { BookingWizard } from "./BookingWizard";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue({ json: async () => [] }); // /api/users
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  useReservesMock.mockReset();
});

describe("BookingWizard の全画面エラーの出し分け", () => {
  it("初回ロードに失敗したときは全画面エラー＋再試行を出す", () => {
    useReservesMock.mockReturnValue({
      reserves: [],
      isLoading: false,
      isError: true,
      hasLoaded: false,
      refetch: vi.fn(),
    });

    render(<BookingWizard />);

    expect(screen.getByText("空き状況を読み込めませんでした。")).toBeDefined();
    expect(screen.getByRole("button", { name: "再試行" })).toBeDefined();
  });

  it("取得済みデータがあれば、バックグラウンド再取得の失敗でウィザードを乗っ取らない", () => {
    // visibilitychange 再取得や予約成功直後の refetch が失敗しても、
    // 進行中のウィザード（期間選択など）を全画面エラーで置き換えない
    useReservesMock.mockReturnValue({
      reserves: [],
      isLoading: false,
      isError: true,
      hasLoaded: true,
      refetch: vi.fn(),
    });

    render(<BookingWizard />);

    expect(screen.queryByText("空き状況を読み込めませんでした。")).toBeNull();
    // ウィザード本体（モバイルのステップ表記「期間」）が表示されている
    expect(screen.getAllByText("期間").length).toBeGreaterThan(0);
  });

  it("読み込み中はスケルトンを出し、エラー画面は出さない", () => {
    useReservesMock.mockReturnValue({
      reserves: [],
      isLoading: true,
      isError: false,
      hasLoaded: false,
      refetch: vi.fn(),
    });

    const { container } = render(<BookingWizard />);

    expect(screen.queryByText("空き状況を読み込めませんでした。")).toBeNull();
    expect(container.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });
});
