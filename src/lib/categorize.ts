const RULES: { cat: string; patterns: RegExp[] }[] = [
  { cat: "Housing", patterns: [/rent/i, /mortgage/i, /landlord/i, /hoa\b/i] },
  { cat: "Utilities", patterns: [/electric/i, /water\b/i, /gas co/i, /internet/i, /comcast/i, /verizon/i] },
  { cat: "Groceries", patterns: [/whole foods/i, /trader joe/i, /kroger/i, /safeway/i, /grocery/i, /market\b/i] },
  { cat: "Dining", patterns: [/restaurant/i, /uber eats/i, /doordash/i, /grubhub/i, /cafe/i, /starbucks/i] },
  { cat: "Transport", patterns: [/uber\b/i, /lyft/i, /shell\b/i, /chevron/i, /parking/i, /metro/i, /transit/i] },
  { cat: "Healthcare", patterns: [/pharmacy/i, /cvs\b/i, /walgreens/i, /medical/i, /health/i, /dental/i] },
  { cat: "Entertainment", patterns: [/netflix/i, /spotify/i, /hulu/i, /steam/i, /game/i, /movies/i] },
  { cat: "Shopping", patterns: [/amazon/i, /target\b/i, /walmart/i, /best buy/i, /purchase/i] },
  { cat: "Transfers", patterns: [/transfer/i, /zelle/i, /venmo/i, /paypal/i, /ach/i] },
  { cat: "Income", patterns: [/payroll/i, /direct dep/i, /salary/i, /deposit.*pay/i] },
];

export function categorizeTransaction(description: string, type: "income" | "expense"): string {
  if (type === "income") return "Income";
  const d = description.trim();
  for (const { cat, patterns } of RULES) {
    if (patterns.some((p) => p.test(d))) return cat;
  }
  return "Other";
}
