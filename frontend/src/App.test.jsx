import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, status: 200 }))
  );
});

describe("App", () => {
  it("renders the heading and both service labels", () => {
    render(<App />);
    expect(screen.getByText("Microservices Platform")).toBeInTheDocument();
    expect(screen.getByText("Orders API")).toBeInTheDocument();
    expect(screen.getByText("Catalog API")).toBeInTheDocument();
  });

  it("shows the resolved API base URLs so build-time env is debuggable", () => {
    render(<App />);
    expect(screen.getAllByText("http://localhost:4000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("http://localhost:8080").length).toBeGreaterThan(0);
  });

  it("shows unhealthy with the status code when a service replies with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 503 }))
    );
    render(<App />);
    const unhealthy = await screen.findAllByText(/unhealthy \(503\)/);
    expect(unhealthy).toHaveLength(2);
  });

  it("shows unreachable when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("boom"))));
    render(<App />);
    const unreachable = await screen.findAllByText(/unreachable/);
    expect(unreachable).toHaveLength(2);
  });

  it("re-checks health on the polling interval so recovery is reflected", async () => {
    // Fake timers only here, and no waitFor-style queries: their internal
    // polling deadlocks when timers don't advance.
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new Error("boom")) // orders, initial check
        .mockRejectedValueOnce(new Error("boom")) // catalog, initial check
        .mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal("fetch", fetchMock);

      render(<App />);
      await act(async () => {}); // flush the initial checks
      const items = screen.getAllByRole("listitem");
      expect(items.map((li) => li.textContent)).toEqual([
        expect.stringMatching(/unreachable/),
        expect.stringMatching(/unreachable/),
      ]);

      // Advance past the 30s poll; both services must flip to healthy.
      await act(async () => {
        vi.advanceTimersByTime(31_000);
      });
      expect(items.map((li) => li.textContent)).toEqual([
        expect.stringMatching(/healthy/),
        expect.stringMatching(/healthy/),
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(4); // 2 services x 2 checks
    } finally {
      vi.useRealTimers();
    }
  });
});
