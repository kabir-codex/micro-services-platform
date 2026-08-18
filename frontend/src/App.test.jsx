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
});
