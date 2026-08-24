import { formatApplicationTitle, type AdultFdiTooth } from "@dental-lab/shared";
import {
  Accordion,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  DateInput,
  Drawer,
  EmptyState,
  ErrorState,
  FileUpload,
  FilterBar,
  IconButton,
  LoadingState,
  KpiCard,
  Modal,
  NumberInput,
  PriorityBadge,
  RadioGroup,
  SearchInput,
  Select,
  StatusBadge,
  Stepper,
  Switch,
  Tabs,
  Textarea,
  TextInput,
  Timeline,
  ToastProvider,
  Tooltip,
  useToast,
} from "@dental-lab/ui";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { ToothDiagram } from "../../components/dental/tooth-diagram.js";
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

interface DemoRow {
  readonly id: string;
  readonly owner: string;
  readonly status: string;
}

type CustomPropertyStyle<PropertyName extends string> = CSSProperties &
  Record<PropertyName, string>;

const colorTokens: readonly ColorTokenPreview[] = [
  { name: "Background", backgroundToken: "--dl-color-background" },
  { name: "Surface", backgroundToken: "--dl-color-surface" },
  { name: "Accent", backgroundToken: "--dl-color-accent", foregroundToken: "#ffffff" },
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

const spaceTokens: readonly SpaceTokenPreview[] = [
  { name: "2", sizeToken: "--dl-space-2" },
  { name: "4", sizeToken: "--dl-space-4" },
  { name: "6", sizeToken: "--dl-space-6" },
  { name: "8", sizeToken: "--dl-space-8" },
  { name: "12", sizeToken: "--dl-space-12" },
];

const demoRows: readonly DemoRow[] = [
  { id: "1", owner: "Demo owner", status: "Planned" },
  { id: "2", owner: "Second owner", status: "Ready" },
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
      <div className="style-preview__space" style={createSpaceSizeStyle(token.sizeToken)} />
      <span className="style-preview__swatch-value">{token.sizeToken}</span>
    </div>
  );
}

function ToastDemo(): ReactNode {
  const toast = useToast();

  return (
    <Button
      onClick={() =>
        toast.showToast({
          durationMs: 3000,
          message: "This is a generic UI notification.",
          title: "Saved",
          variant: "success",
        })
      }
      variant="secondary"
    >
      Show toast
    </Button>
  );
}

function OverlayDemo(): ReactNode {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="style-preview__sample-row">
      <Button onClick={() => setIsModalOpen(true)}>Open modal</Button>
      <Button onClick={() => setIsDrawerOpen(true)} variant="outline">
        Open drawer
      </Button>
      <Modal
        footer={<Button onClick={() => setIsModalOpen(false)}>Confirm</Button>}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Accessible modal"
      >
        <p>Modal content is generic and returns focus when closed.</p>
        <TextInput label="Focusable field" />
      </Modal>
      <Drawer
        description="Drawer uses the same overlay behavior."
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        position="right"
        title="Accessible drawer"
      >
        <p>Drawer content scrolls internally and supports Escape.</p>
        <Button onClick={() => setIsDrawerOpen(false)} variant="secondary">
          Close drawer
        </Button>
      </Drawer>
    </div>
  );
}

function DentalDiagramPreview(): ReactNode {
  const [selectedTeeth, setSelectedTeeth] = useState<AdultFdiTooth[]>([11, 12]);
  const [connections, setConnections] = useState([
    { toothA: 11 as AdultFdiTooth, toothB: 12 as AdultFdiTooth },
    { toothA: 11 as AdultFdiTooth, toothB: 21 as AdultFdiTooth },
    { toothA: 31 as AdultFdiTooth, toothB: 41 as AdultFdiTooth },
  ]);

  function toggleTooth(tooth: AdultFdiTooth): void {
    setSelectedTeeth((current) =>
      current.includes(tooth) ? current.filter((item) => item !== tooth) : [...current, tooth],
    );
  }

  function toggleConnection(connection: { readonly toothA: AdultFdiTooth; readonly toothB: AdultFdiTooth }): void {
    setConnections((current) => {
      const exists = current.some(
        (item) =>
          (item.toothA === connection.toothA && item.toothB === connection.toothB) ||
          (item.toothA === connection.toothB && item.toothB === connection.toothA),
      );
      return exists
        ? current.filter(
            (item) =>
              !(
                (item.toothA === connection.toothA && item.toothB === connection.toothB) ||
                (item.toothA === connection.toothB && item.toothB === connection.toothA)
              ),
          )
        : [...current, connection];
    });
  }

  return (
    <section className="style-preview__panel dl-stack" aria-labelledby="dental-diagram-title">
      <div className="style-preview__dental-heading">
        <div>
          <p className="style-preview__eyebrow">B06 / TOOTH-DIAGRAM-001</p>
          <h2 id="dental-diagram-title">Previzualizare diagramă dentară</h2>
        </div>
        <p className="style-preview__dental-note">
          Redimensionează fereastra pentru a verifica desktop, tabletă și mobil. Pe mobil și
          tabletă, arcadele se încadrează în card, iar fiecare dinte și bulină rămân vizibile.
        </p>
      </div>
      <div className="style-preview__dental-frame">
        <ToothDiagram
          configuredTeeth={[21, 41]}
          connections={connections}
          disabledTeeth={[38]}
          focusedTooth={21}
          mode="edit"
          onConnectionToggle={toggleConnection}
          onShortcut={(teeth) => setSelectedTeeth([...teeth])}
          onToothToggle={toggleTooth}
          semanticScope="BOTH_ARCHES"
          selectedTeeth={selectedTeeth}
        />
      </div>
      <p className="style-preview__dental-state">
        Selectate: {selectedTeeth.length ? selectedTeeth.join(", ") : "niciun dinte"} · Conexiuni active: {connections.length} ·
        Spațiul 11–21 și 41–31 este inclus.
      </p>
    </section>
  );
}

export function StylePreviewPage(): ReactNode {
  return (
    <ToastProvider>
      <main className="dl-page style-preview">
        <div className="dl-container">
          <header className="style-preview__header">
            <p className="style-preview__eyebrow">UI-002</p>
            <h1 className="style-preview__title">
              {formatApplicationTitle("Core UI Components")}
            </h1>
            <p className="style-preview__summary">
              Internal preview for design tokens, reusable generic components, responsive
              layout, native control states, overlays, feedback, and table states.
            </p>
          </header>

          <div className="dl-stack" style={createStackGapStyle("--dl-space-8")}>
            <DentalDiagramPreview />

            <section className="style-preview__panel dl-stack" aria-labelledby="colors-title">
              <h2 id="colors-title">Semantic Colors</h2>
              <div className="dl-grid">{colorTokens.map(renderColorSwatch)}</div>
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="spacing-title">
              <h2 id="spacing-title">Spacing</h2>
              <div className="style-preview__sample-row">{spaceTokens.map(renderSpaceSample)}</div>
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="buttons-title">
              <h2 id="buttons-title">Buttons</h2>
              <div className="style-preview__sample-row">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button isLoading>Loading</Button>
                <IconButton aria-label="More actions" icon="..." variant="secondary" />
              </div>
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="kpi-title">
              <h2 id="kpi-title">KPI</h2>
              <div className="style-preview__kpi-grid">
                <KpiCard className="style-preview__status-kpi" title="În lucru" value="38" />
                <KpiCard description="față de ieri" title="Lucrări active" value="24" />
                <KpiCard description="înregistrări" title="Facturi achitate" value="128" />
                <KpiCard description="termen apropiat" title="De livrat azi" value="7" />
                <KpiCard description="luna curentă" title="Venituri" value="42.580 lei" />
              </div>
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="forms-title">
              <h2 id="forms-title">Form Controls</h2>
              <div className="style-preview__form-grid">
                <TextInput hint="Associated hint text." label="Text input" placeholder="Enter text" />
                <TextInput error="Text input error" label="Invalid input" />
                <NumberInput label="Number input" />
                <DateInput label="Date input" />
                <Select
                  className="style-preview__select"
                  hint="Alege starea lucrării"
                  label="Stare lucrare"
                  options={[
                    { label: "În așteptare", secondary: "Lucrarea nu a început", value: "planned" },
                    { label: "În lucru", secondary: "Se lucrează la caz", value: "production" },
                    { label: "Gata pentru livrare", secondary: "Poate fi trimisă către clinică", value: "ready" },
                    { label: "Finalizată", secondary: "Cazul este închis tehnic", value: "completed" },
                  ]}
                  placeholder="Selectează starea"
                />
                <Textarea label="Textarea" placeholder="Write a generic note" />
              </div>
              <div className="style-preview__sample-row">
                <Checkbox label="Checkbox option" />
                <Switch label="Switch option" />
              </div>
              <RadioGroup
                label="Radio group"
                options={[
                  { label: "Normal", value: "normal" },
                  { label: "Urgent", value: "urgent" },
                ]}
              />
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="badges-title">
              <h2 id="badges-title">Badges</h2>
              <div className="style-preview__sample-row">
                <StatusBadge label="Draft" variant="draft" />
                <StatusBadge label="Registered" variant="registered" />
                <StatusBadge label="Production" variant="production" />
                <StatusBadge label="Rejected" variant="rejected" />
                <StatusBadge label="Closed" variant="closed" />
                <PriorityBadge label="Low" variant="low" />
                <PriorityBadge label="Urgent" variant="urgent" />
              </div>
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="cards-title">
              <h2 id="cards-title">Cards</h2>
              <div className="dl-grid">
                <Card>
                  <CardHeader>
                    <CardTitle>Standard card</CardTitle>
                    <CardDescription>Generic composition surface.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Cards do not impose business layout.</p>
                  </CardContent>
                  <CardFooter>
                    <Button size="small" variant="secondary">
                      Action
                    </Button>
                  </CardFooter>
                </Card>
                <Card variant="compact">
                  <CardTitle>Compact card</CardTitle>
                  <CardContent>Compact density for operational screens.</CardContent>
                </Card>
              </div>
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="overlay-title">
              <h2 id="overlay-title">Overlays and Feedback</h2>
              <OverlayDemo />
              <div className="style-preview__sample-row">
                <ToastDemo />
                <Tooltip content="Tooltip appears on hover and focus.">
                  <Button variant="ghost">Tooltip trigger</Button>
                </Tooltip>
              </div>
              <div className="dl-grid">
                <LoadingState text="Loading state" />
                <EmptyState description="No generic records." title="Empty state" />
                <ErrorState description="Retry action can be supplied." title="Error state" />
              </div>
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="navigation-title">
              <h2 id="navigation-title">Composition and Navigation</h2>
              <Accordion
                items={[
                  { content: <p>Accordion content.</p>, id: "one", title: "Accordion item" },
                ]}
              />
              <Tabs
                tabs={[
                  { content: <p>First panel.</p>, id: "first", label: "First" },
                  { content: <p>Second panel.</p>, id: "second", label: "Second" },
                ]}
              />
              <FilterBar
                actions={<Button variant="secondary">Action</Button>}
                filters={<Select label="Filter select" options={[{ label: "All", value: "all" }]} />}
                onClearFilters={() => undefined}
                search={<SearchInput label="Search" placeholder="Search generic data" />}
              />
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="progress-title">
              <h2 id="progress-title">Timeline and Stepper</h2>
              <Timeline
                items={[
                  { description: "Generic timeline item.", timestamp: "09:00", title: "Created" },
                  { description: "Another generic event.", timestamp: "10:00", title: "Updated" },
                ]}
              />
              <Stepper
                items={[
                  { label: "Received", state: "completed" },
                  { label: "Production", state: "current" },
                  { label: "Review", state: "upcoming" },
                  { label: "Exception", state: "error" },
                ]}
              />
            </section>

            <section className="style-preview__panel dl-stack" aria-labelledby="data-title">
              <h2 id="data-title">File Upload and Data Table</h2>
              <FileUpload description="No API request is performed." label="File upload" multiple />
              <DataTable
                columns={[
                  { header: "ID", id: "id", renderCell: (row: DemoRow) => row.id },
                  { header: "Owner", id: "owner", renderCell: (row: DemoRow) => row.owner },
                  {
                    header: "Status",
                    id: "status",
                    isSortable: true,
                    renderCell: (row: DemoRow) => row.status,
                  },
                ]}
                getRowKey={(row) => row.id}
                pagination={{ onPageChange: () => undefined, page: 1, pageCount: 3 }}
                rows={demoRows}
              />
              <div className="dl-grid">
                <DataTable columns={[]} getRowKey={() => "empty"} isLoading rows={[]} />
                <DataTable columns={[]} getRowKey={() => "empty"} rows={[]} />
                <DataTable columns={[]} error="Generic load error." getRowKey={() => "error"} rows={[]} />
              </div>
            </section>
          </div>
        </div>
      </main>
    </ToastProvider>
  );
}
