import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../hooks/use-equipments", () => ({ useEquipments: vi.fn() }));
vi.mock("./hooks/use-tags", () => ({ useTags: vi.fn() }));
vi.mock("./hooks/use-image-upload", () => ({ useImageUpload: vi.fn() }));
vi.mock("./hooks/use-equipment-registration", () => ({ useEquipmentRegistration: vi.fn() }));
vi.mock("./hooks/use-equipment-actions", () => ({ useEquipmentActions: vi.fn() }));

import { useEquipments } from "../hooks/use-equipments";
import { useTags } from "./hooks/use-tags";
import { useImageUpload } from "./hooks/use-image-upload";
import { useEquipmentRegistration } from "./hooks/use-equipment-registration";
import { useEquipmentActions } from "./hooks/use-equipment-actions";
import App from "./page";

const stubImageUpload = {
  inputFileRef: { current: null } as React.RefObject<HTMLInputElement | null>,
  imageFile: null,
  imageUrl: "",
  onFileChange: vi.fn(),
  reset: vi.fn(),
};

const stubRegistration = {
  equipmentName: "",
  setEquipmentName: vi.fn(),
  equipmentDetail: "",
  setEquipmentDetail: vi.fn(),
  selectedTag: "",
  setSelectedTag: vi.fn(),
  submit: vi.fn(),
  cancel: vi.fn(),
};

const stubActions = {
  loadingId: null,
  isPending: false,
  editEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useTags).mockReturnValue({
    tags: [],
    categories: [],
    isLoading: false,
    refetch: vi.fn(),
  });
  vi.mocked(useImageUpload).mockReturnValue(stubImageUpload);
  vi.mocked(useEquipmentRegistration).mockReturnValue(stubRegistration);
  vi.mocked(useEquipmentActions).mockReturnValue(stubActions);
});

describe("manager page", () => {
  it("shows a loading skeleton while equipments are loading", () => {
    vi.mocked(useEquipments).mockReturnValue({
      equipments: [],
      isLoading: true,
      refetch: vi.fn(),
    });

    const { container } = render(<App />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
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

    render(<App />);

    expect(screen.getByText("Camera")).toBeInTheDocument();
    expect(screen.getByText("Tripod")).toBeInTheDocument();
  });

  it("shows empty-state message when no equipments are present", () => {
    vi.mocked(useEquipments).mockReturnValue({
      equipments: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText("該当する機材がありません")).toBeInTheDocument();
  });
});
