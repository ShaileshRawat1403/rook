import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConfiguredSentinelMode,
  getSentinel,
  setConfiguredSentinelMode,
  __setSentinelForTesting,
} from "./index";

const mockInvokeTauri = vi.fn();
let tauriAvailable = false;

vi.mock("@/shared/api/tauri", () => ({
  invokeTauri: (...args: unknown[]) => mockInvokeTauri(...args),
  isTauriRuntimeAvailable: () => tauriAvailable,
}));

describe("sentinel mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockInvokeTauri.mockReset();
    tauriAvailable = false;
    __setSentinelForTesting(null);
  });

  it("defaults to off without a UI setting or Tauri env fallback", async () => {
    await expect(getConfiguredSentinelMode()).resolves.toBe("off");
    await expect(getSentinel()).resolves.toMatchObject({ mode: "off" });
  });

  it("uses the UI setting without reconnecting ACP", async () => {
    setConfiguredSentinelMode("dax_open");

    await expect(getConfiguredSentinelMode()).resolves.toBe("dax_open");
    await expect(getSentinel()).resolves.toMatchObject({ mode: "dax_open" });
  });

  it("keeps ROOK_SENTINEL=dax compatibility when no UI setting exists", async () => {
    tauriAvailable = true;
    mockInvokeTauri.mockResolvedValue("dax");

    await expect(getConfiguredSentinelMode()).resolves.toBe("dax_open");
  });
});
