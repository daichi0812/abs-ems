import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock FullCalendar to avoid loading its heavy dependencies in tests.
vi.mock("@fullcalendar/react", () => ({ default: () => null }));
vi.mock("@fullcalendar/daygrid", () => ({ default: {} }));
vi.mock("@fullcalendar/interaction", () => ({
  default: {},
  Draggable: class {},
}));
vi.mock("@fullcalendar/timegrid", () => ({ default: {} }));
vi.mock("@fullcalendar/core/locales/ja", () => ({ default: {} }));
vi.mock("@fullcalendar/core/index.js", () => ({}));

vi.mock("./hooks/mypage/use-list-color-map", () => ({ useListColorMap: vi.fn() }));
vi.mock("./hooks/mypage/use-calendar-events", () => ({
  useCalendarEvents: vi.fn(),
}));
vi.mock("./hooks/mypage/use-delete-flow", () => ({ useDeleteFlow: vi.fn() }));
vi.mock("./hooks/mypage/use-new-event-form", () => ({ useNewEventForm: vi.fn() }));

import { useListColorMap } from "./hooks/mypage/use-list-color-map";
import { useCalendarEvents } from "./hooks/mypage/use-calendar-events";
import { useDeleteFlow } from "./hooks/mypage/use-delete-flow";
import { useNewEventForm } from "./hooks/mypage/use-new-event-form";
import MypageCalendar from "./MypageCalendar";

const defaultProps = {
  filteredData: [],
  idToNameMap: {},
  userId: "u1",
  mypageFetchReservesData: vi.fn(async () => {}),
};

beforeEach(() => {
  vi.mocked(useListColorMap).mockReturnValue({ listColorMap: {} });
  vi.mocked(useDeleteFlow).mockReturnValue({
    showDeleteModal: false,
    setShowDeleteModal: vi.fn(),
    idToDelete: null,
    openDelete: vi.fn(),
    closeDelete: vi.fn(),
    deleteSelected: vi.fn(),
  });
  vi.mocked(useNewEventForm).mockReturnValue({
    newEvent: { title: "", start: "", end: "", allDay: false, id: 0 },
    showModal: false,
    setShowModal: vi.fn(),
    handleDateClick: vi.fn(),
    addEvent: vi.fn(),
    handleChange: vi.fn(),
    handleSubmit: vi.fn(),
    closeModal: vi.fn(),
  });
});

describe("MypageCalendar", () => {
  it("renders the loading box while isFetching=true", () => {
    vi.mocked(useCalendarEvents).mockReturnValue({
      allEvents: [],
      setAllEvents: vi.fn(),
      isFetching: true,
    });

    const { container } = render(<MypageCalendar {...defaultProps} />);

    expect(container.querySelector('[class*="chakra-spinner"]')).not.toBeNull();
  });

  it("renders calendar (FullCalendar mock) after fetching", () => {
    vi.mocked(useCalendarEvents).mockReturnValue({
      allEvents: [],
      setAllEvents: vi.fn(),
      isFetching: false,
    });

    const { container } = render(<MypageCalendar {...defaultProps} />);

    // Spinner should not be present
    expect(container.querySelector('[class*="chakra-spinner"]')).toBeNull();
  });

  it("does not render the delete modal when showDeleteModal=false", () => {
    vi.mocked(useCalendarEvents).mockReturnValue({
      allEvents: [],
      setAllEvents: vi.fn(),
      isFetching: false,
    });

    const { queryByText } = render(<MypageCalendar {...defaultProps} />);

    expect(queryByText("予約のキャンセル")).toBeNull();
  });

  it("renders delete confirmation modal when showDeleteModal=true", () => {
    vi.mocked(useCalendarEvents).mockReturnValue({
      allEvents: [],
      setAllEvents: vi.fn(),
      isFetching: false,
    });
    vi.mocked(useDeleteFlow).mockReturnValue({
      showDeleteModal: true,
      setShowDeleteModal: vi.fn(),
      idToDelete: 1,
      openDelete: vi.fn(),
      closeDelete: vi.fn(),
      deleteSelected: vi.fn(),
    });

    const { getByText } = render(<MypageCalendar {...defaultProps} />);

    expect(getByText("予約のキャンセル")).toBeInTheDocument();
  });
});
