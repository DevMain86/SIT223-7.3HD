import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Rating from "./Rating";

describe("Rating", () => {
  it("displays the score", () => {
    render(<Rating score={4.5} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("renders a star icon alongside the score", () => {
    const { container } = render(<Rating score={3} />);
    expect(container.querySelector(".rating svg")).toBeInTheDocument();
  });
});