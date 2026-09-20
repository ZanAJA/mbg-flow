type OpenverseImage = {
  title?: string | null;
  creator?: string | null;
  license?: string | null;
  license_version?: string | null;
  tags?: Array<{ name?: string | null }> | null;
  thumbnail?: string | null;
  url?: string | null;
  foreign_landing_url?: string | null;
};

type OpenverseResponse = {
  results?: OpenverseImage[];
};

const GENERIC_MENU_TERMS = new Set([
  "box",
  "komplit",
  "lengkap",
  "menu",
  "mini",
  "paket",
  "sehat",
]);

const SEARCH_STOPWORDS = new Set([
  "dan",
  "dengan",
  "indonesian",
  "lengkap",
  "menu",
  "mini",
  "paket",
  "sehat",
  "spesial",
]);

const COMMON_DISH_QUERIES: Array<{
  match: RegExp;
  queries: string[];
}> = [
  {
    match: /bubur\s+ayam/i,
    queries: ["bubur ayam", "chicken congee"],
  },
  {
    match: /nasi\s+tim\s+ayam/i,
    queries: ["nasi tim ayam", "chicken rice"],
  },
  {
    match: /ayam\s+goreng\s+mentega/i,
    queries: ["ayam goreng mentega", "butter fried chicken"],
  },
  {
    match: /ayam\s+teriyaki/i,
    queries: ["ayam teriyaki", "chicken teriyaki rice"],
  },
  {
    match: /sup\s+ayam/i,
    queries: ["sup ayam", "chicken soup"],
  },
  {
    match: /soto\s+ayam/i,
    queries: ["soto ayam", "Indonesian chicken soup"],
  },
  {
    match: /nasi\s+goreng/i,
    queries: ["nasi goreng", "Indonesian fried rice"],
  },
  {
    match: /nasi\s+kuning/i,
    queries: ["nasi kuning"],
  },
  {
    match: /ayam\s+suwir/i,
    queries: ["ayam suwir", "shredded chicken rice"],
  },
  {
    match: /ayam\s+goreng/i,
    queries: ["ayam goreng", "fried chicken rice"],
  },
  {
    match: /ikan\s+bakar/i,
    queries: ["ikan bakar", "grilled fish rice"],
  },
  {
    match: /ikan\s+goreng/i,
    queries: ["ikan goreng", "fried fish rice"],
  },
  {
    match: /urap/i,
    queries: ["urap sayur", "Indonesian vegetable salad"],
  },
];

export type MenuImageResult = {
  imageUrl: string;
  imageSourceUrl: string;
  imageAttribution: string;
  imageLicense: string;
  imageSearchQuery: string;
};

function cleanTerms(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, items) => items.indexOf(value) === index);
}

function menuDishQueries(name: string) {
  const normalized = name
    .replace(/^paket\s+/i, "")
    .replace(/^nasi\s+(putih|merah|kuning)(\s+mini)?\s+/i, "")
    .replace(/\s+(sehat|lengkap)$/i, "")
    .trim();
  const clauses = normalized
    .split(/\s+(dan|dengan|serta)\s+|,/i)
    .filter((value) => value && !/^(dan|dengan|serta)$/i.test(value))
    .map((value) => value.trim())
    .filter((value) => !GENERIC_MENU_TERMS.has(value.toLowerCase()));

  return clauses.flatMap((clause) => {
    if (/^nasi\s+tim\s+/i.test(clause)) {
      return [clause, clause.split(/\s+/).slice(0, 3).join(" ")];
    }
    return [clause];
  });
}

function commonDishQueries(name: string) {
  return COMMON_DISH_QUERIES.flatMap(({ match, queries }) =>
    match.test(name) ? queries : [],
  );
}

function searchableTokens(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !SEARCH_STOPWORDS.has(token));
}

function imageRelevance(query: string, image: OpenverseImage) {
  const queryTokens = [...new Set(searchableTokens(query))];
  if (!queryTokens.length) return 0;

  const title = image.title ?? "";
  const tags = image.tags?.map((tag) => tag.name ?? "").join(" ") ?? "";
  const searchable = new Set(searchableTokens(`${title} ${tags}`));
  const matches = queryTokens.filter((token) => searchable.has(token)).length;
  const minimumMatches = queryTokens.length > 1 ? 2 : 1;

  if (matches < minimumMatches) return 0;

  const normalizedTitle = searchableTokens(title).join(" ");
  const normalizedQuery = queryTokens.join(" ");
  return matches + (normalizedTitle.includes(normalizedQuery) ? 5 : 0);
}

function formatLicense(image: OpenverseImage) {
  const name = image.license?.toUpperCase() || "Lisensi terbuka";
  return image.license_version ? `${name} ${image.license_version}` : name;
}

async function searchOpenverse(
  query: string,
  excludedUrls: ReadonlySet<string>,
): Promise<MenuImageResult | null> {
  const params = new URLSearchParams({
    q: query,
    page_size: "12",
    mature: "false",
    category: "photograph",
  });
  const response = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
    headers: { "User-Agent": "MBG-Flow/0.1" },
    signal: AbortSignal.timeout(6_000),
  });

  if (!response.ok) return null;

  const body = (await response.json()) as OpenverseResponse;
  const image = body.results
    ?.filter((item) => {
      const url = item.url || item.thumbnail;
      return url && item.foreign_landing_url && !excludedUrls.has(url);
    })
    .map((item) => ({
      item,
      score: imageRelevance(query, item),
      titleLength: searchableTokens(item.title ?? "").length,
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.titleLength - b.titleLength,
    )[0]?.item;

  const imageUrl = image?.url || image?.thumbnail;
  if (!imageUrl || !image?.foreign_landing_url) return null;

  const title = image.title?.trim() || "Foto menu";
  const creator = image.creator?.trim() || "Kreator tidak diketahui";
  const license = formatLicense(image);

  return {
    imageUrl,
    imageSourceUrl: image.foreign_landing_url,
    imageAttribution: `${title} oleh ${creator}`,
    imageLicense: license,
    imageSearchQuery: query,
  };
}

export async function findMenuImage(
  name: string,
  keywords: string[],
  excludedUrls: ReadonlySet<string> = new Set(),
) {
  const terms = cleanTerms(keywords);
  const queries = cleanTerms([
    ...menuDishQueries(name),
    ...commonDishQueries(name),
    name,
    terms.slice(0, 4).join(" "),
    terms.slice(0, 2).join(" "),
    terms[0] ?? "",
    terms[1] ?? "",
  ]);

  for (const query of queries) {
    try {
      const result = await searchOpenverse(query, excludedUrls);
      if (result) return result;
    } catch (error) {
      console.warn("Openverse menu image search failed.", { query, error });
    }
  }

  return null;
}
