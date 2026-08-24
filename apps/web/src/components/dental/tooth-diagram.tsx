import {
  ADULT_FDI_TEETH,
  compareNormalizedToothConnections,
  normalizeConnectionPair,
  type AdultFdiTooth,
  type AnatomicalScopeType,
  type ToothConnectionView,
} from "@dental-lab/shared";
import type { CSSProperties, MouseEvent } from "react";

import "./tooth-diagram.css";

export type ToothDiagramMode = "create" | "edit" | "readOnly" | "technician-operation-selection";

export interface ToothDiagramConnection {
  readonly toothA: number;
  readonly toothB: number;
  readonly id?: string;
}

export interface ToothDiagramProps {
  readonly mode?: ToothDiagramMode;
  readonly selectedTeeth?: readonly AdultFdiTooth[];
  readonly configuredTeeth?: readonly AdultFdiTooth[];
  readonly focusedTooth?: AdultFdiTooth | null;
  readonly disabledTeeth?: readonly AdultFdiTooth[];
  readonly availableTeeth?: readonly AdultFdiTooth[];
  readonly connectionTeeth?: readonly AdultFdiTooth[];
  readonly semanticScope?: Extract<AnatomicalScopeType, "UPPER_ARCH" | "LOWER_ARCH" | "BOTH_ARCHES"> | null;
  readonly connections?: readonly (ToothDiagramConnection | ToothConnectionView)[];
  readonly onToothToggle?: (tooth: AdultFdiTooth) => void;
  readonly onConnectionToggle?: (connection: { readonly toothA: AdultFdiTooth; readonly toothB: AdultFdiTooth }) => void;
  readonly onShortcut?: (teeth: readonly AdultFdiTooth[]) => void;
  readonly showShortcuts?: boolean;
  readonly className?: string;
}

const UPPER_TEETH = ADULT_FDI_TEETH.slice(0, 16);
const LOWER_TEETH = ADULT_FDI_TEETH.slice(16);
const MIRROR_SOURCE_BY_TOOTH: Readonly<Record<number, number>> = {
  21: 11, 22: 12, 23: 13, 24: 14, 25: 15, 26: 16, 27: 17, 28: 18,
  31: 41, 32: 42, 33: 43, 34: 44, 35: 45, 36: 46, 37: 47, 38: 48,
};
const CANONICAL_ORDER = new Map<number, number>(ADULT_FDI_TEETH.map((tooth, index) => [tooth, index]));
const SOURCE_VISIBLE_HEIGHT_RATIO: Readonly<Record<number, number>> = {
  11: 481 / 556, 12: 461 / 555, 13: 541 / 557, 14: 451 / 557,
  15: 419 / 558, 16: 405 / 558, 17: 363 / 558, 18: 414 / 557,
  41: 357 / 471, 42: 357 / 471, 43: 402 / 468, 44: 392 / 470,
  45: 385 / 471, 46: 361 / 466, 47: 358 / 470, 48: 323 / 471,
};
const TARGET_VISIBLE_HEIGHT_RATIO = 0.865;

export interface ToothAssetPresentation {
  readonly normalizationScale: number;
  readonly source: number;
  readonly visibleHeightRatio: number;
}

export function getToothAssetPath(tooth: AdultFdiTooth): string {
  const source = MIRROR_SOURCE_BY_TOOTH[tooth] ?? tooth;
  return `${import.meta.env.BASE_URL}dinti/${source}.png`;
}

export function isMirroredTooth(tooth: AdultFdiTooth): boolean {
  return Object.prototype.hasOwnProperty.call(MIRROR_SOURCE_BY_TOOTH, tooth);
}

export function getToothAssetPresentation(tooth: AdultFdiTooth): ToothAssetPresentation {
  const source = MIRROR_SOURCE_BY_TOOTH[tooth] ?? tooth;
  const visibleHeightRatio = SOURCE_VISIBLE_HEIGHT_RATIO[source]!;
  return { normalizationScale: TARGET_VISIBLE_HEIGHT_RATIO / visibleHeightRatio, source, visibleHeightRatio };
}

export function ToothDiagram({
  mode = "create",
  selectedTeeth = [],
  configuredTeeth = [],
  focusedTooth = null,
  disabledTeeth = [],
  availableTeeth,
  connectionTeeth,
  semanticScope = null,
  connections = [],
  onToothToggle,
  onConnectionToggle,
  onShortcut,
  showShortcuts = true,
  className,
}: ToothDiagramProps) {
  const selected = new Set(selectedTeeth);
  const configured = new Set(configuredTeeth);
  const disabled = new Set(disabledTeeth);
  const available = availableTeeth ? new Set(availableTeeth) : new Set<AdultFdiTooth>(ADULT_FDI_TEETH);
  const connectionAvailable = connectionTeeth ? new Set(connectionTeeth) : available;
  const normalizedConnections = connections
    .map((connection) => normalizeConnectionPair(connection.toothA, connection.toothB))
    .filter((connection): connection is { toothA: AdultFdiTooth; toothB: AdultFdiTooth } => connection !== null)
    .sort(compareNormalizedToothConnections);
  const canMutateTeeth = mode !== "readOnly" && onToothToggle !== undefined;
  const canMutateConnections = (mode === "create" || mode === "edit") && onConnectionToggle !== undefined;

  return (
    <section
      aria-label="Compoziția dentară"
      className={["tooth-diagram", className].filter(Boolean).join(" ")}
      data-mode={mode}
    >
      {showShortcuts ? (
        <div className="tooth-diagram__shortcuts" aria-label="Scurtături dentare">
          <ShortcutButton label="Arcada superioară" teeth={UPPER_TEETH} onShortcut={onShortcut} />
          <ShortcutButton label="Arcada inferioară" teeth={LOWER_TEETH} onShortcut={onShortcut} />
          <ShortcutButton label="Ambele arcade" teeth={ADULT_FDI_TEETH} onShortcut={onShortcut} />
          <ShortcutButton label="Șterge selecția" teeth={[]} onShortcut={onShortcut} />
        </div>
      ) : null}

      <div className="tooth-diagram__arches">
        <ArchRow
          arch="upper"
          teeth={UPPER_TEETH}
          selected={selected}
          configured={configured}
          disabled={disabled}
          available={available}
          connectionAvailable={connectionAvailable}
          focusedTooth={focusedTooth}
          semanticScope={semanticScope}
          connections={normalizedConnections}
          canMutateTeeth={canMutateTeeth}
          canMutateConnections={canMutateConnections}
          onToothToggle={onToothToggle}
          onConnectionToggle={onConnectionToggle}
        />
        <ArchRow
          arch="lower"
          teeth={LOWER_TEETH}
          selected={selected}
          configured={configured}
          disabled={disabled}
          available={available}
          connectionAvailable={connectionAvailable}
          focusedTooth={focusedTooth}
          semanticScope={semanticScope}
          connections={normalizedConnections}
          canMutateTeeth={canMutateTeeth}
          canMutateConnections={canMutateConnections}
          onToothToggle={onToothToggle}
          onConnectionToggle={onConnectionToggle}
        />
      </div>
    </section>
  );
}

interface ArchRowProps {
  readonly arch: "upper" | "lower";
  readonly teeth: readonly AdultFdiTooth[];
  readonly selected: ReadonlySet<AdultFdiTooth>;
  readonly configured: ReadonlySet<AdultFdiTooth>;
  readonly disabled: ReadonlySet<AdultFdiTooth>;
  readonly available: ReadonlySet<AdultFdiTooth>;
  readonly connectionAvailable: ReadonlySet<AdultFdiTooth>;
  readonly focusedTooth: AdultFdiTooth | null;
  readonly semanticScope: ToothDiagramProps["semanticScope"];
  readonly connections: readonly { readonly toothA: AdultFdiTooth; readonly toothB: AdultFdiTooth }[];
  readonly canMutateTeeth: boolean;
  readonly canMutateConnections: boolean;
  readonly onToothToggle?: ((tooth: AdultFdiTooth) => void) | undefined;
  readonly onConnectionToggle?: ToothDiagramProps["onConnectionToggle"] | undefined;
}

function ArchRow(props: ArchRowProps) {
  const semantic = props.semanticScope === "BOTH_ARCHES" || props.semanticScope === (props.arch === "upper" ? "UPPER_ARCH" : "LOWER_ARCH");
  return (
    <div className={["tooth-diagram__arch", semantic ? "tooth-diagram__arch--semantic" : ""].filter(Boolean).join(" ")} data-arch={props.arch}>
      <div className="tooth-diagram__arch-scroll">
        <div className="tooth-diagram__arch-row">
          {props.teeth.map((tooth, index) => (
            <div
              className={["tooth-diagram__position", index === props.teeth.length - 1 ? "tooth-diagram__position--last" : ""].filter(Boolean).join(" ")}
              key={tooth}
            >
              <ToothButton
                tooth={tooth}
                selected={props.selected.has(tooth)}
                configured={props.configured.has(tooth)}
                focused={props.focusedTooth === tooth}
                disabled={props.disabled.has(tooth) || !props.available.has(tooth)}
                canMutate={props.canMutateTeeth}
                onToggle={props.onToothToggle}
              />
              {index < props.teeth.length - 1 ? (
                <ConnectionButton
                  toothA={tooth}
                  toothB={props.teeth[index + 1]!}
                  active={hasConnection(props.connections, tooth, props.teeth[index + 1]!)}
                  available={props.connectionAvailable.has(tooth) && props.connectionAvailable.has(props.teeth[index + 1]!)}
                  canMutate={props.canMutateConnections}
                  onToggle={props.onConnectionToggle}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ToothButtonProps {
  readonly tooth: AdultFdiTooth;
  readonly selected: boolean;
  readonly configured: boolean;
  readonly focused: boolean;
  readonly disabled: boolean;
  readonly canMutate: boolean;
  readonly onToggle?: ((tooth: AdultFdiTooth) => void) | undefined;
}

function ToothButton({ tooth, selected, configured, focused, disabled, canMutate, onToggle }: ToothButtonProps) {
  const stateLabel = disabled ? "indisponibil" : selected ? "selectat" : configured ? "configurat" : "neselectat";
  return (
    <button
      aria-label={`Dinte ${tooth}`}
      aria-pressed={selected}
      className={["tooth-diagram__tooth", selected ? "tooth-diagram__tooth--selected" : "", configured ? "tooth-diagram__tooth--configured" : "", focused ? "tooth-diagram__tooth--focused" : "", disabled ? "tooth-diagram__tooth--disabled" : ""].filter(Boolean).join(" ")}
      disabled={disabled || !canMutate}
      onClick={() => onToggle?.(tooth)}
      style={{
        "--tooth-asset-height-scale": getToothAssetPresentation(tooth).normalizationScale,
        "--tooth-order": CANONICAL_ORDER.get(tooth),
      } as CSSProperties}
      type="button"
    >
      <span className="tooth-diagram__tooth-image-wrap">
        <img
          alt=""
          className={["tooth-diagram__tooth-image", isMirroredTooth(tooth) ? "tooth-diagram__tooth-image--mirrored" : ""].filter(Boolean).join(" ")}
          draggable={false}
          src={getToothAssetPath(tooth)}
        />
      </span>
      <span className="tooth-diagram__tooth-number">{tooth}</span>
      <span className="tooth-diagram__sr-only">, {stateLabel}</span>
    </button>
  );
}

interface ConnectionButtonProps {
  readonly toothA: AdultFdiTooth;
  readonly toothB: AdultFdiTooth;
  readonly active: boolean;
  readonly available: boolean;
  readonly canMutate: boolean;
  readonly onToggle?: ToothDiagramProps["onConnectionToggle"] | undefined;
}

function ConnectionButton({ toothA, toothB, active, available, canMutate, onToggle }: ConnectionButtonProps) {
  const disabled = !available || !canMutate;
  return (
    <button
      aria-label={`Conexiune între dinții ${toothA} și ${toothB}`}
      aria-pressed={active}
      className={["tooth-diagram__connection", active ? "tooth-diagram__connection--active" : "", !available ? "tooth-diagram__connection--unavailable" : ""].filter(Boolean).join(" ")}
      data-connection={`${toothA}-${toothB}`}
      disabled={disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onToggle?.(normalizeConnectionPair(toothA, toothB)!);
      }}
      type="button"
    >
      <span aria-hidden="true" />
      <span className="tooth-diagram__sr-only">{active ? ", conectată" : available ? ", disponibilă" : ", indisponibilă"}</span>
    </button>
  );
}

function ShortcutButton({ label, teeth, onShortcut }: { readonly label: string; readonly teeth: readonly AdultFdiTooth[]; readonly onShortcut?: ((teeth: readonly AdultFdiTooth[]) => void) | undefined }) {
  return (
    <button className="tooth-diagram__shortcut" onClick={() => onShortcut?.(teeth)} type="button">
      {label}
    </button>
  );
}

function hasConnection(connections: readonly { readonly toothA: AdultFdiTooth; readonly toothB: AdultFdiTooth }[], toothA: AdultFdiTooth, toothB: AdultFdiTooth): boolean {
  const pair = normalizeConnectionPair(toothA, toothB);
  return pair !== null && connections.some((connection) => connection.toothA === pair.toothA && connection.toothB === pair.toothB);
}
