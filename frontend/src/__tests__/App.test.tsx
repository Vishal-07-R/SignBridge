import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { App } from "../App.tsx";

describe("App Scaffold & Foundation Component", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/v1/signs")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  id: "1",
                  gloss: "HELLO",
                  category: "greetings",
                  description: "Standard greeting",
                  is_demo: true,
                  is_reviewed: false,
                  linguist_notes: "needs linguist review",
                },
              ]),
          });
        }
        if (url.includes("/api/v1/auth/me")) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ detail: "Not authenticated" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "ok",
              app_name: "AI SignBridge Test",
              version: "0.1.0-scaffold",
              environment: "testing",
              timestamp: new Date().toISOString(),
            }),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders branding header, scaffold badge, and stage 2 foundation badge", async () => {
    render(<App />);
    expect(screen.getByText("AI SignBridge")).toBeInTheDocument();
    expect(screen.getByText("Stage 1 Scaffold")).toBeInTheDocument();
    expect(screen.getByText("Stage 2 Foundation")).toBeInTheDocument();
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

  it("opens auth modal when clicking Sign In", async () => {
    render(<App />);
    const signInBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(signInBtn);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Sign In to AI SignBridge/i)).toBeInTheDocument();
    });
  });

  it("renders DEMO vocabulary honesty notice", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Demo Seed: Needs Linguist Review/i)).toBeInTheDocument();
    });
  });
});
