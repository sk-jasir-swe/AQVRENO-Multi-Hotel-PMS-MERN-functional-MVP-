const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function dateRangeForQuery({ period, from, to }, now = new Date()) {
  if ((!period || period === "all") && !from && !to)
    return { range: null, error: null };

  const selectedPeriod = period || (from || to ? "custom" : "all");
  if (selectedPeriod === "custom") {
    if (!isValidDate(from) || !isValidDate(to) || from > to)
      return { range: null, error: "Choose a valid date range" };
    const start = new Date(`${from}T00:00:00+05:30`);
    const end = new Date(
      new Date(`${to}T00:00:00+05:30`).getTime() + DAY_MS,
    );
    return { range: { start, end }, error: null };
  }
  if (!["today", "week", "month"].includes(selectedPeriod))
    return { range: null, error: "Invalid date filter" };

  const localStart = new Date(now.getTime() + IST_OFFSET_MS);
  localStart.setUTCHours(0, 0, 0, 0);
  if (selectedPeriod === "week")
    localStart.setUTCDate(
      localStart.getUTCDate() - ((localStart.getUTCDay() + 6) % 7),
    );
  if (selectedPeriod === "month") localStart.setUTCDate(1);

  const start = new Date(localStart.getTime() - IST_OFFSET_MS);
  if (selectedPeriod === "today")
    return {
      range: { start, end: new Date(start.getTime() + DAY_MS) },
      error: null,
    };
  if (selectedPeriod === "week")
    return {
      range: { start, end: new Date(start.getTime() + 7 * DAY_MS) },
      error: null,
    };

  const days = new Date(
    Date.UTC(localStart.getUTCFullYear(), localStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return {
    range: { start, end: new Date(start.getTime() + days * DAY_MS) },
    error: null,
  };
}
