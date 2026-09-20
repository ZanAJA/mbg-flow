import { afterEach, describe, expect, it, vi } from "vitest";
import { findMenuImage } from "@/shared/lib/menu-image-search";

describe("findMenuImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("searches a menu component first and keeps attribution", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                title: "Ayam katsu",
                creator: "Wiwik P",
                license: "by",
                license_version: "3.0",
                url: "https://upload.wikimedia.org/ayam-katsu.jpg",
                foreign_landing_url: "https://commons.wikimedia.org/ayam-katsu",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const result = await findMenuImage("Ayam Katsu, Nasi, Tumis Sayur", [
      "ayam katsu",
      "nasi putih",
      "tumis sayur",
      "makanan Indonesia",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      decodeURIComponent(String(fetchMock.mock.calls[0]?.[0])).toLowerCase(),
    ).toContain("q=ayam+katsu");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "category=photograph",
    );
    expect(result).toEqual({
      imageUrl: "https://upload.wikimedia.org/ayam-katsu.jpg",
      imageSourceUrl: "https://commons.wikimedia.org/ayam-katsu",
      imageAttribution: "Ayam katsu oleh Wiwik P",
      imageLicense: "BY 3.0",
      imageSearchQuery: "Ayam Katsu",
    });
  });

  it("uses a recognized dish query and rejects unrelated photos", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            results: [
              {
                title: "Bali rice fields",
                creator: "Example",
                license: "by",
                url: "https://example.com/rice-field.jpg",
                foreign_landing_url: "https://example.com/rice-field",
              },
              {
                title: "Nasi kuning ayam goreng",
                creator: "Food photographer",
                license: "by-sa",
                url: "https://example.com/nasi-kuning.jpg",
                foreign_landing_url: "https://example.com/nasi-kuning",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await findMenuImage(
      "Nasi Kuning Mini Ayam Suwir dan Urap Wortel",
      ["nasi kuning", "ayam suwir", "urap wortel"],
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(decodeURIComponent(String(fetchMock.mock.calls[2]?.[0]))).toContain(
      "q=nasi+kuning",
    );
    expect(result?.imageUrl).toBe("https://example.com/nasi-kuning.jpg");
  });
});
