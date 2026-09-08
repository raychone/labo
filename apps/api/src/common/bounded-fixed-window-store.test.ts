import { describe, expect, it } from "vitest";

import { BoundedFixedWindowStore } from "./bounded-fixed-window-store.js";

describe("BoundedFixedWindowStore", () => {
  it("refuses new buckets once the configured memory bound is reached", () => {
    const store = new BoundedFixedWindowStore(2);

    expect(store.consume("one", 1_000, 60_000).accepted).toBe(true);
    expect(store.consume("two", 1_000, 60_000).accepted).toBe(true);
    expect(store.consume("three", 1_000, 60_000).accepted).toBe(false);
    expect(store.consume("one", 1_000, 60_000)).toEqual({ accepted: true, count: 2 });
  });

  it("prunes expired buckets before rejecting a new key", () => {
    const store = new BoundedFixedWindowStore(1);

    expect(store.consume("expired", 1_000, 100).accepted).toBe(true);
    expect(store.consume("replacement", 1_101, 100)).toEqual({ accepted: true, count: 1 });
  });
});
