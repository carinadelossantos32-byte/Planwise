import { describe, expect, it } from "vitest";
import { canonicalMethod, getClientDate, isArchived, methodLabel, toDate } from "./reportData";

describe("toDate", () => {
    it("reads Firestore timestamps, Date objects and date strings", () => {
        const date = new Date("2026-03-15T00:00:00Z");
        expect(toDate({ toDate: () => date })).toEqual(date);
        expect(toDate(date)).toEqual(date);
        expect(toDate("2026-03-15T00:00:00Z")).toEqual(date);
    });

    it("returns null for empty or unreadable values", () => {
        expect(toDate(null)).toBeNull();
        expect(toDate("")).toBeNull();
        expect(toDate("not a date")).toBeNull();
        expect(toDate({})).toBeNull();
    });
});

describe("getClientDate", () => {
    it("prefers the date typed on the record over the time it was encoded", () => {
        const client = { date: "2026-01-10", created_at: "2026-02-20" };
        expect(getClientDate(client)).toEqual(new Date("2026-01-10"));
    });

    it("falls back to the encoded time, then to nothing", () => {
        expect(getClientDate({ created_at: "2026-02-20" })).toEqual(new Date("2026-02-20"));
        expect(getClientDate({})).toBeNull();
    });
});

describe("isArchived", () => {
    it("treats every archived marker as archived", () => {
        expect(isArchived({ is_archived: true })).toBe(true);
        expect(isArchived({ is_archived: "true" })).toBe(true);
        expect(isArchived({ archived: true })).toBe(true);
    });

    it("keeps active and unmarked records", () => {
        expect(isArchived({ is_archived: false })).toBe(false);
        expect(isArchived({})).toBe(false);
        expect(isArchived(undefined)).toBe(false);
    });
});

describe("canonicalMethod", () => {
    it("maps the different spellings of a method to one name", () => {
        expect(canonicalMethod("Iud")).toBe("IUD");
        expect(canonicalMethod("Injectable (DMPA)")).toBe("Injectable");
        expect(canonicalMethod("CMM/Billings")).toBe("CMM");
        expect(canonicalMethod("symptothermal")).toBe("STM");
        expect(canonicalMethod("BTL")).toBe("Tubal Ligation");
        expect(canonicalMethod("Subdermal Implant")).toBe("Implant");
    });

    it("matches short codes only as whole words", () => {
        expect(canonicalMethod("lam")).toBe("LAM");
        expect(canonicalMethod("lamp")).toBe("");
    });

    it("returns an empty name for anything that is not a method", () => {
        expect(canonicalMethod("")).toBe("");
        expect(canonicalMethod("None")).toBe("");
        expect(canonicalMethod(42)).toBe("");
    });
});

describe("methodLabel", () => {
    it("shows the Cervical Mucus Method as CMM", () => {
        expect(methodLabel("CCM")).toBe("CMM");
        expect(methodLabel("Pills")).toBe("Pills");
    });
});
