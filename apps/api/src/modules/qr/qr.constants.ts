export const QR_AUDIT_ACTIONS = {
  printed: "works.qr_printed",
  resolved: "works.qr_resolved",
  viewed: "works.qr_viewed",
} as const;

export const QR_PAYLOAD_PREFIX = "dl-work:";
export const QR_RESOURCE_TYPE = "work_order";
export const QR_TOKEN_BYTES = 32;
export const QR_TOKEN_MAX_GENERATION_ATTEMPTS = 5;
export const QR_RESOLVE_LIMIT = 120;
export const QR_RESOLVE_WINDOW_MS = 60_000;

export const WORK_CODE_PATTERN = /^WO-\d{4}-\d{6}$/;
export const WORK_QR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
