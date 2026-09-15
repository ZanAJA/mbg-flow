import { describe, expect, it } from "vitest";
import { deriveProductionStatus, isAllocationValid } from "@/shared/domain/rules";

describe("production and allocation rules", () => {
  it("rejects allocations that exceed available portions", () => {
    expect(isAllocationValid(560, 240, 800)).toBe(true);
    expect(isAllocationValid(600, 240, 800)).toBe(false);
    expect(isAllocationValid(0, 0, 800)).toBe(false);
  });

  it("marks a batch PARTIALLY_READY when one delivery is ready before all components finish", () => {
    const status = deriveProductionStatus({
      components: [{ status: "IN_PROGRESS" }, { status: "FINISHED" }, { status: "NOT_STARTED" }],
      deliveryBatches: [{ status: "READY" }, { status: "PLANNED" }],
    });
    expect(status).toBe("PARTIALLY_READY");
  });

  it("does not collapse delivery received into a safety stop", () => {
    const status = deriveProductionStatus({
      components: [{ status: "FINISHED" }, { status: "FINISHED" }],
      deliveryBatches: [{ status: "RECEIVED" }],
    });
    expect(status).toBe("CLOSED");
  });
});
