import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

const USER = { id: "u1", name: "Test User", email: "test@example.com", plan: "free" };

let rendersSeen: (string | null)[] = [];

function Probe() {
  const { user, token, login, logout } = useAuth();
  rendersSeen.push(user?.name ?? null);
  return (
    <div>
      <p data-testid="user">{user ? user.name : "logged out"}</p>
      <p data-testid="token">{token ?? "none"}</p>
      <button onClick={() => login("new-token", USER)}>log in</button>
      <button onClick={logout}>log out</button>
    </div>
  );
}

const renderWithProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

beforeEach(() => {
  localStorage.clear();
  rendersSeen = [];
});

describe("AuthProvider", () => {
  it("starts logged out when nothing is saved", () => {
    renderWithProvider();
    expect(screen.getByTestId("user")).toHaveTextContent("logged out");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
  });

  it("restores a saved session on the very first render, with no logged-out flash", () => {
    localStorage.setItem("token", "saved-token");
    localStorage.setItem("user", JSON.stringify(USER));

    renderWithProvider();

    expect(rendersSeen[0]).toBe("Test User");
    expect(rendersSeen).not.toContain(null);
    expect(screen.getByTestId("token")).toHaveTextContent("saved-token");
  });

  it("ignores a token saved without a user", () => {
    localStorage.setItem("token", "orphaned-token");
    renderWithProvider();
    expect(screen.getByTestId("user")).toHaveTextContent("logged out");
  });

  it("treats a corrupt saved user as logged out instead of crashing", () => {
    localStorage.setItem("token", "saved-token");
    localStorage.setItem("user", "{not valid json");

    renderWithProvider();

    expect(screen.getByTestId("user")).toHaveTextContent("logged out");
  });

  it("stores a new session in state and localStorage on login", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "log in" }));

    expect(screen.getByTestId("user")).toHaveTextContent("Test User");
    expect(localStorage.getItem("token")).toBe("new-token");
    expect(JSON.parse(localStorage.getItem("user")!)).toEqual(USER);
  });

  it("clears state and localStorage on logout", async () => {
    localStorage.setItem("token", "saved-token");
    localStorage.setItem("user", JSON.stringify(USER));
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "log out" }));

    expect(screen.getByTestId("user")).toHaveTextContent("logged out");
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});

describe("useAuth", () => {
  it("throws a clear error when used outside an AuthProvider", () => {
    // React logs the thrown error before re-throwing; keep test output readable
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useAuth must be used within an AuthProvider");
  });
});
