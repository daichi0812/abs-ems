import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ id: "u1", name: "Taro" }),
}));

vi.mock("@/app/(protected)/_components/Header", () => ({
  default: () => null,
}));

vi.mock("./hooks/use-equipments", () => ({ useEquipments: vi.fn() }));
vi.mock("./hooks/use-categories", () => ({ useCategories: vi.fn() }));
vi.mock("./hooks/use-reserves", () => ({ useReserves: vi.fn() }));
vi.mock("./hooks/use-reservation-navigation", () => ({
  useReservationNavigation: vi.fn(),
}));
vi.mock("./hooks/use-bulk-reservation", () => ({
  useBulkReservation: vi.fn(),
}));

import { useEquipments } from "./hooks/use-equipments";
import { useCategories } from "./hooks/use-categories";
import { useReserves } from "./hooks/use-reserves";
import { useReservationNavigation } from "./hooks/use-reservation-navigation";
import { useBulkReservation } from "./hooks/use-bulk-reservation";
import EquipmentList from "./page";

const defaultBulk = {
  isBulkMode: false,
  selectedIds: new Set<number>(),
  bulkForm: { start: "", end: "" },
  showModal: false,
  isSubmitting: false,
  toggleBulkMode: vi.fn(),
  toggleEquipment: vi.fn(),
  openModal: vi.fn(),
  closeModal: vi.fn(),
  updateForm: vi.fn(),
  submit: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useCategories).mockReturnValue({
    categories: [],
    isLoading: false,
    refetch: vi.fn(),
  });
  vi.mocked(useReserves).mockReturnValue({ reserves: [], refetch: vi.fn() });
  vi.mocked(useReservationNavigation).mockReturnValue({
    loadingId: null,
    isPending: false,
    navigateToReserve: vi.fn(),
  });
  vi.mocked(useBulkReservation).mockReturnValue(defaultBulk);
});

describe("EquipmentList page", () => {
  it("shows the loading spinner while equipments are loading", () => {
    vi.mocked(useEquipments).mockReturnValue({
      equipments: [],
      isLoading: true,
      refetch: vi.fn(),
    });

    const { container } = render(<EquipmentList />);

    // Chakra Spinner renders with role="status"
    expect(container.querySelector('[class*="chakra-spinner"]')).not.toBeNull();
  });

  it("renders equipment names after loading", () => {
    vi.mocked(useEquipments).mockReturnValue({
      equipments: [
        { id: 1, name: "Camera", detail: "", image: "", tag_id: "1" },
        { id: 2, name: "Tripod", detail: "", image: "", tag_id: "1" },
      ],
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<EquipmentList />);

    expect(screen.getByText("Camera")).toBeInTheDocument();
    expect(screen.getByText("Tripod")).toBeInTheDocument();
  });

  it("shows empty-state message when no equipments match the filter", () => {
    vi.mocked(useEquipments).mockReturnValue({
      equipments: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<EquipmentList />);

    expect(screen.getByText("該当する機材が見つかりませんでした。")).toBeInTheDocument();
  });
});
