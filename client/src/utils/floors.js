const namedFloors = [
  "Ground",
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth",
  "Tenth",
  "Eleventh",
  "Twelfth",
  "Thirteenth",
  "Fourteenth",
  "Fifteenth",
  "Sixteenth",
  "Seventeenth",
  "Eighteenth",
  "Nineteenth",
  "Twentieth",
];

function floorRank(name) {
  const normalized = name.trim().toLowerCase();
  const namedIndex = namedFloors.findIndex(
    (floor) => floor.toLowerCase() === normalized,
  );
  if (namedIndex !== -1) return namedIndex;
  const numericFloor = normalized.match(/^(\d+)(?:st|nd|rd|th)?(?: floor)?$/);
  if (numericFloor) return Number(numericFloor[1]);
  return Number.MAX_SAFE_INTEGER;
}

export function nextFloorName(floors) {
  const existing = new Set(floors.map((floor) => floor.toLowerCase()));
  const nextNamedFloor = namedFloors
    .slice(1)
    .find((floor) => !existing.has(floor.toLowerCase()));
  if (nextNamedFloor) return nextNamedFloor;

  const number = floors.length;
  const remainder = number % 100;
  const suffix =
    remainder >= 11 && remainder <= 13
      ? "th"
      : number % 10 === 1
        ? "st"
        : number % 10 === 2
          ? "nd"
          : number % 10 === 3
            ? "rd"
            : "th";
  return `${number}${suffix}`;
}

export function sortFloorNames(floors) {
  const uniqueFloors = new Map();
  for (const floor of floors) {
    if (typeof floor !== "string" || !floor.trim()) continue;
    const normalized = floor.trim();
    const key = normalized.toLowerCase();
    if (!uniqueFloors.has(key)) uniqueFloors.set(key, normalized);
  }
  return [...uniqueFloors.values()].sort((a, b) => {
      const rankDifference = floorRank(a) - floorRank(b);
      return rankDifference || a.localeCompare(b, undefined, { numeric: true });
    });
}
