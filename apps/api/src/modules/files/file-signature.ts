const SIGNATURES = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
} as const;

export function hasMatchingFileSignature(mimeType: string, content: Uint8Array): boolean {
  if (mimeType === "image/webp") {
    return startsWith(content, [0x52, 0x49, 0x46, 0x46])
      && matchesAt(content, 8, [0x57, 0x45, 0x42, 0x50]);
  }

  const signature = SIGNATURES[mimeType as keyof typeof SIGNATURES];
  return signature !== undefined && startsWith(content, signature);
}

function startsWith(content: Uint8Array, signature: readonly number[]): boolean {
  return matchesAt(content, 0, signature);
}

function matchesAt(content: Uint8Array, offset: number, signature: readonly number[]): boolean {
  if (content.length < offset + signature.length) return false;
  return signature.every((byte, index) => content[offset + index] === byte);
}
