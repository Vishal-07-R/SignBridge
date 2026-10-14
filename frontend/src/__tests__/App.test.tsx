import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "../App.tsx";

describe("App Scaffold Component", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "ok",
              app_name: "AI SignBridge Test",
              version: "0.1.0-scaffold",
              environment: "testing",
              timestamp: new Date().toISOString(),
            }),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders branding header and scaffold badge", async () => {
    render(<App />);
    expect(screen.getByText("AI SignBridge")).toBeInTheDocument();
    expect(screen.getByText("Stage 1 Scaffold")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/API Connected/i)).toBeInTheDocument();
    });
  });

  it("renders all three primary action buttons prominently", async () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /start translating/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open camera/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload video/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/API Connected/i)).toBeInTheDocument();
    });
  });

  it("renders both direction cards", async () => {
    render(<App />);
    expect(screen.getByText(/Direction A: Text & Media to ISL/i)).toBeInTheDocument();
    expect(screen.getByText(/Direction B: ISL to Text/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/API Connected/i)).toBeInTheDocument();
    });
  });

  it("fetches backend health and displays connected status", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/API Connected \(0.1.0-scaffold\)/i)).toBeInTheDocument();
    });
  });
});
