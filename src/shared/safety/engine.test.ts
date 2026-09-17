import { describe, expect, it } from "vitest";
import {
  componentSafeUntil,
  deriveSafetyStatus,
  formatRemaining,
  productionBatchSafeUntil,
} from "@/shared/safety/engine";

describe("food safety rule engine", () => {
  it("uses the earliest component deadline, not the last finish", () => {
    const nasiFinish = new Date("2026-09-15T06:40:00+07:00");
    const katsuFinish = new Date("2026-09-15T07:00:00+07:00");
    const sayurFinish = new Date("2026-09-15T06:55:00+07:00");

    const nasi = componentSafeUntil({
      finishedAt: nasiFinish,
      safeWindowMinutes: 240,
      affectsSafetyDeadline: true,
    });
    const katsu = componentSafeUntil({
      finishedAt: katsuFinish,
      safeWindowMinutes: 240,
      affectsSafetyDeadline: true,
    });
    const sayur = componentSafeUntil({
      finishedAt: sayurFinish,
      safeWindowMinutes: 180,
      affectsSafetyDeadline: true,
    });
    const packing = componentSafeUntil({
      finishedAt: new Date("2026-09-15T07:20:00+07:00"),
      safeWindowMinutes: 0,
      affectsSafetyDeadline: false,
    });

    expect(nasi?.toISOString()).toBe(new Date("2026-09-15T10:40:00+07:00").toISOString());
    expect(katsu?.toISOString()).toBe(new Date("2026-09-15T11:00:00+07:00").toISOString());
    expect(sayur?.toISOString()).toBe(new Date("2026-09-15T09:55:00+07:00").toISOString());
    expect(packing).toBeNull();

    const batchUntil = productionBatchSafeUntil([
      { affectsSafetyDeadline: true, finishedAt: nasiFinish, safeWindowMinutes: 240, safeUntil: nasi },
      { affectsSafetyDeadline: true, finishedAt: katsuFinish, safeWindowMinutes: 240, safeUntil: katsu },
      { affectsSafetyDeadline: true, finishedAt: sayurFinish, safeWindowMinutes: 180, safeUntil: sayur },
      { affectsSafetyDeadline: false, finishedAt: new Date("2026-09-15T07:20:00+07:00"), safeWindowMinutes: 0 },
    ]);

    expect(batchUntil?.toISOString()).toBe(new Date("2026-09-15T09:55:00+07:00").toISOString());
  });

  it("switches to PAST_LIMIT after deadline and never formats negative time", () => {
    const safeUntil = new Date("2026-09-15T09:55:00+07:00");
    const before = new Date("2026-09-15T08:10:00+07:00");
    const warning = new Date("2026-09-15T09:20:00+07:00");
    const after = new Date("2026-09-15T10:01:00+07:00");

    expect(deriveSafetyStatus(safeUntil, before)).toBe("SAFE");
    expect(deriveSafetyStatus(safeUntil, warning)).toBe("WARNING");
    expect(deriveSafetyStatus(safeUntil, after)).toBe("PAST_LIMIT");
    expect(formatRemaining(-65_000)).toBe("00:00:00");
    expect(formatRemaining(65_000)).toBe("00:01:05");
  });
});

