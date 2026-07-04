import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@fullcalendar/react", () => ({ default: () => null }));
vi.mock("@fullcalendar/daygrid", () => ({ default: {} }));
vi.mock("@fullcalendar/interaction", () => ({
  default: {},
  Draggable: class {},
}));
vi.mock("@fullcalendar/timegrid", () => ({ default: {} }));
vi.mock("@fullcalendar/core/locales/ja", () => ({ default: {} }));
vi.mock("@fullcalendar/core/index.js", () => ({}));

vi.mock("./hooks/reservation/use-reservation-data", () => ({
  useReservationData: vi.fn(),
}));
vi.mock("./hooks/reservation/use-reservation-form", () => ({
  useReservationForm: vi.fn(),
}));
vi.mock("./hooks/reservation/use-reservation-delete-flow", () => ({
  useReservationDeleteFlow: vi.fn(),
}));

import { useReservationData } from "./hooks/reservation/use-reservation-data";
import { useReservationForm } from "./hooks/reservation/use-reservation-form";
import { useReservationDeleteFlow } from "./hooks/reservation/use-reservation-delete-flow";
import ReservationCalendar from "./ReservationCalendar";

const stubForm = {
  newEvent: { title: "u1", start: "", end: "", allDay: true, id: 0 },
  setNewEvent: vi.fn(),
  showModal: false,
  setShowModal: vi.fn(),
  handleDateClick: vi.fn(),
  addEvent: vi.fn(),
  closeModal: vi.fn(),
  updateStart: vi.fn(),
  updateEnd: vi.fn(),
  submit: vi.fn(),
};

const stubDeleteFlow = {
  showDeleteModal: false,
  setShowDeleteModal: vi.fn(),
  idToDelete: null,
  openDelete: vi.fn(),
  closeDelete: vi.fn(),
  deleteSelected: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useReservationForm).mockReturnValue(stubForm);
  vi.mocked(useReservationDeleteFlow).mockReturnValue(stubDeleteFlow);
});

describe("ReservationCalendar", () => {
  it("shows the loading spinner while isFetching=true", () => {
    vi.mocked(useReservationData).mockReturnValue({
      allEvents: [],
      setAllEvents: vi.fn(),
      filteredData: [],
      isFetching: true,
      refetch: vi.fn(),
    });

    const { container } = render(<ReservationCalendar userId="u1" listId={1} />);

    expect(container.querySelector('[class*="chakra-spinner"]')).not.toBeNull();
  });

  it("renders the calendar area after fetching", () => {
    vi.mocked(useReservationData).mockReturnValue({
      allEvents: [],
      setAllEvents: vi.fn(),
      filteredData: [],
      isFetching: false,
      refetch: vi.fn(),
    });

    const { container } = render(<ReservationCalendar userId="u1" listId={1} />);

    expect(container.querySelector('[class*="chakra-spinner"]')).toBeNull();
  });

  it("does not render the reservation modal when showModal=false", () => {
    vi.mocked(useReservationData).mockReturnValue({
      allEvents: [],
      setAllEvents: vi.fn(),
      filteredData: [],
      isFetching: false,
      refetch: vi.fn(),
    });

    const { queryByText } = render(<ReservationCalendar userId="u1" listId={1} />);

    expect(queryByText("機材を借りる期間を選択してください")).toBeNull();
  });

  it("renders the reservation modal when showModal=true", () => {
    vi.mocked(useReservationData).mockReturnValue({
      allEvents: [],
      setAllEvents: vi.fn(),
      filteredData: [],
      isFetching: false,
      refetch: vi.fn(),
    });
    vi.mocked(useReservationForm).mockReturnValue({
      ...stubForm,
      showModal: true,
    });

    const { getByText } = render(<ReservationCalendar userId="u1" listId={1} />);

    expect(getByText("機材を借りる期間を選択してください")).toBeInTheDocument();
  });
});
