import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState, type ReactNode } from "react";

import {
  Accordion,
  Button,
  Checkbox,
  DataTable,
  DateInput,
  ConfirmActionModal,
  Drawer,
  EmptyState,
  ErrorState,
  FileUpload,
  FormActions,
  FormErrorSummary,
  FormGrid,
  FormGridFull,
  FormLayout,
  FormSection,
  IconButton,
  LoadingState,
  Modal,
  NumberInput,
  PriorityBadge,
  RadioGroup,
  SearchInput,
  Select,
  StatusBadge,
  Switch,
  Tabs,
  Textarea,
  TextInput,
  ToastProvider,
  Tooltip,
  useToast,
} from "../index.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("primitive components", () => {
  it("renders Button variants with loading and native props", () => {
    const clickHandler = vi.fn();
    render(
      <Button className="custom" isLoading onClick={clickHandler} variant="danger">
        Delete
      </Button>,
    );

    const button = screen.getByRole("button", { name: /Delete/i });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.className).toContain("dl-button--danger");
    expect(button.className).toContain("custom");
  });

  it("forwards Button refs", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Save</Button>);

    expect(ref.current?.tagName).toBe("BUTTON");
  });

  it("requires an accessible IconButton label by type and renders it", () => {
    render(<IconButton aria-label="Open actions" icon="..." />);

    expect(screen.getByRole("button", { name: "Open actions" })).toBeDefined();
  });
});

describe("form controls", () => {
  it("associates TextInput label, hint, and error", () => {
    render(<TextInput error="Required" hint="Use a visible name" label="Name" required />);

    const input = screen.getByLabelText(/Name/);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("hint");
    expect(screen.getByRole("alert").textContent).toBe("Required");
    expect(input.hasAttribute("required")).toBe(true);
  });

  it("renders Textarea, NumberInput, DateInput, and Select", () => {
    render(
      <>
        <Textarea label="Notes" />
        <NumberInput label="Pieces" />
        <DateInput label="Due date" />
        <Select
          label="Status"
          options={[
            { label: "Planned", value: "planned" },
            { label: "Done", value: "done" },
          ]}
        />
      </>,
    );

    expect(screen.getByLabelText("Notes")).toBeDefined();
    expect(screen.getByLabelText("Pieces")).toBeDefined();
    expect(screen.getByLabelText("Due date")).toBeDefined();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeDefined();
  });

  it("supports Checkbox, RadioGroup, and Switch interactions", () => {
    const radioChangeHandler = vi.fn();
    render(
      <>
        <Checkbox label="Accept" />
        <RadioGroup
          label="Priority"
          onValueChange={radioChangeHandler}
          options={[
            { label: "Normal", value: "normal" },
            { label: "Urgent", value: "urgent" },
          ]}
        />
        <Switch label="Enabled" />
      </>,
    );

    fireEvent.click(screen.getByLabelText("Accept"));
    fireEvent.click(screen.getByLabelText("Urgent"));
    fireEvent.click(screen.getByRole("switch", { name: "Enabled" }));

    expect((screen.getByLabelText("Accept") as HTMLInputElement).checked).toBe(true);
    expect(radioChangeHandler).toHaveBeenCalledWith("urgent");
    expect((screen.getByRole("switch", { name: "Enabled" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });
});

describe("form patterns", () => {
  it("renders semantic sections, grid, and actions", () => {
    render(
      <FormLayout aria-label="Clinic form">
        <FormSection title="Contact" description="Visible helper">
          <FormGrid>
            <TextInput label="Email" />
            <FormGridFull>
              <Textarea label="Notes" />
            </FormGridFull>
          </FormGrid>
        </FormSection>
        <FormActions canReset formId="clinic-form" onReset={vi.fn()} submitLabel="Save" />
      </FormLayout>,
    );

    expect(screen.getByRole("form", { name: "Clinic form" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Contact" })).toBeDefined();
    expect(screen.getByText("Visible helper")).toBeDefined();
    expect(screen.getByRole("button", { name: "Save" }).getAttribute("type")).toBe("submit");
  });

  it("renders error summary links and confirmation modal", () => {
    const confirmHandler = vi.fn();
    render(
      <>
        <FormErrorSummary errors={[{ fieldId: "email", message: "Email invalid" }]} />
        <ConfirmActionModal
          confirmLabel="Delete"
          description="This cannot be undone."
          isOpen
          onCancel={vi.fn()}
          onConfirm={confirmHandler}
          title="Confirm action"
        />
      </>,
    );

    expect(screen.getByRole("alert").textContent).toContain("Email invalid");
    expect(screen.getByRole("link", { name: "Email invalid" }).getAttribute("href")).toBe("#email");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirmHandler).toHaveBeenCalled();
  });
});

describe("status components", () => {
  it("renders status and priority text with semantic classes", () => {
    render(
      <>
        <StatusBadge label="In production" variant="production" />
        <PriorityBadge label="Urgent" variant="urgent" />
      </>,
    );

    expect(screen.getByText("In production").closest(".dl-badge")?.className).toContain(
      "dl-status-badge--production",
    );
    expect(screen.getByText("Urgent").className).toContain("dl-priority-badge--urgent");
  });
});

describe("overlays", () => {
  function ModalHarness(): ReactNode {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <button onClick={() => setIsOpen(true)} type="button">
          Open modal
        </button>
        <Modal isOpen={isOpen} onOpenChange={setIsOpen} title="Dialog title">
          <button type="button">Inside modal</button>
        </Modal>
      </>
    );
  }

  it("closes Modal on Escape and returns focus", () => {
    render(<ModalHarness />);
    const opener = screen.getByRole("button", { name: "Open modal" });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Dialog title" });
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes Drawer on Escape", () => {
    const closeHandler = vi.fn();
    render(
      <Drawer isOpen onOpenChange={closeHandler} title="Drawer title">
        <button type="button">Inside drawer</button>
      </Drawer>,
    );

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Drawer title" }), { key: "Escape" });
    expect(closeHandler).toHaveBeenCalledWith(false);
  });
});

describe("feedback", () => {
  function ToastHarness(): ReactNode {
    const toast = useToast();
    return (
      <>
        <button
          onClick={() => toast.showToast({ durationMs: 1000, message: "Saved", variant: "success" })}
          type="button"
        >
          Show toast
        </button>
        <button
          onClick={() => {
            toast.showToast({ message: "One", persist: true });
            toast.showToast({ message: "Two", persist: true });
            toast.showToast({ message: "Three", persist: true });
          }}
          type="button"
        >
          Show many
        </button>
        <button onClick={() => toast.clearToasts()} type="button">Clear all</button>
      </>
    );
  }

  it("renders LoadingState, EmptyState, and ErrorState", () => {
    render(
      <>
        <LoadingState text="Loading records" />
        <EmptyState title="Nothing here" />
        <ErrorState title="Failed" />
      </>,
    );

    expect(screen.getByRole("status", { name: "" })).toBeDefined();
    expect(screen.getByText("Nothing here")).toBeDefined();
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("shows and dismisses toast notifications", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
    expect(screen.getByText("Saved")).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("supports manual toast dismiss, max visible toasts, and clear all", () => {
    render(
      <ToastProvider maxToasts={2}>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show many" }));
    expect(screen.queryByText("One")).toBeNull();
    expect(screen.getByText("Two")).toBeDefined();
    expect(screen.getByText("Three")).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: "Închide notificarea" })[0] as HTMLElement);
    expect(screen.queryByText("Three")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.queryByText("Two")).toBeNull();
  });

  it("opens Tooltip on focus and closes on Escape", () => {
    render(
      <Tooltip content="Helpful detail">
        <button type="button">Focusable</button>
      </Tooltip>,
    );

    fireEvent.focus(screen.getByRole("button", { name: "Focusable" }));
    expect(screen.getByRole("tooltip").textContent).toBe("Helpful detail");
    fireEvent.keyDown(screen.getByRole("button", { name: "Focusable" }), { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("navigation and composition", () => {
  it("toggles Accordion panels", () => {
    render(<Accordion items={[{ content: "Panel", id: "one", title: "One" }]} />);

    const trigger = screen.getByRole("button", { name: /One/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("supports Tabs arrow navigation", () => {
    render(
      <Tabs
        tabs={[
          { content: "First panel", id: "first", label: "First" },
          { content: "Second panel", id: "second", label: "Second" },
        ]}
      />,
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "First" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Second" }).getAttribute("aria-selected")).toBe("true");
  });

  it("renders SearchInput and clears controlled text", () => {
    const clearHandler = vi.fn();
    render(<SearchInput label="Search" onClear={clearHandler} readOnly value="abc" />);
    fireEvent.click(screen.getByRole("button", { name: "Șterge căutarea" }));
    expect(clearHandler).toHaveBeenCalled();
  });
});

describe("FileUpload and DataTable", () => {
  it("selects and removes files", () => {
    const changeHandler = vi.fn();
    render(<FileUpload label="Files" multiple onFilesChange={changeHandler} />);
    const file = new File(["demo"], "demo.txt", { type: "text/plain" });

    fireEvent.change(screen.getByLabelText("Files"), { target: { files: [file] } });
    expect(screen.getByText("demo.txt")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(changeHandler).toHaveBeenLastCalledWith([]);
  });

  it("renders DataTable states and callbacks", () => {
    const sortHandler = vi.fn();
    const pageHandler = vi.fn();
    render(
      <DataTable
        columns={[
          {
            header: "Name",
            id: "name",
            isSortable: true,
            renderCell: (row: { readonly name: string }) => row.name,
          },
        ]}
        getRowKey={(row) => row.name}
        onSortChange={sortHandler}
        pagination={{ onPageChange: pageHandler, page: 1, pageCount: 2 }}
        rows={[{ name: "Alpha" }]}
      />,
    );

    expect(screen.getByText("Alpha")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    fireEvent.click(screen.getByRole("button", { name: "Următor" }));
    expect(sortHandler).toHaveBeenCalledWith({ columnId: "name", direction: "ascending" });
    expect(pageHandler).toHaveBeenCalledWith(2);
  });

  it("renders DataTable loading, empty, and error states", () => {
    const columns = [{ header: "Name", id: "name", renderCell: (row: { readonly name: string }) => row.name }];

    const { rerender } = render(<DataTable columns={columns} getRowKey={(row) => row.name} isLoading rows={[]} />);
    expect(screen.getByText("Se încarcă tabelul")).toBeDefined();

    rerender(<DataTable columns={columns} getRowKey={(row) => row.name} rows={[]} />);
    expect(screen.getByText("Nu există date")).toBeDefined();

    rerender(<DataTable columns={columns} error="Network" getRowKey={(row) => row.name} rows={[]} />);
    expect(screen.getByText("Tabelul nu a putut fi încărcat")).toBeDefined();
  });
});
