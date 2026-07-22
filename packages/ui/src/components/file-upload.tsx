import { clsx } from "clsx";
import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { Button } from "./button.js";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field.js";

export interface FileUploadProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "onChange" | "type"> {
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly label: ReactNode;
  readonly maxSizeBytes?: number;
  readonly onFilesChange?: (files: readonly File[]) => void;
}

function fileListToArray(fileList: FileList | null): readonly File[] {
  return fileList === null ? [] : Array.from(fileList);
}

function validateFiles(files: readonly File[], maxSizeBytes: number | undefined): string | undefined {
  if (maxSizeBytes === undefined) {
    return undefined;
  }

  return files.some((file) => file.size > maxSizeBytes)
    ? `One or more files exceed the maximum size of ${maxSizeBytes} bytes.`
    : undefined;
}

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(function FileUpload(
  {
    accept,
    className,
    description,
    disabled,
    error,
    id,
    label,
    maxSizeBytes,
    multiple,
    onFilesChange,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const [selectedFiles, setSelectedFiles] = useState<readonly File[]>([]);
  const [internalError, setInternalError] = useState<string | undefined>(undefined);
  const visibleError = error ?? internalError;

  function updateFiles(files: readonly File[]): void {
    const validationError = validateFiles(files, maxSizeBytes);
    setInternalError(validationError);
    if (validationError === undefined) {
      setSelectedFiles(files);
      onFilesChange?.(files);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    updateFiles(fileListToArray(event.target.files));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    if (disabled === true) {
      return;
    }
    updateFiles(fileListToArray(event.dataTransfer.files));
  }

  function removeFile(fileToRemove: File): void {
    const nextFiles = selectedFiles.filter((file) => file !== fileToRemove);
    setSelectedFiles(nextFiles);
    onFilesChange?.(nextFiles);
  }

  return (
    <Field className={className}>
      <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      <label
        className={clsx("dl-file-upload", disabled && "dl-file-upload--disabled")}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          accept={accept}
          aria-describedby={description ? descriptionId : undefined}
          aria-invalid={visibleError !== undefined || undefined}
          disabled={disabled}
          id={controlId}
          multiple={multiple}
          onChange={handleChange}
          ref={ref}
          type="file"
          {...props}
        />
        <span>Choose files or drop them here</span>
      </label>
      {selectedFiles.length > 0 ? (
        <ul className="dl-file-upload__list">
          {selectedFiles.map((file) => (
            <li key={`${file.name}-${file.size}`}>
              <span>{file.name}</span>
              <Button disabled={disabled} onClick={() => removeFile(file)} size="small" variant="ghost">
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {visibleError ? <FieldError id={errorId}>{visibleError}</FieldError> : null}
    </Field>
  );
});
