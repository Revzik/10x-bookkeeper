/**
 * Example component test using React Testing Library
 * Demonstrates testing UI components with Vitest
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils/test-utils";
import { BookStatusBadge } from "./BookStatusBadge";

describe("BookStatusBadge", () => {
  it('should render "Want to Read" status correctly', () => {
    render(<BookStatusBadge status="want_to_read" />);

    const badge = screen.getByText("Want to Read");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-100", "text-blue-800");
  });

  it('should render "Reading" status correctly', () => {
    render(<BookStatusBadge status="reading" />);

    const badge = screen.getByText("Reading");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-green-100", "text-green-800");
  });

  it('should render "Completed" status correctly', () => {
    render(<BookStatusBadge status="completed" />);

    const badge = screen.getByText("Completed");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-gray-100", "text-gray-800");
  });

  it("should apply consistent badge styling", () => {
    const { container } = render(<BookStatusBadge status="reading" />);

    const badge = container.querySelector("span");
    expect(badge).toHaveClass(
      "inline-flex",
      "items-center",
      "rounded-full",
      "px-2.5",
      "py-0.5",
      "text-xs",
      "font-medium"
    );
  });
});
