import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../use-image-url", () => ({
  useGetImageUrl: vi.fn(),
}));

import { useGetImageUrl } from "../use-image-url";
import { useImageUpload } from "./use-image-upload";

beforeEach(() => {
  vi.mocked(useGetImageUrl).mockReturnValue({ imageUrl: "data:image/png;base64,xxx" });
});

const fakeChangeEvent = (file: File | null) =>
  ({
    currentTarget: { files: file ? [file] : [] },
  }) as unknown as React.ChangeEvent<HTMLInputElement>;

describe("useImageUpload", () => {
  it("starts with no file selected", () => {
    const { result } = renderHook(() => useImageUpload());
    expect(result.current.imageFile).toBeNull();
  });

  it("stores the selected file when onFileChange is called", () => {
    const { result } = renderHook(() => useImageUpload());
    const file = new File(["x"], "test.png", { type: "image/png" });

    act(() => {
      result.current.onFileChange(fakeChangeEvent(file));
    });

    expect(result.current.imageFile).toBe(file);
  });

  it("ignores changes when no file is provided", () => {
    const { result } = renderHook(() => useImageUpload());

    act(() => {
      result.current.onFileChange(fakeChangeEvent(null));
    });

    expect(result.current.imageFile).toBeNull();
  });

  it("reset clears imageFile and the input ref value", () => {
    const { result } = renderHook(() => useImageUpload());
    const file = new File(["x"], "test.png", { type: "image/png" });

    act(() => {
      result.current.onFileChange(fakeChangeEvent(file));
    });

    // simulate the ref pointing at a real input element
    Object.defineProperty(result.current.inputFileRef, "current", {
      value: { value: "test.png" } as HTMLInputElement,
      writable: true,
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.imageFile).toBeNull();
    expect(result.current.inputFileRef.current?.value).toBe("");
  });

  it("exposes imageUrl from useGetImageUrl", () => {
    const { result } = renderHook(() => useImageUpload());
    expect(result.current.imageUrl).toBe("data:image/png;base64,xxx");
  });
});
