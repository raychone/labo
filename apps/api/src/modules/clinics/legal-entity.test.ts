import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { assertCompatibleLegalEntities, deriveLegalEntityCode } from "./legal-entity.js";

describe("clinic/doctor legal entity derivation", () => {
  it("derives CDT or NG from the one available context", () => {
    expect(assertCompatibleLegalEntities("CDT", null)).toBe("CDT");
    expect(assertCompatibleLegalEntities(null, "NG")).toBe("NG");
    expect(assertCompatibleLegalEntities(null, null)).toBeNull();
  });

  it("supports matching clinic and doctor context without a current-user fallback", () => {
    expect(deriveLegalEntityCode({ clinicLegalEntityCode: "CDT", doctorLegalEntityCode: "CDT" })).toBe("CDT");
    expect(deriveLegalEntityCode({ clinicLegalEntityCode: "NG", doctorLegalEntityCode: "NG" })).toBe("NG");
    expect(deriveLegalEntityCode({})).toBeNull();
  });

  it("rejects incompatible clinic and doctor ownership", () => {
    expect(() => assertCompatibleLegalEntities("CDT", "NG")).toThrow(BadRequestException);
  });
});
