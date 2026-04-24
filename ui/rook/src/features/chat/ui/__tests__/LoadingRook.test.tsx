import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingRook } from "../LoadingRook";
import chat from "@/shared/i18n/locales/en/chat.json";

const { thinking, responding, compacting } = chat.loading;

describe("LoadingRook", () => {
  it("renders thinking copy for the thinking state", () => {
    render(<LoadingRook chatState="thinking" />);

    expect(screen.getByRole("status", { name: thinking })).toBeInTheDocument();
  });

  it("renders responding copy for active response states", () => {
    const { rerender } = render(<LoadingRook chatState="streaming" />);

    expect(
      screen.getByRole("status", { name: responding }),
    ).toBeInTheDocument();

    rerender(<LoadingRook chatState="waiting" />);
    expect(
      screen.getByRole("status", { name: responding }),
    ).toBeInTheDocument();
  });

  it("renders compacting copy for the compacting state", () => {
    render(<LoadingRook chatState="compacting" />);

    expect(
      screen.getByRole("status", { name: compacting }),
    ).toBeInTheDocument();
  });

  it("renders nothing while idle", () => {
    const { container } = render(<LoadingRook chatState="idle" />);

    expect(container).toBeEmptyDOMElement();
  });
});
