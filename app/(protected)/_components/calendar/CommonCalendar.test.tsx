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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("./hooks/common/use-calendar-data", () => ({ useCalendarData: vi.fn() }));
vi.mock("./hooks/common/use-responsive-view", () => ({ useResponsiveView: vi.fn() }));
vi.mock("./hooks/common/use-event-navigation", () => ({ useEventNavigation: vi.fn() }));

import { useCalendarData } from "./hooks/common/use-calendar-data";
import { useResponsiveView } from "./hooks/common/use-responsive-view";
import { useEventNavigation } from "./hooks/common/use-event-navigation";
import CommonCalendar from "./CommonCalendar";

beforeEach(() => {
  vi.mocked(useResponsiveView).mockReturnValue({
    isMobile: false,
    displayWeekly: false,
    displayMonthly: true,
    showWeekly: vi.fn(),
    showMonthly: vi.fn(),
  });
  vi.mocked(useEventNavigation).mockReturnValue({ navigateToDetail: vi.fn() });
});

describe("CommonCalendar", () => {
  it("shows the loading spinner while isFetching=true", () => {
    vi.mocked(useCalendarData).mockReturnValue({
      allEvents: [],
      isFetching: true,
    });

    const { container } = render(<CommonCalendar />);

    expect(container.querySelector('[class*="chakra-spinner"]')).not.toBeNull();
  });

  it("renders the monthly view title after fetching", () => {
    vi.mocked(useCalendarData).mockReturnValue({
      allEvents: [],
      isFetching: false,
    });

    const { getAllByText } = render(<CommonCalendar />);

    expect(getAllByText("共通カレンダー").length).toBeGreaterThan(0);
  });

  it("renders the weekly switch button in monthly view", () => {
    vi.mocked(useCalendarData).mockReturnValue({
      allEvents: [],
      isFetching: false,
    });

    const { getByText } = render(<CommonCalendar />);

    expect(getByText("週表示")).toBeInTheDocument();
  });

  it("renders the monthly switch button when weekly view is active", () => {
    vi.mocked(useResponsiveView).mockReturnValue({
      isMobile: false,
      displayWeekly: true,
      displayMonthly: false,
      showWeekly: vi.fn(),
      showMonthly: vi.fn(),
    });
    vi.mocked(useCalendarData).mockReturnValue({
      allEvents: [],
      isFetching: false,
    });

    const { getByText } = render(<CommonCalendar />);

    expect(getByText("月表示")).toBeInTheDocument();
  });
});
