import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest globals are off, so Testing Library's automatic cleanup never
// registers itself; without this, rendered DOM leaks across tests.
afterEach(() => {
  cleanup();
});
