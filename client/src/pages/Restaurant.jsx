import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { downloadCsv } from "../services/download";
import { formatPhone } from "../components/PhoneInput";
import ActionMenu from "../components/common/ActionMenu";
import { hasPermission } from "../utils/permissions";

const tabs = ["orders", "menu", "inventory"];

function dateString(date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function restaurantTaxRate(order) {
  if (order.taxRate != null) return order.taxRate;
  return order.subtotal ? (order.tax / order.subtotal) * 100 : 0;
}

function orderFilterParams(period, from, to) {
  if (period === "all") return undefined;
  if (period === "custom")
    return from && to ? { period, from, to } : null;
  return { period };
}

function printRestaurantBill(order) {
  const escape = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  const guest = order.booking?.guest;
  const room = order.booking?.room?.number;
  const windowRef = window.open("", "_blank");
  if (!windowRef) throw new Error("Allow pop-ups to print the restaurant bill");
  windowRef.document.write(`<!doctype html><html><head><title>Restaurant bill</title><style>body{font:14px Arial,sans-serif;max-width:680px;margin:36px auto;color:#222}header{border-bottom:2px solid #222;padding-bottom:12px}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd}.totals{margin-left:auto;width:240px}.totals p{display:flex;justify-content:space-between}</style></head><body><header><h1>Restaurant bill</h1><p>Order: ${escape(order._id)}</p><p>${new Date(order.createdAt).toLocaleString("en-IN")}</p></header><p><b>${order.serviceType === "room" || room ? `Room service · Room ${escape(room || order.table)}` : `Table service · ${escape(order.table || "")}`}</b>${guest?.name ? ` · ${escape(guest.name)}` : ""}</p><p>${escape(formatPhone(guest?.phone, guest?.phoneCountryCode))}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${(order.items || []).map((item) => `<tr><td>${escape(item.name)}${item.notes ? `<br><small>${escape(item.notes)}</small>` : ""}</td><td>${escape(item.quantity)}</td><td>₹${escape(item.unitPrice)}</td><td>₹${escape(item.quantity * item.unitPrice)}</td></tr>`).join("")}</tbody></table><div class="totals"><p><span>Subtotal</span><b>₹${escape(order.subtotal)}</b></p><p><span>Restaurant GST (${escape(restaurantTaxRate(order))}%)</span><b>₹${escape(order.tax)}</b></p><p><span>Total</span><b>₹${escape(order.total)}</b></p></div><p>Status: ${escape(order.status)}</p><script>window.onload=()=>window.print()</script></body></html>`);
  windowRef.document.close();
}

export default function Restaurant() {
  const user = useSelector((state) => state.auth.user);
  const isManager = ["hotel_owner", "hotel_manager"].includes(user?.role);
  const canCreateOrder = hasPermission(user, "restaurant.orders.create");
  const canUpdateOrder = hasPermission(user, "restaurant.orders.update");
  const canManageMenu = hasPermission(user, "restaurant.menu.manage");
  const canViewInventory = hasPermission(user, "restaurant.inventory.view");
  const canManageInventory = hasPermission(user, "restaurant.inventory.manage");
  const canViewIncome = hasPermission(user, "restaurant.income.view");
  const availableTabs = tabs.filter(
    (name) =>
      name === "menu" ||
      (name === "orders" && (canCreateOrder || canUpdateOrder)) ||
      (name === "inventory" && canViewInventory),
  );
  const [tab, setTab] = useState(isManager ? "menu" : "orders");
  const activeTab = availableTabs.includes(tab) ? tab : availableTabs[0];
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [incomePeriod, setIncomePeriod] = useState("today");
  const [incomeFrom, setIncomeFrom] = useState(dateString(new Date()));
  const [incomeTo, setIncomeTo] = useState(dateString(new Date()));
  const [income, setIncome] = useState(null);
  const [restaurantGstRate, setRestaurantGstRate] = useState("0");
  const [savingRestaurantSettings, setSavingRestaurantSettings] = useState(false);
  const [updatingMenuItemId, setUpdatingMenuItemId] = useState("");
  const [orderPeriod, setOrderPeriod] = useState("all");
  const [orderFrom, setOrderFrom] = useState("");
  const [orderTo, setOrderTo] = useState("");
  const [error, setError] = useState("");
  const [menuForm, setMenuForm] = useState({ name: "", category: "", price: "" });
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    unit: "unit",
    quantity: "0",
    reorderLevel: "0",
    cost: "0",
  });
  const [orderForm, setOrderForm] = useState({
    serviceType: "table",
    booking: "",
    table: "",
    menuItem: "",
    quantity: 1,
    notes: "",
  });
  const load = useCallback(async () => {
    try {
      const requests = [
        api.get("/restaurant/menu"),
        api.get("/restaurant/active-bookings"),
        canViewInventory
          ? api.get("/inventory")
          : Promise.resolve(null),
      ];
      if (isManager) requests.push(api.get("/restaurant/settings"));
      const [menuResponse, bookingResponse, inventoryResponse, settingsResponse] =
        await Promise.all(requests);
      setMenu(menuResponse.data.menu);
      setBookings(bookingResponse.data.bookings);
      setInventory(inventoryResponse?.data.items || []);
      if (settingsResponse)
        setRestaurantGstRate(String(settingsResponse.data.restaurantGstRate ?? 0));
      setError("");
    } catch (cause) {
      setError(cause.message || "Unable to load restaurant workspace");
    }
  }, [isManager, canViewInventory]);

  useEffect(() => {
    load();
  }, [load]);

  const loadOrders = useCallback(async () => {
    if (!canCreateOrder && !canUpdateOrder) {
      setOrders([]);
      return;
    }
    const params = orderFilterParams(orderPeriod, orderFrom, orderTo);
    if (params === null) {
      setOrders([]);
      return;
    }
    try {
      const response = await api.get("/restaurant/orders", { params });
      setOrders(response.data.orders);
    } catch (cause) {
      setError(cause.message || "Unable to load restaurant orders");
    }
  }, [orderPeriod, orderFrom, orderTo, canCreateOrder, canUpdateOrder]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadIncome = useCallback(async () => {
    if (!canViewIncome) return;
    const params =
      incomePeriod === "custom"
        ? incomeFrom && incomeTo
          ? { period: "custom", from: incomeFrom, to: incomeTo }
          : null
        : { period: incomePeriod };
    if (!params) {
      setIncome(null);
      return;
    }
    try {
      const response = await api.get("/restaurant/income", { params });
      setIncome(response.data);
    } catch (cause) {
      setError(cause.message || "Unable to load restaurant income");
    }
  }, [incomePeriod, incomeFrom, incomeTo, canViewIncome]);

  useEffect(() => {
    loadIncome();
  }, [loadIncome]);

  async function saveRestaurantSettings(event) {
    event.preventDefault();
    setSavingRestaurantSettings(true);
    setError("");
    try {
      const response = await api.patch("/restaurant/settings", {
        restaurantGstRate: Number(restaurantGstRate),
      });
      setRestaurantGstRate(String(response.data.restaurantGstRate));
    } catch (cause) {
      setError(cause.message || "Unable to save restaurant GST rate");
    } finally {
      setSavingRestaurantSettings(false);
    }
  }

  async function submitMenu(event) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/restaurant/menu", {
        ...menuForm,
        price: Number(menuForm.price),
      });
      setMenuForm({ name: "", category: "", price: "" });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to save menu item");
    }
  }

  async function toggleMenuAvailability(item) {
    setUpdatingMenuItemId(item._id);
    setError("");
    try {
      const response = await api.patch(`/restaurant/menu/${item._id}`, {
        active: !item.active,
      });
      setMenu((currentMenu) =>
        currentMenu.map((menuItem) =>
          menuItem._id === item._id ? response.data.item : menuItem,
        ),
      );
    } catch (cause) {
      setError(cause.message || "Unable to update menu item availability");
    } finally {
      setUpdatingMenuItemId("");
    }
  }

  async function submitOrder(event) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/restaurant/orders", {
        serviceType: orderForm.serviceType,
        booking: orderForm.booking || undefined,
        table: orderForm.table,
        items: [
          {
            menuItem: orderForm.menuItem,
            quantity: Number(orderForm.quantity),
            notes: orderForm.notes,
          },
        ],
      });
      setOrderForm({
        serviceType: "table",
        booking: "",
        table: "",
        menuItem: "",
        quantity: 1,
        notes: "",
      });
      await load();
      await loadOrders();
    } catch (cause) {
      setError(cause.message || "Unable to create restaurant order");
    }
  }

  async function submitInventory(event) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/inventory", {
        ...inventoryForm,
        quantity: Number(inventoryForm.quantity),
        reorderLevel: Number(inventoryForm.reorderLevel),
        cost: Number(inventoryForm.cost),
      });
      setInventoryForm({
        name: "",
        unit: "unit",
        quantity: "0",
        reorderLevel: "0",
        cost: "0",
      });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to add stock item");
    }
  }

  async function changeOrder(order, status) {
    try {
      await api.patch(`/restaurant/orders/${order._id}`, { status });
      await Promise.all([loadOrders(), loadIncome()]);
    } catch (cause) {
      setError(cause.message || "Unable to update order");
    }
  }

  async function adjustStock(item) {
    const adjustment = window.prompt(
      `Stock adjustment for ${item.name} (use a negative number to remove stock):`,
    );
    if (adjustment === null) return;
    const reason = window.prompt("Adjustment reason (optional):") || "";
    try {
      await api.patch(`/inventory/${item._id}/adjust`, {
        adjustment: Number(adjustment),
        reason,
      });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to adjust stock");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FOOD & BEVERAGE</div>
          <h1>Restaurant</h1>
          <p>Manage menu items, room-linked orders and inventory stock.</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="filter-tabs">
        {availableTabs.map((name) => (
          <button
            type="button"
            className={tab === name ? "selected" : ""}
            key={name}
            onClick={() => setTab(name)}
          >
            {name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>
      {canViewIncome && (
        <section className="panel restaurant-income">
          <div className="panel-head">
            <div>
              <h3>Restaurant income</h3>
              <p>Only served orders count; cancelled and unfinished orders are excluded.</p>
            </div>
            <div className="resource-filters">
              <label className="period-filter">
                Period
                <select
                  className="inline-select"
                  value={incomePeriod}
                  onChange={(event) => setIncomePeriod(event.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                  <option value="custom">Date range</option>
                </select>
              </label>
              {incomePeriod === "custom" && (
                <>
                  <label className="period-filter">
                    From
                    <input
                      type="date"
                      value={incomeFrom}
                      max={incomeTo || undefined}
                      onChange={(event) => setIncomeFrom(event.target.value)}
                    />
                  </label>
                  <label className="period-filter">
                    To
                    <input
                      type="date"
                      value={incomeTo}
                      min={incomeFrom || undefined}
                      onChange={(event) => setIncomeTo(event.target.value)}
                    />
                  </label>
                </>
              )}
              <button
                type="button"
                className="secondary"
                disabled={
                  incomePeriod === "custom" && (!incomeFrom || !incomeTo)
                }
                onClick={() =>
                  downloadCsv(
                    "restaurant-income",
                    incomePeriod === "custom"
                      ? { period: "custom", from: incomeFrom, to: incomeTo }
                      : { period: incomePeriod },
                  ).catch((cause) =>
                    setError(
                      cause.message || "Unable to export restaurant income",
                    ),
                  )
                }
              >
                Download income CSV
              </button>
            </div>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-top">Served-order income</div>
              <strong>
                {income
                  ? `₹${Number(income.income).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}`
                  : "—"}
              </strong>
              <small>Includes restaurant-only GST recorded on each order</small>
            </div>
            <div className="stat-card">
              <div className="stat-top">Orders served</div>
              <strong>{income?.servedOrders ?? "—"}</strong>
            </div>
          </div>
        </section>
      )}
      {hasPermission(user, "restaurant.settings.manage") && (
        <form
          className="panel form-grid restaurant-tax-settings"
          onSubmit={saveRestaurantSettings}
        >
          <div className="form-title">Restaurant GST</div>
          <label>
            GST rate (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={restaurantGstRate}
              onChange={(event) => setRestaurantGstRate(event.target.value)}
              required
            />
          </label>
          <p className="booking-hint">
            This rate applies only to new restaurant orders. It does not change
            hotel invoice GST or existing order bills.
          </p>
          <div className="form-actions">
            <button className="secondary" disabled={savingRestaurantSettings}>
              {savingRestaurantSettings ? "Saving…" : "Save restaurant GST"}
            </button>
          </div>
        </form>
      )}
      {activeTab === "orders" && (
        <>
          {isManager && (
            <div className="page-heading restaurant-order-tools">
              <div className="resource-filters">
                <label className="period-filter">
                  Order dates
                  <select
                    className="inline-select"
                    value={orderPeriod}
                    onChange={(event) => setOrderPeriod(event.target.value)}
                  >
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                    <option value="custom">Date range</option>
                  </select>
                </label>
                {orderPeriod === "custom" && (
                  <>
                    <label className="period-filter">
                      From
                      <input
                        type="date"
                        value={orderFrom}
                        max={orderTo || undefined}
                        onChange={(event) => setOrderFrom(event.target.value)}
                      />
                    </label>
                    <label className="period-filter">
                      To
                      <input
                        type="date"
                        value={orderTo}
                        min={orderFrom || undefined}
                        onChange={(event) => setOrderTo(event.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>
              <button
                className="secondary"
                type="button"
                disabled={orderFilterParams(orderPeriod, orderFrom, orderTo) === null}
                onClick={() =>
                  downloadCsv(
                    "restaurant-orders",
                    orderFilterParams(orderPeriod, orderFrom, orderTo),
                  ).catch((cause) =>
                    setError(cause.message || "Unable to export restaurant orders"),
                  )
                }
              >
                Export orders CSV
              </button>
            </div>
          )}
          {canCreateOrder && <form className="panel form-grid" onSubmit={submitOrder}>
            <div className="form-title">New restaurant order</div>
            <label>
              Service type
              <select
                value={orderForm.serviceType}
                onChange={(event) =>
                  setOrderForm({
                    ...orderForm,
                    serviceType: event.target.value,
                    booking: "",
                    table: "",
                  })
                }
              >
                <option value="table">Table served</option>
                <option value="room">Room served</option>
              </select>
            </label>
            {orderForm.serviceType === "room" ? (
              <label>
                Checked-in guest / room
                <select
                  required
                  value={orderForm.booking}
                  onChange={(event) =>
                    setOrderForm({ ...orderForm, booking: event.target.value })
                  }
                >
                  <option value="">Select checked-in guest and room</option>
                  {bookings.map((booking) => (
                    <option value={booking._id} key={booking._id}>
                      Room {booking.room?.number} · {booking.guest?.name}
                      {booking.guest?.phone
                        ? ` · ${formatPhone(
                            booking.guest.phone,
                            booking.guest.phoneCountryCode,
                          )}`
                        : " · No phone added"}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Table name / number
                <input
                  required
                  value={orderForm.table}
                  onChange={(event) =>
                    setOrderForm({ ...orderForm, table: event.target.value })
                  }
                />
              </label>
            )}
            <label>
              Menu item
              <select
                required
                value={orderForm.menuItem}
                onChange={(event) =>
                  setOrderForm({ ...orderForm, menuItem: event.target.value })
                }
              >
                <option value="">Select item</option>
                {menu.filter((item) => item.active).map((item) => (
                  <option value={item._id} key={item._id}>
                    {item.name} · ₹{item.price}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="1"
                max="1000"
                required
                value={orderForm.quantity}
                onChange={(event) =>
                  setOrderForm({ ...orderForm, quantity: event.target.value })
                }
              />
            </label>
            <label>
              Notes
              <input
                value={orderForm.notes}
                onChange={(event) =>
                  setOrderForm({ ...orderForm, notes: event.target.value })
                }
              />
            </label>
            <div className="form-actions"><button className="primary">Create order</button></div>
          </form>}
          <section className="panel table-panel">
            <div className="table-wrap">
              <table>
                <thead><tr><th>ORDER</th><th>SERVICE · ROOM / TABLE · GUEST</th><th>ITEMS</th>{isManager && <th>PLACED BY</th>}<th>SUBTOTAL</th><th>GST</th><th>TOTAL</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>{new Date(order.createdAt).toLocaleString("en-IN")}</td>
                      <td>
                        <b>
                          {order.serviceType === "room" || order.booking?.room?.number
                            ? "Room service"
                            : "Table service"}
                          {order.booking?.room?.number
                            ? ` · Room ${order.booking.room.number}`
                            : order.table
                              ? ` · ${order.table}`
                              : ""}
                        </b>
                        {order.booking?.guest && (
                          <>
                            <small>{order.booking.guest.name}</small>
                            <small>
                              {formatPhone(
                                order.booking.guest.phone,
                                order.booking.guest.phoneCountryCode,
                              ) || "No phone added"}
                            </small>
                          </>
                        )}
                      </td>
                      <td>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</td>
                      {isManager && (
                        <td>
                          {order.createdBy?.name || "Unknown"}
                          <small>{order.createdBy?.role?.replaceAll("_", " ") || ""}</small>
                        </td>
                      )}
                      <td>₹{order.subtotal}</td>
                      <td>₹{order.tax} ({restaurantTaxRate(order)}%)</td>
                      <td>₹{order.total}</td>
                      <td>{order.status}</td>
                      <td>
                        <ActionMenu
                          items={[
                            {
                              label: "Print bill",
                              onClick: () => {
                                try {
                                  printRestaurantBill(order);
                                } catch (cause) {
                                  setError(
                                    cause.message ||
                                      "Unable to print restaurant bill",
                                  );
                                }
                              },
                            },
                            ...(!["served", "cancelled"].includes(order.status)
                              ? ["new", "preparing", "ready", "served", "cancelled"].map(
                                  (status) => ({
                                    label: `Set ${status.replaceAll("_", " ")}`,
                                    onClick: () => changeOrder(order, status),
                                  }),
                                )
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td className="empty" colSpan={isManager ? "9" : "8"}>No restaurant orders in this date range.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {activeTab === "menu" && (
        <>
          {canManageMenu && (
            <form className="panel form-grid" onSubmit={submitMenu}>
              <div className="form-title">Add menu item</div>
              <label>Name<input required value={menuForm.name} onChange={(event) => setMenuForm({ ...menuForm, name: event.target.value })} /></label>
              <label>Category<input value={menuForm.category} onChange={(event) => setMenuForm({ ...menuForm, category: event.target.value })} /></label>
              <label>Price<input type="number" min="0" step="0.01" required value={menuForm.price} onChange={(event) => setMenuForm({ ...menuForm, price: event.target.value })} /></label>
              <div className="form-actions"><button className="primary">Save menu item</button></div>
            </form>
          )}
          <section className="panel table-panel">
            <div className="table-wrap">
              <table>
                <thead><tr><th>ITEM</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th>{canManageMenu && <th>ACTIONS</th>}</tr></thead>
                <tbody>
                  {menu.map((item) => (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{item.category || "—"}</td>
                      <td>₹{item.price}</td>
                      <td>{item.active ? "Available" : "Unavailable"}</td>
                      {canManageMenu && (
                        <td>
                          <ActionMenu
                            disabled={Boolean(updatingMenuItemId)}
                            items={[
                              {
                                label:
                                  updatingMenuItemId === item._id
                                    ? "Updating…"
                                    : item.active
                                      ? "Mark unavailable"
                                      : "Mark available",
                                onClick: () => toggleMenuAvailability(item),
                              },
                            ]}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                  {menu.length === 0 && <tr><td className="empty" colSpan={canManageMenu ? "5" : "4"}>No menu items configured.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {activeTab === "inventory" && (
        <>
          {canManageInventory && (
            <form className="panel form-grid" onSubmit={submitInventory}>
              <div className="form-title">Add inventory item</div>
              <label>Name<input required value={inventoryForm.name} onChange={(event) => setInventoryForm({ ...inventoryForm, name: event.target.value })} /></label>
              <label>Unit<input value={inventoryForm.unit} onChange={(event) => setInventoryForm({ ...inventoryForm, unit: event.target.value })} /></label>
              <label>Starting quantity<input type="number" min="0" step="0.01" value={inventoryForm.quantity} onChange={(event) => setInventoryForm({ ...inventoryForm, quantity: event.target.value })} /></label>
              <label>Reorder level<input type="number" min="0" step="0.01" value={inventoryForm.reorderLevel} onChange={(event) => setInventoryForm({ ...inventoryForm, reorderLevel: event.target.value })} /></label>
              <label>Unit cost<input type="number" min="0" step="0.01" value={inventoryForm.cost} onChange={(event) => setInventoryForm({ ...inventoryForm, cost: event.target.value })} /></label>
              <div className="form-actions"><button className="primary">Add inventory</button></div>
            </form>
          )}
          <section className="panel table-panel">
            <div className="table-wrap">
              <table>
                <thead><tr><th>ITEM</th><th>STOCK</th><th>REORDER AT</th><th>STATUS</th>{canManageInventory && <th>ADJUST</th>}</tr></thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{item.reorderLevel} {item.unit}</td>
                      <td>{item.lowStock ? "Reorder needed" : "In stock"}</td>
                      {canManageInventory && (
                        <td>
                          <ActionMenu
                            items={[
                              {
                                label: "Adjust stock",
                                onClick: () => adjustStock(item),
                              },
                            ]}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                  {inventory.length === 0 && <tr><td className="empty" colSpan={canManageInventory ? "5" : "4"}>No inventory items yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
