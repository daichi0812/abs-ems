import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/(protected)/_components/Header", () => ({ default: () => null }));
vi.mock("@/components/InputImage", () => ({ default: () => null }));

vi.mock("../_hooks/use-equipments", () => ({ useEquipments: vi.fn() }));
vi.mock("./hooks/use-tags", () => ({ useTags: vi.fn() }));
vi.mock("./hooks/use-image-upload", () => ({ useImageUpload: vi.fn() }));
vi.mock("../_hooks/use-tag-creation", () => ({ useTagCreation: vi.fn() }));
vi.mock("./hooks/use-equipment-registration", () => ({ useEquipmentRegistration: vi.fn() }));
vi.mock("./hooks/use-equipment-actions", () => ({ useEquipmentActions: vi.fn() }));

import { useEquipments } from "../_hooks/use-equipments";
import { useTags } from "./hooks/use-tags";
import { useImageUpload } from "./hooks/use-image-upload";
import { useTagCreation } from "../_hooks/use-tag-creation";
import { useEquipmentRegistration } from "./hooks/use-equipment-registration";
import { useEquipmentActions } from "./hooks/use-equipment-actions";
import App from "./page";

const stubImageUpload = {
  inputFileRef: { current: null } as React.RefObject<HTMLInputElement>,
  imageFile: null,
  imageUrl: "",
  onFileChange: vi.fn(),
  reset: vi.fn(),
};

const stubTagCreation = {
  addTagName: "",
  setAddTagName: vi.fn(),
  editTagColor: "",
  setEditTagColor: vi.fn(),
  submit: vi.fn(),
};

const stubRegistration = {
  equipmentName: "",
  setEquipmentName: vi.fn(),
  equipmentDetail: "",
  setEquipmentDetail: vi.fn(),
  selectedTag: "all",
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
  vi.mocked(useTagCreation).mockReturnValue(stubTagCreation);
  vi.mocked(useEquipmentRegistration).mockReturnValue(stubRegistration);
  vi.mocked(useEquipmentActions).mockReturnValue(stubActions);
});

describe("manager page", () => {
  it("shows the loading spinner while equipments are loading", () => {
    vi.mocked(useEquipments).mockReturnValue({
      equipments: [],
      isLoading: true,
      refetch: vi.fn(),
    });

    const { container } = render(<App />);

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

    expect(screen.getByText("該当する機材が見つかりませんでした。")).toBeInTheDocument();
  });
});
