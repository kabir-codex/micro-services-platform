import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
