import { formatApplicationTitle } from "@dental-lab/shared";
import type { CSSProperties, ReactNode } from "react";

import "./style-preview-page.css";

interface ColorTokenPreview {
  readonly name: string;
  readonly backgroundToken: string;
  readonly foregroundToken?: string;
}

interface SpaceTokenPreview {
  readonly name: string;
  readonly sizeToken: string;
}

type CustomPropertyStyle<PropertyName extends string> = CSSProperties &
  Record<PropertyName, string>;

const colorTokens: readonly ColorTokenPreview[] = [
  { name: "Background", backgroundToken: "--dl-color-background" },
  { name: "Surface", backgroundToken: "--dl-color-surface" },
  {
    name: "Accent",
    backgroundToken: "--dl-color-accent",
    foregroundToken: "#ffffff",
  },
  {
    name: "Success",
    backgroundToken: "--dl-color-success-background",
    foregroundToken: "--dl-color-success-foreground",
  },
  {
    name: "Warning",
    backgroundToken: "--dl-color-warning-background",
    foregroundToken: "--dl-color-warning-foreground",
  },
  {
    name: "Danger",
    backgroundToken: "--dl-color-danger-background",
    foregroundToken: "--dl-color-danger-foreground",
  },
  {
    name: "Info",
    backgroundToken: "--dl-color-info-background",
    foregroundToken: "--dl-color-info-foreground",
  },
  {
    name: "Neutral",
    backgroundToken: "--dl-color-neutral-background",
    foregroundToken: "--dl-color-neutral-foreground",
  },
];

const statusTokens: readonly ColorTokenPreview[] = [
  {
    name: "Registered",
    backgroundToken: "--dl-status-registered-background",
    foregroundToken: "--dl-status-registered-foreground",
  },
  {
    name: "Production",
    backgroundToken: "--dl-status-production-background",
    foregroundToken: "--dl-status-production-foreground",
  },
  {
    name: "Quality",
    backgroundToken: "--dl-status-quality-background",
    foregroundToken: "--dl-status-quality-foreground",
  },
  {
    name: "Rejected",
    backgroundToken: "--dl-status-rejected-background",
    foregroundToken: "--dl-status-rejected-foreground",
  },
  {
    name: "Delivery",
    backgroundToken: "--dl-status-delivery-background",
    foregroundToken: "--dl-status-delivery-foreground",
  },
  {
    name: "Closed",
    backgroundToken: "--dl-status-closed-background",
    foregroundToken: "--dl-status-closed-foreground",
  },
];

const spaceTokens: readonly SpaceTokenPreview[] = [
  { name: "2", sizeToken: "--dl-space-2" },
  { name: "4", sizeToken: "--dl-space-4" },
  { name: "6", sizeToken: "--dl-space-6" },
  { name: "8", sizeToken: "--dl-space-8" },
  { name: "12", sizeToken: "--dl-space-12" },
];

function createTokenStyle(tokenName: string): string {
  return `var(${tokenName})`;
}

function createSpaceSizeStyle(sizeToken: string): CustomPropertyStyle<"--space-size"> {
  return {
    "--space-size": createTokenStyle(sizeToken),
  };
}

function createStackGapStyle(gapToken: string): CustomPropertyStyle<"--dl-stack-gap"> {
  return {
    "--dl-stack-gap": createTokenStyle(gapToken),
  };
}

function renderColorSwatch(token: ColorTokenPreview): ReactNode {
  return (
    <div
      className="style-preview__swatch"
      key={token.name}
      style={{
        background: createTokenStyle(token.backgroundToken),
        color:
          token.foregroundToken === undefined
            ? "var(--dl-color-text)"
            : createTokenStyle(token.foregroundToken),
      }}
    >
      <div className="style-preview__swatch-name">{token.name}</div>
      <div className="style-preview__swatch-value">{token.backgroundToken}</div>
    </div>
  );
}

function renderSpaceSample(token: SpaceTokenPreview): ReactNode {
  return (
    <div className="dl-stack" key={token.name}>
      <div
        className="style-preview__space"
        style={createSpaceSizeStyle(token.sizeToken)}
      />
      <span className="style-preview__swatch-value">{token.sizeToken}</span>
    </div>
  );
}

export function StylePreviewPage(): ReactNode {
  return (
    <main className="dl-page style-preview">
      <div className="dl-container">
        <header className="style-preview__header">
          <p className="style-preview__eyebrow">UI-001</p>
          <h1 className="style-preview__title">{formatApplicationTitle("Design Foundation")}</h1>
          <p className="style-preview__summary">
            Internal preview for design tokens, base styles, responsive layout, native
            controls, and accessibility states.
          </p>
        </header>

        <div className="dl-stack" style={createStackGapStyle("--dl-space-8")}>
          <section className="style-preview__panel dl-stack" aria-labelledby="colors-title">
            <h2 id="colors-title">Semantic Colors</h2>
            <div className="dl-grid">{colorTokens.map(renderColorSwatch)}</div>
          </section>

          <section className="style-preview__panel dl-stack" aria-labelledby="statuses-title">
            <h2 id="statuses-title">Operational Status Colors</h2>
            <div className="dl-grid">{statusTokens.map(renderColorSwatch)}</div>
          </section>

          <section className="style-preview__panel dl-stack" aria-labelledby="type-title">
            <h2 id="type-title">Typography</h2>
            <div className="style-preview__type-scale">
              <p className="style-preview__type-display">Display text</p>
              <p className="style-preview__type-page">Page title</p>
              <p className="style-preview__type-section">Section title</p>
              <p>Body text designed for long operational work sessions.</p>
              <small>Small text and captions remain legible on mobile.</small>
            </div>
          </section>

          <section className="style-preview__panel dl-stack" aria-labelledby="spacing-title">
            <h2 id="spacing-title">Spacing</h2>
            <div className="style-preview__sample-row">{spaceTokens.map(renderSpaceSample)}</div>
          </section>

          <section className="style-preview__panel dl-stack" aria-labelledby="controls-title">
            <h2 id="controls-title">Native Control States</h2>
            <div className="style-preview__sample-row">
              <button className="style-preview__native-button" type="button">
                Focusable action
              </button>
              <button
                className="style-preview__native-button style-preview__native-button--secondary"
                disabled
                type="button"
              >
                Disabled action
              </button>
            </div>
            <form className="style-preview__form">
              <label className="style-preview__label" htmlFor="preview-input">
                Native input
              </label>
              <input id="preview-input" placeholder="Search by lucrare, medic, cabinet" />
              <label className="style-preview__label" htmlFor="preview-invalid-input">
                Native invalid input
              </label>
              <input
                aria-describedby="preview-invalid-input-error"
                aria-invalid="true"
                id="preview-invalid-input"
                placeholder="Required field"
              />
              <small id="preview-invalid-input-error">
                Error state uses semantic danger tokens and remains text-backed.
              </small>
              <label className="style-preview__label" htmlFor="preview-textarea">
                Native textarea
              </label>
              <textarea id="preview-textarea" placeholder="Operational note" />
              <label className="style-preview__label" htmlFor="preview-select">
                Native select
              </label>
              <select id="preview-select">
                <option>Planned</option>
                <option>In production</option>
                <option>Ready for delivery</option>
              </select>
            </form>
          </section>

          <section className="style-preview__surface-elevated dl-stack" aria-labelledby="surface-title">
            <h2 id="surface-title">Elevation</h2>
            <p>
              Elevated surfaces use restrained shadows and borders so operational screens
              remain calm and readable.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
