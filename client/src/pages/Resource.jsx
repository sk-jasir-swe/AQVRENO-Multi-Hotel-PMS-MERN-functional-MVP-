import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { downloadCsv } from "../services/download";
import PhoneInput, { formatPhone } from "../components/PhoneInput";
import ActionMenu from "../components/common/ActionMenu";
import { sortFloorNames } from "../utils/floors";
import { hasPermission } from "../utils/permissions";
const titles = {
  rooms: "Room management",
  guests: "Guest directory",
  bookings: "Reservations",
};
const guestSources = [
  "Walk-in",
  "Online",
  "Phone",
  "Travel agent",
  "Partner",
  "Other",
];
const filterParams = (period, dateFrom, dateTo) => {
  if (period === "all") return undefined;
  if (period === "custom")
    return dateFrom && dateTo ? { period, from: dateFrom, to: dateTo } : null;
  return { period };
};
function dateKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const date = Object.fromEntries(
    parts.map(({ type, value: part }) => [type, part]),
  );
  return `${date.year}-${date.month}-${date.day}`;
}
export default function Resource() {
  const { kind } = useParams();
  const user = useSelector((state) => state.auth.user);
  const title = titles[kind] || "Workspace";
  const canAddResource =
    kind === "rooms"
      ? ["hotel_owner", "hotel_manager"].includes(user?.role)
      : hasPermission(user, `${kind}.create`);
  const [items, set] = useState([]),
    [guests, setGuests] = useState([]),
    [rooms, setRooms] = useState([]),
    [err, error] = useState(""),
    [show, toggle] = useState(false),
    [busy, loading] = useState(false);
  const [period, setPeriod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [f, setForm] = useState({});
  const [bookingHistory, setBookingHistory] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [configuredFloors, setConfiguredFloors] = useState(["Ground"]);
  const [selectedFloor, setSelectedFloor] = useState("all");
  async function showBookingHistory(booking) {
    setBookingHistory({ booking, items: [], loading: true, error: "" });
    try {
      const response = await api.get(`/bookings/${booking._id}/history`);
      setBookingHistory({
        booking,
        items: response.data.items,
        loading: false,
        error: "",
      });
    } catch (cause) {
      setBookingHistory({
        booking,
        items: [],
        loading: false,
        error: cause.message || "Unable to load reservation history",
      });
    }
  }
  async function refresh() {
    const params =
      kind === "guests" || kind === "bookings"
        ? filterParams(period, dateFrom, dateTo)
        : undefined;
    if (params === null) {
      set([]);
      setLoadingRecords(false);
      return;
    }
    setLoadingRecords(true);
    try {
      const r = await api.get("/" + kind, { params });
      set(r.data.items);
    } catch (e) {
      error(e.message || "Could not load records");
    } finally {
      setLoadingRecords(false);
    }
  }
  useEffect(() => {
    toggle(false);
    setForm({});
    setEditingRoom(null);
    setGuests([]);
    setRooms([]);
  }, [kind]);
  useEffect(() => {
    const controller = new AbortController();
    set([]);
    error("");
    setLoadingRecords(true);
    const params =
      kind === "guests" || kind === "bookings"
        ? filterParams(period, dateFrom, dateTo)
        : undefined;
    if (params === null) {
      setLoadingRecords(false);
      return () => controller.abort();
    }
    api
      .get("/" + kind, { params, signal: controller.signal })
      .then((records) => set(records.data.items))
      .catch((e) => {
        if (!controller.signal.aborted)
          error(e.message || "Could not load records");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingRecords(false);
      });
    return () => controller.abort();
  }, [kind, period, dateFrom, dateTo]);
  useEffect(() => {
    if (kind !== "bookings" || !show) return undefined;
    const controller = new AbortController();
    setLoadingOptions(true);
    Promise.all([
      api.get("/guests", {
        params: { excludeCheckedIn: true },
        signal: controller.signal,
      }),
      api.get("/rooms", { signal: controller.signal }),
    ])
      .then(([guestRecords, roomRecords]) => {
        setGuests(guestRecords.data.items);
        setRooms(roomRecords.data.items);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          error(e.message || "Could not load reservation form options");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingOptions(false);
      });
    return () => controller.abort();
  }, [kind, show]);
  useEffect(() => {
    if (kind !== "rooms") return undefined;
    const controller = new AbortController();
    api
      .get("/hotel/settings", { signal: controller.signal })
      .then((response) =>
        setConfiguredFloors(
          response.data.hotel.floors?.length
            ? response.data.hotel.floors
            : ["Ground"],
        ),
      )
      .catch((cause) => {
        if (!controller.signal.aborted)
          error(cause.message || "Unable to load hotel floors");
      });
    return () => controller.abort();
  }, [kind]);
  const fields =
    kind === "rooms"
      ? [
          ["number", "Room number"],
          ["type", "Room type"],
          ["floor", "Floor"],
          ["price", "Price per night"],
          ["capacity", "Capacity"],
        ]
      : kind === "guests"
        ? [
            ["name", "Guest name"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["address", "Address"],
          ]
        : [];
  const selectedGuest = guests.find((guest) => guest._id === f.guest);
  const activeGuests = guests.filter((guest) => guest.active !== false);
  const selectedRoom = rooms.find(
    (room) => room._id === f.room && room.status === "available",
  );
  const nights =
    f.checkIn && f.checkOut
      ? Math.ceil(
          (Date.parse(`${f.checkOut}T00:00:00Z`) -
            Date.parse(`${f.checkIn}T00:00:00Z`)) /
            (24 * 60 * 60 * 1000),
        )
      : 0;
  const bookingTotal =
    selectedRoom && nights > 0 ? selectedRoom.price * nights : 0;
  const additionalGuests = Array.isArray(f.additionalGuests)
    ? f.additionalGuests
    : [];
  const roomFloors =
    kind === "rooms"
      ? sortFloorNames([
          ...configuredFloors,
          ...items.map((room) => room.floor || "Ground"),
        ])
      : [];
  const roomFloorOptions = roomFloors.length ? roomFloors : ["Ground"];
  async function save(e) {
    e.preventDefault();
    loading(true);
    error("");
    try {
      const body = { ...f };
      if (kind === "guests") {
        body.source = f.source || "Walk-in";
        body.smsConsent = Boolean(f.smsConsent);
        body.additionalGuests = additionalGuests
          .map((name) => name.trim())
          .filter(Boolean);
      }
      if (kind === "rooms") {
        body.price = Number(body.price);
        body.capacity = Number(body.capacity || 2);
        body.floor = body.floor?.trim() || "Ground";
        body.airConditioning = body.airConditioning === "true";
      }
      if (kind === "bookings") {
        body.checkIn = f.checkIn;
        body.checkOut = f.checkOut;
      }
      if (kind === "rooms" && editingRoom) {
        await api.patch(`/rooms/${editingRoom._id}`, body);
      } else {
        await api.post("/" + kind, body);
      }
      setForm({});
      setEditingRoom(null);
      toggle(false);
      refresh();
    } catch (x) {
      error(x.message || "Save failed");
    } finally {
      loading(false);
    }
  }
  async function update(id, body) {
    try {
      if (kind === "bookings" && body.status === "cancelled") {
        const cancellationReason = window.prompt("Why is this reservation being cancelled?");
        if (!cancellationReason?.trim()) return;
        body = { ...body, cancellationReason: cancellationReason.trim() };
      }
      if (
        kind === "bookings" &&
        body.status === "no_show" &&
        !window.confirm(
          "Mark this reservation as no-show? Any payments already received will not be refunded automatically.",
        )
      )
        return;
      await api.patch(`/${kind}/${id}`, body);
      if (kind === "bookings") {
        const [guestRecords, roomRecords] = await Promise.all([
          api.get("/guests"),
          api.get("/rooms"),
        ]);
        setGuests(guestRecords.data.items);
        setRooms(roomRecords.data.items);
      }
      refresh();
    } catch (x) {
      error(x.message || "Update failed");
    }
  }
  async function del(id) {
    if (!confirm("Delete this record?")) return;
    try {
      await api.delete(`/${kind}/${id}`);
      refresh();
    } catch (x) {
      error(x.message || "Delete failed");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PROPERTY MANAGEMENT</div>
          <h1>{title}</h1>
          <p>Manage your {kind} in one place.</p>
        </div>
        {canAddResource && (
          <button
            className="primary"
            onClick={() => {
              setEditingRoom(null);
              setForm({});
              toggle((current) => !current);
            }}
          >
            <Plus size={17} /> Add {kind.slice(0, -1)}
          </button>
        )}
      </div>
      {err && <div className="notice">{err}</div>}
      {show && (
        <form className="panel form-grid" onSubmit={save}>
          <div className="form-title">
            {editingRoom ? "Edit room details" : `Create ${kind.slice(0, -1)}`}
          </div>
          {kind === "bookings" ? (
            <>
              {loadingOptions && (
                <p className="booking-hint">Loading guests and rooms…</p>
              )}
              <label>
                Guest
                <select
                  required
                  value={f.guest || ""}
                  onChange={(e) => setForm({ ...f, guest: e.target.value })}
                >
                  <option value="">Select a guest</option>
                  {activeGuests.map((guest) => (
                    <option key={guest._id} value={guest._id}>
                      {guest.name}
                      {guest.phone
                        ? ` · ${formatPhone(guest.phone, guest.phoneCountryCode)}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Room
                <select
                  required
                  value={f.room || ""}
                  onChange={(e) => setForm({ ...f, room: e.target.value })}
                >
                  <option value="">Select an available room</option>
                  {rooms
                    .filter((room) => room.status === "available")
                    .map((room) => (
                      <option key={room._id} value={room._id}>
                        Room {room.number} · {room.type} · ₹{room.price}/night
                      </option>
                    ))}
                </select>
              </label>
              {selectedGuest && (
                <div className="booking-detail">
                  <b>{selectedGuest.name}</b>
                  <span>
                    {formatPhone(
                      selectedGuest.phone,
                      selectedGuest.phoneCountryCode,
                    ) || "Phone not added"}
                  </span>
                  <span>{selectedGuest.address || "Address not added"}</span>
                  <span>Source: {selectedGuest.source || "Walk-in"}</span>
                  {selectedGuest.additionalGuests?.map((name) => (
                    <span key={name}>{name}</span>
                  ))}
                </div>
              )}
              {activeGuests.length === 0 && (
                <p className="booking-hint">
                  No eligible guests available. Guests currently checked in
                  cannot be booked again. Add a guest or reactivate one in{" "}
                  <Link to="/guests">Guests</Link>.
                </p>
              )}
              {rooms.every((room) => room.status !== "available") && (
                <p className="booking-hint">
                  No available rooms. Add or update a room in{" "}
                  <Link to="/rooms">Rooms</Link>.
                </p>
              )}
              <label>
                Check-in
                <input
                  required
                  type="date"
                  value={f.checkIn || ""}
                  onChange={(e) =>
                    setForm({
                      ...f,
                      checkIn: e.target.value,
                      checkOut:
                        f.checkOut && f.checkOut <= e.target.value
                          ? ""
                          : f.checkOut,
                    })
                  }
                />
              </label>
              <label>
                Check-out
                <input
                  required
                  type="date"
                  min={f.checkIn || undefined}
                  value={f.checkOut || ""}
                  onChange={(e) => setForm({ ...f, checkOut: e.target.value })}
                />
              </label>
              <div className="booking-total">
                <span>
                  {selectedRoom
                    ? `₹${selectedRoom.price} × ${nights > 0 ? nights : 0} nights`
                    : "Select a room and dates"}
                </span>
                <b>Estimated total: ₹{bookingTotal}</b>
              </div>
            </>
          ) : (
            <>
              {fields.map(([name, label]) => (
                name === "floor" && kind === "rooms" ? (
                  <label key={name}>
                    {label}
                    <select
                      required
                      value={f.floor || "Ground"}
                      onChange={(event) =>
                        setForm({ ...f, floor: event.target.value })
                      }
                    >
                      {roomFloorOptions.map((floor) => (
                        <option key={floor} value={floor}>
                          {floor} Floor
                        </option>
                      ))}
                    </select>
                  </label>
                ) : name === "phone" && kind === "guests" ? (
                  <PhoneInput
                    key={name}
                    label={label}
                    phone={f.phone || ""}
                    phoneCountryCode={f.phoneCountryCode || "+91"}
                    onPhoneChange={(phone) => setForm({ ...f, phone })}
                    onCountryCodeChange={(phoneCountryCode) =>
                      setForm({ ...f, phoneCountryCode })
                    }
                  />
                ) : (
                  <label key={name}>
                    {name === "capacity" ? "Capacity (guests)" : label}
                    <input
                      required={
                        name === "number" || name === "price" || name === "name"
                      }
                      min={name === "capacity" ? 1 : undefined}
                      name={name}
                      type={
                        name === "price" || name === "capacity"
                          ? "number"
                          : "text"
                      }
                      value={f[name] || ""}
                      onChange={(e) =>
                        setForm({ ...f, [name]: e.target.value })
                      }
                    />
                  </label>
                )
              ))}
              {kind === "guests" && (
                <>
                  <label>
                    Government ID type
                    <select
                      required
                      value={f.governmentIdType || ""}
                      onChange={(e) =>
                        setForm({
                          ...f,
                          governmentIdType: e.target.value,
                          governmentIdNumber: "",
                        })
                      }
                    >
                      <option value="">Select ID type</option>
                      <option value="aadhaar">Aadhaar</option>
                      <option value="pan">PAN</option>
                      <option value="passport">Passport</option>
                    </select>
                  </label>
                  <label>
                    {f.governmentIdType === "aadhaar"
                      ? "Aadhaar number (12 digits)"
                      : f.governmentIdType === "pan"
                        ? "PAN number"
                        : f.governmentIdType === "passport"
                          ? "Passport number"
                          : "Government ID number"}
                    <input
                      required
                      disabled={!f.governmentIdType}
                      type="text"
                      autoComplete="off"
                      maxLength={
                        f.governmentIdType === "aadhaar"
                          ? 14
                          : f.governmentIdType === "pan"
                            ? 10
                            : 12
                      }
                      inputMode={
                        f.governmentIdType === "aadhaar" ? "numeric" : "text"
                      }
                      pattern={
                        f.governmentIdType === "aadhaar"
                          ? "[0-9 ]{12,14}"
                          : f.governmentIdType === "pan"
                            ? "[A-Za-z]{5}[0-9]{4}[A-Za-z]"
                            : f.governmentIdType === "passport"
                              ? "[A-Za-z0-9]{6,12}"
                              : undefined
                      }
                      value={f.governmentIdNumber || ""}
                      onChange={(e) =>
                        setForm({
                          ...f,
                          governmentIdNumber:
                            f.governmentIdType === "aadhaar"
                              ? e.target.value.replace(/[^0-9 ]/g, "")
                              : e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </label>
                  <label className="consent-option">
                    <input
                      type="checkbox"
                      required
                      checked={Boolean(f.governmentIdConsent)}
                      onChange={(e) =>
                        setForm({
                          ...f,
                          governmentIdConsent: e.target.checked,
                        })
                      }
                    />
                    Guest consents to storing this government ID number
                  </label>
                  <label>
                    Gender
                    <select
                      required
                      value={f.gender || ""}
                      onChange={(e) =>
                        setForm({ ...f, gender: e.target.value })
                      }
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </label>
                  <label className="consent-option">
                    <input
                      type="checkbox"
                      checked={Boolean(f.smsConsent)}
                      onChange={(e) =>
                        setForm({ ...f, smsConsent: e.target.checked })
                      }
                    />
                    Guest agrees to receive stay updates by SMS
                  </label>
                  <label>
                    Guest source
                    <select
                      value={f.source || "Walk-in"}
                      onChange={(e) =>
                        setForm({ ...f, source: e.target.value })
                      }
                    >
                      {guestSources.map((source) => (
                        <option key={source}>{source}</option>
                      ))}
                    </select>
                  </label>
                  <div className="additional-guests">
                    <div className="additional-guests-heading">
                      <div>
                        <b>Other guests</b>
                        <span>
                          Main guest plus {additionalGuests.length} additional
                          {additionalGuests.length === 1 ? " guest" : " guests"}
                          {" · "}
                          {additionalGuests.length + 1} total
                        </span>
                      </div>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          setForm({
                            ...f,
                            additionalGuests: [...additionalGuests, ""],
                          })
                        }
                      >
                        Add guest
                      </button>
                    </div>
                    {additionalGuests.map((name, index) => (
                      <div className="additional-guest-row" key={index}>
                        <label>
                          Guest {index + 2} name
                          <input
                            value={name}
                            onChange={(e) =>
                              setForm({
                                ...f,
                                additionalGuests: additionalGuests.map(
                                  (guestName, guestIndex) =>
                                    guestIndex === index
                                      ? e.target.value
                                      : guestName,
                                ),
                              })
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label={`Remove guest ${index + 2}`}
                          onClick={() =>
                            setForm({
                              ...f,
                              additionalGuests: additionalGuests.filter(
                                (_, guestIndex) => guestIndex !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {kind === "rooms" && (
            <>
              <label>
                Air conditioning
                <select
                  value={f.airConditioning ?? "false"}
                  onChange={(e) =>
                    setForm({ ...f, airConditioning: e.target.value })
                  }
                >
                  <option value="true">AC</option>
                  <option value="false">Non-AC</option>
                </select>
              </label>
              {!editingRoom && (
                <label>
                  Initial status
                  <select
                    value={f.status || "available"}
                    onChange={(e) => setForm({ ...f, status: e.target.value })}
                  >
                    <option>available</option>
                    <option>cleaning</option>
                    <option>maintenance</option>
                  </select>
                </label>
              )}
            </>
          )}
          <div className="form-actions">
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : editingRoom ? "Save changes" : "Save record"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                toggle(false);
                setEditingRoom(null);
                setForm({});
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {kind === "rooms" ? (
        <section className="room-floor-list">
          <div className="room-floor-filter">
            <label className="period-filter">
              Show floor
              <select
                className="inline-select"
                value={selectedFloor}
                onChange={(event) => setSelectedFloor(event.target.value)}
                aria-label="Filter rooms by floor"
              >
                <option value="all">All floors</option>
                {roomFloors.map((floor) => (
                  <option value={floor} key={floor}>
                    {floor} Floor
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loadingRecords ? (
            <div className="panel empty">Loading rooms…</div>
          ) : roomFloors.length ? (
            roomFloors
              .filter(
                (floor) =>
                  selectedFloor === "all" || selectedFloor === floor,
              )
              .map((floor) => (
              <div className="panel room-floor-section" key={floor}>
                <div className="room-floor-heading">
                  <div>
                    <h3>{floor} Floor</h3>
                    <p>
                      {
                        items.filter(
                          (room) => (room.floor || "Ground") === floor,
                        ).length
                      }{" "}
                      rooms
                    </p>
                  </div>
                </div>
                <div className="room-floor-grid">
                  {items
                    .filter(
                      (room) => (room.floor || "Ground") === floor,
                    )
                    .sort((a, b) =>
                      a.number.localeCompare(b.number, undefined, {
                        numeric: true,
                      }),
                    )
                    .map((room) => (
                      <article className="room-card" key={room._id}>
                        <div className="room-card-top">
                          <div>
                            <span className="room-card-label">ROOM</span>
                            <h4>{room.number}</h4>
                          </div>
                          <ActionMenu
                            items={[
                              ...(["hotel_owner", "hotel_manager"].includes(
                                user?.role,
                              )
                                ? [
                                    {
                                      label: "Edit room details",
                                      onClick: () => {
                                        setEditingRoom(room);
                                        setForm({
                                          number: room.number,
                                          type: room.type || "Standard",
                                          floor: room.floor || "Ground",
                                          capacity: room.capacity || 2,
                                          airConditioning: room.airConditioning
                                            ? "true"
                                            : "false",
                                          price: room.price,
                                        });
                                        toggle(true);
                                        window.scrollTo({
                                          top: 0,
                                          behavior: "smooth",
                                        });
                                      },
                                    },
                                    ...["available", "occupied", "cleaning", "maintenance"]
                                      .filter((status) => status !== room.status)
                                      .map((status) => ({
                                        label: `Set status: ${status.replaceAll("_", " ")}`,
                                        onClick: () =>
                                          update(room._id, { status }),
                                      })),
                                    {
                                      label: "Delete room",
                                      danger: true,
                                      onClick: () => del(room._id),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                        <p className="room-card-type">
                          {room.type || "Standard"} ·{" "}
                          {room.airConditioning ? "AC" : "Non-AC"}
                        </p>
                        <div className="room-card-details">
                          <span>
                            {room.capacity === 1
                              ? "Single occupancy"
                              : `Up to ${room.capacity || 2} guests`}
                          </span>
                          <b>₹{room.price} / night</b>
                        </div>
                        <span className={`status ${room.status}`}>
                          {room.status.replaceAll("_", " ")}
                        </span>
                      </article>
                    ))}
                  {items.every(
                    (room) => (room.floor || "Ground") !== floor,
                  ) && <p className="booking-hint">No rooms on this floor yet.</p>}
                </div>
              </div>
              ))
          ) : (
            <div className="panel empty">No rooms yet. Add your first room.</div>
          )}
        </section>
      ) : (
        <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>All {kind}</h3>
            <p>{items.length} records</p>
          </div>
          {(kind === "guests" || kind === "bookings") && (
            <div className="resource-filters">
              <label className="period-filter">
                <span>{kind === "bookings" ? "Booked" : "Added"}</span>
                <select
                  className="inline-select"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  aria-label={`Filter ${kind} by date`}
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                  <option value="custom">Custom dates</option>
                </select>
              </label>
              {period === "custom" && (
                <>
                  <label className="period-filter">
                    <span>From</span>
                    <input
                      type="date"
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(e) => setDateFrom(e.target.value)}
                      aria-label="Filter start date"
                    />
                  </label>
                  <label className="period-filter">
                    <span>To</span>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => setDateTo(e.target.value)}
                      aria-label="Filter end date"
                    />
                  </label>
                </>
              )}
              {["hotel_owner", "hotel_manager"].includes(user?.role) && (
                <button
                  className="secondary"
                  type="button"
                  onClick={() =>
                    downloadCsv(kind).catch((cause) =>
                      error(cause.message || "Unable to export records"),
                    )
                  }
                >
                  Export CSV
                </button>
              )}
            </div>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {(kind === "rooms"
                  ? ["ROOM", "TYPE", "PRICE / NIGHT", "STATUS", "ACTIONS"]
                  : kind === "guests"
                    ? [
                        "GUEST",
                        "GENDER",
                        "EMAIL",
                        "PHONE",
                        "ADDRESS",
                        "SOURCE",
                        "STATUS",
                        "ACTIONS",
                      ]
                    : [
                        "GUEST",
                        "ROOM",
                        "CHECK IN",
                        "CHECK OUT",
                        "NIGHTS",
                        "PER NIGHT",
                        "TOTAL",
                        "STATUS",
                        "PAYMENT",
                        "ACTIONS",
                      ]
                ).map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((x) => (
                  <tr key={x._id}>
                    {kind === "rooms" ? (
                      <>
                        <td>
                          <b>{x.number}</b>
                        </td>
                        <td>{x.type}</td>
                        <td>₹{x.price}</td>
                        <td>
                          <span className={`status ${x.status}`}>
                            {x.status.replaceAll("_", " ")}
                          </span>
                        </td>
                      </>
                    ) : kind === "guests" ? (
                      <>
                        <td>
                          <b>{x.name}</b>
                        </td>
                        <td>
                          {x.gender
                            ? x.gender[0].toUpperCase() + x.gender.slice(1)
                            : "—"}
                        </td>
                        <td>{x.email || "—"}</td>
                        <td>
                          {formatPhone(x.phone, x.phoneCountryCode) || "—"}
                        </td>
                        <td>{x.address || "—"}</td>
                        <td>{x.source || "Walk-in"}</td>
                        <td>
                          <span
                            className={`status ${x.active === false ? "inactive" : ""}`}
                          >
                            {x.active === false ? "inactive" : "active"}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <b>{x.guest?.name || "Guest"}</b>
                          <small>
                            {formatPhone(
                              x.guest?.phone,
                              x.guest?.phoneCountryCode,
                            ) || "Phone not added"}
                          </small>
                          <small>
                            {x.guest?.address || "Address not added"}
                          </small>
                          {x.guest?.additionalGuests?.map((name) => (
                            <small key={name}>{name}</small>
                          ))}
                          <small>
                            {x.adults || 1} guest{x.adults === 1 ? "" : "s"}
                            {" · "}
                            {x.source || "Walk-in"}
                          </small>
                        </td>
                        <td>
                          <b>
                            {x.room?.number ? `Room ${x.room.number}` : "Room"}
                          </b>
                          <small>
                            {x.room?.type || "Room type unavailable"}
                          </small>
                        </td>
                        <td>{new Date(x.checkIn).toLocaleDateString()}</td>
                        <td>{new Date(x.checkOut).toLocaleDateString()}</td>
                        <td>
                          {Math.ceil(
                            (new Date(x.checkOut) - new Date(x.checkIn)) /
                              (24 * 60 * 60 * 1000),
                          )}
                        </td>
                        <td>₹{x.nightlyRate ?? x.room?.price ?? "—"}</td>
                        <td>₹{x.total}</td>
                        <td>
                          <span className={`status ${x.status}`}>
                            {x.status.replaceAll("_", " ")}
                          </span>
                          {x.status === "cancelled" && (
                            <>
                              <small>
                                Refund eligible: ₹
                                {Number(x.cancellationRefundEligible || 0).toLocaleString("en-IN")}
                              </small>
                              {x.cancellationReason && (
                                <small>Reason: {x.cancellationReason}</small>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          <span className={`status ${x.paymentStatus || "pending"}`}>
                            {x.paymentStatus || "pending"}
                          </span>
                        </td>
                      </>
                    )}
                    <td>
                      <ActionMenu
                        items={[
                          ...(kind === "rooms"
                            ? ["available", "occupied", "cleaning", "maintenance"]
                                .filter((status) => status !== x.status)
                                .map((status) => ({
                                  label: `Set status: ${status.replaceAll("_", " ")}`,
                                  onClick: () => update(x._id, { status }),
                                }))
                            : []),
                          ...(kind === "bookings"
                            ? ["confirmed", "checked_out", "cancelled"]
                                .filter((status) => status !== x.status)
                                .map((status) => ({
                                  label: `Set status: ${status.replaceAll("_", " ")}`,
                                  onClick: () => update(x._id, { status }),
                                }))
                            : []),
                          kind === "bookings" && {
                            label: "Change history",
                            onClick: () => showBookingHistory(x),
                          },
                          kind === "bookings" &&
                            x.status === "confirmed" &&
                            dateKey(x.checkIn) <= dateKey(new Date()) && {
                              label: "Mark no-show",
                              danger: true,
                              onClick: () => update(x._id, { status: "no_show" }),
                            },
                          kind === "guests" &&
                            hasPermission(user, "guests.view") && {
                            label: "Stay history",
                            to: `/guests/${x._id}/history`,
                          },
                          kind === "guests" && {
                            label: x.active === false ? "Reactivate" : "Deactivate",
                            onClick: () =>
                              update(x._id, { active: x.active === false }),
                          },
                          {
                            label: `Delete ${kind.slice(0, -1)}`,
                            danger: true,
                            onClick: () => del(x._id),
                          } &&
                            (kind === "guests" || kind === "bookings"),
                        ]}
                      />
                    </td>
                  </tr>
                ))
              ) : loadingRecords ? (
                <tr>
                  <td
                    colSpan={
                      kind === "bookings" ? 10 : kind === "guests" ? 7 : 5
                    }
                    className="empty"
                  >
                    Loading {kind}…
                  </td>
                </tr>
              ) : (
                <tr>
                  <td
                    colSpan={
                      kind === "bookings" ? 10 : kind === "guests" ? 7 : 5
                    }
                    className="empty"
                  >
                    No records found. Add your first {kind.slice(0, -1)}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      )}
      {bookingHistory && (
        <div
          className="history-backdrop"
          onClick={() => setBookingHistory(null)}
        >
          <section
            className="panel history-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-history-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-head">
              <div>
                <h3 id="booking-history-title">
                  Reservation history · {bookingHistory.booking.guest?.name || "Guest"}
                </h3>
                <p>
                  Room {bookingHistory.booking.room?.number || "—"} ·{" "}
                  {bookingHistory.items.length} changes
                </p>
              </div>
              <button
                className="secondary"
                type="button"
                onClick={() => setBookingHistory(null)}
              >
                Close
              </button>
            </div>
            {bookingHistory.error && (
              <div className="notice">{bookingHistory.error}</div>
            )}
            {bookingHistory.loading ? (
              <div className="empty">Loading reservation history…</div>
            ) : (
              <div className="history-list">
                {bookingHistory.items.map((entry) => (
                  <article className="history-entry" key={entry._id}>
                    <b>{entry.action.replaceAll(".", " ")}</b>
                    <small>
                      {new Date(entry.createdAt).toLocaleString("en-IN")} ·{" "}
                      {entry.actor?.name || "Former staff"}
                    </small>
                    {Object.keys(entry.details || {}).length > 0 && (
                      <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                    )}
                  </article>
                ))}
                {!bookingHistory.items.length && (
                  <div className="empty">
                    No changes have been recorded for this reservation.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
