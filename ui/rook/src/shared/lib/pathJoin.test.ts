import { describe, it, expect } from "vitest";
import { pathJoin } from "./pathJoin";

describe("pathJoin", () => {
  it("joins POSIX paths with a single slash", () => {
    expect(pathJoin("/Users/me/work", "src/main.ts")).toBe(
      "/Users/me/work/src/main.ts",
    );
  });

  it("collapses a trailing slash on the root", () => {
    expect(pathJoin("/Users/me/work/", "src/main.ts")).toBe(
      "/Users/me/work/src/main.ts",
    );
  });

  it("collapses a leading slash on the relative segment", () => {
    expect(pathJoin("/Users/me/work", "/src/main.ts")).toBe(
      "/Users/me/work/src/main.ts",
    );
  });

  it("collapses both at the join point", () => {
    expect(pathJoin("/Users/me/work/", "/src/main.ts")).toBe(
      "/Users/me/work/src/main.ts",
    );
  });

  it("strips leading ./ on the relative segment", () => {
    expect(pathJoin("/work", "./src/main.ts")).toBe("/work/src/main.ts");
  });

  it("preserves the POSIX filesystem root", () => {
    expect(pathJoin("/", "etc/hosts")).toBe("/etc/hosts");
  });

  it("uses backslashes when the root is a Windows path", () => {
    expect(pathJoin("C:\\Users\\me\\work", "src\\main.ts")).toBe(
      "C:\\Users\\me\\work\\src\\main.ts",
    );
  });

  it("preserves a Windows drive root", () => {
    expect(pathJoin("C:\\", "Users\\me")).toBe("C:\\Users\\me");
  });

  it("falls back to forward slashes for mixed-separator roots", () => {
    expect(pathJoin("C:/Users/me", "src/main.ts")).toBe(
      "C:/Users/me/src/main.ts",
    );
  });

  it("returns the relative segment when root is empty", () => {
    expect(pathJoin("", "src/main.ts")).toBe("src/main.ts");
  });

  it("returns the root when relative is empty", () => {
    expect(pathJoin("/Users/me/work", "")).toBe("/Users/me/work");
  });

  it("returns root unchanged when relative is only separators", () => {
    expect(pathJoin("/Users/me/work", "//")).toBe("/Users/me/work");
  });

  it("handles nested relative paths with multiple separators", () => {
    expect(pathJoin("/work", "src///nested/file.ts")).toBe(
      "/work/src///nested/file.ts",
    );
  });
});
