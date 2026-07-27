import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { Button } from "./button.js";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field.js";

export interface SignaturePoint {
  readonly t: number;
  readonly x: number;
  readonly y: number;
}

export interface SignatureStroke {
  readonly points: readonly SignaturePoint[];
}

export interface SignatureValue {
  readonly strokes: readonly SignatureStroke[];
}

export interface SignaturePadProps {
  readonly disabled?: boolean;
  readonly error?: string;
  readonly height?: number;
  readonly label: string;
  readonly minPoints?: number;
  readonly onChange: (value: SignatureValue) => void;
  readonly readOnly?: boolean;
  readonly value: SignatureValue;
}

export interface SignatureDisplayProps {
  readonly height?: number;
  readonly label?: string;
  readonly value: SignatureValue | null;
}

const emptySignature: SignatureValue = { strokes: [] };

export function SignaturePad({ disabled = false, error, height = 220, label, minPoints = 8, onChange, readOnly = false, value }: SignaturePadProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const activeStrokeRef = useRef<SignaturePoint[]>([]);
  const labelId = useId();
  const isDisabled = disabled || readOnly;
  const pointCount = countPoints(value);

  useCanvasRenderer(canvasRef, value, height);

  function commit(strokes: readonly SignatureStroke[]): void {
    onChange({ strokes });
  }

  function appendPoint(event: PointerEvent<HTMLCanvasElement>): void {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    activeStrokeRef.current = [
      ...activeStrokeRef.current,
      {
        t: Date.now(),
        x: clamp((event.clientX - rect.left) / rect.width),
        y: clamp((event.clientY - rect.top) / rect.height),
      },
    ];
    drawSignature(canvas, { strokes: [...value.strokes, { points: activeStrokeRef.current }] });
  }

  return (
    <Field>
      <FieldLabel id={labelId}>{label}</FieldLabel>
      <div className="dl-signature-pad">
        <canvas
          aria-describedby={error ? `${labelId}-error` : undefined}
          aria-invalid={Boolean(error)}
          aria-labelledby={labelId}
          className="dl-signature-pad__canvas"
          height={height}
          onPointerCancel={(event) => {
            if (activePointerRef.current === event.pointerId) {
              activePointerRef.current = null;
              activeStrokeRef.current = [];
            }
          }}
          onPointerDown={(event) => {
            if (isDisabled) {
              return;
            }
            event.currentTarget.setPointerCapture(event.pointerId);
            activePointerRef.current = event.pointerId;
            activeStrokeRef.current = [];
            appendPoint(event);
          }}
          onPointerMove={(event) => {
            if (activePointerRef.current === event.pointerId && !isDisabled) {
              appendPoint(event);
            }
          }}
          onPointerUp={(event) => {
            if (activePointerRef.current !== event.pointerId || isDisabled) {
              return;
            }
            appendPoint(event);
            activePointerRef.current = null;
            const nextStroke = { points: activeStrokeRef.current };
            activeStrokeRef.current = [];
            commit([...value.strokes, nextStroke]);
          }}
          ref={canvasRef}
          role="img"
          style={{ height }}
          tabIndex={isDisabled ? -1 : 0}
          width={640}
        />
        {!readOnly ? (
          <div className="dl-signature-pad__actions">
            <Button disabled={disabled || value.strokes.length === 0} onClick={() => commit(emptySignature.strokes)} size="small" type="button" variant="outline">Șterge</Button>
            <Button disabled={disabled || value.strokes.length === 0} onClick={() => commit(value.strokes.slice(0, -1))} size="small" type="button" variant="outline">Anulează ultima linie</Button>
          </div>
        ) : null}
      </div>
      <FieldDescription>{pointCount < minPoints ? `Sunt necesare minimum ${minPoints} puncte pentru o semnătură validă.` : "Semnătura este utilizată ca dovadă operațională internă de predare."}</FieldDescription>
      {error ? <FieldError id={`${labelId}-error`}>{error}</FieldError> : null}
    </Field>
  );
}

export function SignatureDisplay({ height = 180, label = "Semnătură", value }: SignatureDisplayProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useCanvasRenderer(canvasRef, value ?? emptySignature, height);
  if (!value || value.strokes.length === 0) {
    return <div className="dl-signature-display dl-signature-display--empty">Finalizată fără semnătură</div>;
  }
  return <canvas aria-label={label} className="dl-signature-display" height={height} ref={canvasRef} role="img" style={{ height }} width={640} />;
}

function useCanvasRenderer(ref: React.RefObject<HTMLCanvasElement | null>, value: SignatureValue, height: number): void {
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) {
      return;
    }
    const resize = () => setWidth(Math.max(280, Math.round(canvas.getBoundingClientRect().width)));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) {
      return;
    }
    canvas.width = width;
    canvas.height = height;
    drawSignature(canvas, value);
  }, [height, ref, value, width]);
}

function drawSignature(canvas: HTMLCanvasElement, value: SignatureValue): void {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const displayWidth = Math.max(1, Math.round(rect.width || canvas.width));
  const displayHeight = Math.max(1, Math.round(rect.height || canvas.height));
  canvas.width = Math.round(displayWidth * ratio);
  canvas.height = Math.round(displayHeight * ratio);
  canvas.style.width = "100%";
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, displayWidth, displayHeight);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 2.4;
  context.strokeStyle = "#10231f";
  for (const stroke of value.strokes) {
    context.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * displayWidth;
      const y = point.y * displayHeight;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();
  }
}

function countPoints(value: SignatureValue): number {
  return value.strokes.reduce((total, stroke) => total + stroke.points.length, 0);
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
