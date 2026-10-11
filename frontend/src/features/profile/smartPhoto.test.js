import { describe, it, expect, vi } from "vitest";
import { suggestCrop, checkCrop, decodePhoto } from "./smartPhoto";
describe("Smart photo crop rules", () => {
  it.each([
    [4000, 3000],
    [3000, 4000],
    [700, 900],
  ])("automatically crops %sx%s to passport proportions", (w, h) => {
    const area = suggestCrop(w, h);
    expect(area.width / area.height).toBeCloseTo(7 / 9, 2);
    expect(area.x).toBeGreaterThanOrEqual(0);
    expect(area.y).toBeGreaterThanOrEqual(0);
    expect(area.x + area.width).toBeLessThanOrEqual(w);
    expect(area.y + area.height).toBeLessThanOrEqual(h);
    expect(() => checkCrop(area)).not.toThrow();
  });
  it("centers a detected face and preserves head/shoulder space", () => {
    const area = suggestCrop(3000, 4000, {
      x: 1600,
      y: 700,
      width: 400,
      height: 500,
    });
    expect(area.x + area.width / 2).toBeCloseTo(1800, 0);
    expect(area.y).toBeLessThan(700);
    expect(area.y + area.height).toBeGreaterThan(1200);
  });
  it("never accepts a low-resolution crop or excessive zoom", () => {
    expect(() => checkCrop(suggestCrop(280, 360))).toThrow("too small");
    expect(() => checkCrop({ width: 349, height: 450 })).toThrow("too small");
  });
  it("rejects oversized and forged files with friendly messages", async () => {
    await expect(decodePhoto({ size: 10 * 1024 * 1024 + 1 })).rejects.toThrow(
      "too large",
    );
    await expect(
      decodePhoto({
        size: 10,
        slice: () => ({ arrayBuffer: async () => new Uint8Array(16).buffer }),
      }),
    ).rejects.toThrow("Please choose");
  });
  it("provides a helpful fallback when the browser cannot decode HEIC", async () => {
    const bytes = new Uint8Array(16);
    bytes.set([102, 116, 121, 112], 4);
    bytes.set([104, 101, 105, 99], 8);
    const file = {
      size: 16,
      slice: () => ({ arrayBuffer: async () => bytes.buffer }),
    };
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("unsupported")),
    );
    vi.stubGlobal(
      "Image",
      class {
        set src(value) {
          queueMicrotask(() => this.onerror());
        }
      },
    );
    const oldCreate = URL.createObjectURL,
      oldRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = vi.fn();
    try {
      await expect(decodePhoto(file)).rejects.toThrow(
        "Your browser cannot open this HEIC photo",
      );
    } finally {
      vi.unstubAllGlobals();
      URL.createObjectURL = oldCreate;
      URL.revokeObjectURL = oldRevoke;
    }
  });
});
