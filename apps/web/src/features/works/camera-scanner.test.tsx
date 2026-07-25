import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CameraScanner } from "./camera-scanner.js";

describe("CameraScanner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not request camera access before explicit start and stops after detection", async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    });
    const onDetected = vi.fn();

    vi.stubGlobal("BarcodeDetector", class {
      public async detect(): Promise<readonly { readonly rawValue: string }[]> {
        return [{ rawValue: "dl-work:abcdefghijklmnopqrstuvwxyz123456" }];
      }
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      window.setTimeout(() => callback(1), 0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    render(<CameraScanner onDetected={onDetected} />);

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.getByText("Camera este oprită")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Pornește camera" }));

    await waitFor(() => expect(onDetected).toHaveBeenCalledWith("dl-work:abcdefghijklmnopqrstuvwxyz123456"));
    expect(stop).toHaveBeenCalled();
  });

  it("shows manual fallback guidance when BarcodeDetector is unavailable", () => {
    vi.stubGlobal("BarcodeDetector", undefined);

    render(<CameraScanner onDetected={vi.fn()} />);

    expect(screen.getByText("Cameră nesuportată")).toBeDefined();
  });
});
