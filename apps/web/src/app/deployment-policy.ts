export function isStylePreviewEnabled(input: {
  readonly configuredValue?: string;
  readonly isDevelopment: boolean;
}): boolean {
  return input.isDevelopment || input.configuredValue === "true";
}
