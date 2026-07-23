import { Button, ErrorState } from "@dental-lab/ui";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface DetectedBarcode {
  readonly rawValue: string;
}

interface BarcodeDetectorInstance {
  readonly detect: (source: CanvasImageSource) => Promise<readonly DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new(options: { readonly formats: readonly string[] }): BarcodeDetectorInstance;
}

type ScannerState = "idle" | "scanning" | "unsupported" | "error" | "detected";

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  return (globalThis as { readonly BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null;
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Permisiunea pentru camera a fost refuzata.";
    }
    if (error.name === "NotFoundError") {
      return "Nu exista o camera disponibila.";
    }
    if (error.name === "NotReadableError") {
      return "Camera nu poate fi folosita de browser.";
    }
  }

  return "Camera nu a putut fi pornita.";
}

export function CameraScanner({
  onDetected,
}: {
  readonly onDetected: (payload: string) => void;
}): ReactNode {
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ScannerState>(() => getBarcodeDetector() ? "idle" : "unsupported");
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lockedRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  function stopCamera(): void {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera(): Promise<void> {
    const Detector = getBarcodeDetector();
    const mediaDevices = navigator.mediaDevices;

    if (!Detector || !mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }

    lockedRef.current = false;
    setError(null);

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState("scanning");
      const detector = new Detector({ formats: ["qr_code"] });

      async function scanFrame(): Promise<void> {
        if (lockedRef.current || !videoRef.current || streamRef.current === null) {
          return;
        }

        try {
          const [result] = await detector.detect(videoRef.current);
          if (result?.rawValue) {
            lockedRef.current = true;
            stopCamera();
            setState("detected");
            onDetected(result.rawValue);
            return;
          }
        } catch {
          setError("Scanarea QR nu a putut procesa cadrul curent.");
          setState("error");
          stopCamera();
          return;
        }

        frameRef.current = window.requestAnimationFrame(() => void scanFrame());
      }

      frameRef.current = window.requestAnimationFrame(() => void scanFrame());
    } catch (caughtError) {
      stopCamera();
      setError(getCameraErrorMessage(caughtError));
      setState("error");
    }
  }

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="work-scan-page__camera">
      <div className="work-scan-page__camera-toolbar">
        <Button disabled={state === "scanning"} onClick={() => void startCamera()}>
          Porneste camera
        </Button>
        <Button disabled={state !== "scanning"} onClick={stopCamera} variant="outline">
          Opreste camera
        </Button>
      </div>

      {state === "unsupported" ? <ErrorState title="Camera nesuportata" description="Browserul nu expune BarcodeDetector pentru QR. Foloseste cautarea manuala." /> : null}
      {error ? <ErrorState title="Camera indisponibila" description={error} /> : null}

      <video
        aria-label="Preview camera"
        className="work-scan-page__video"
        muted
        playsInline
        ref={videoRef}
      />
    </div>
  );
}
