export function formatRoomDetails(room) {
  if (!room) return "Room details unavailable";

  const capacity = Number(room.capacity) || 2;
  const occupancy =
    capacity === 1
      ? "Single occupancy"
      : capacity === 2
        ? "Double occupancy"
        : `Up to ${capacity} guests`;
  return [
    room.type || "Room type unavailable",
    occupancy,
    room.airConditioning ? "AC" : "Non-AC",
    `${room.floor || "Ground"} floor`,
  ].join(" · ");
}
