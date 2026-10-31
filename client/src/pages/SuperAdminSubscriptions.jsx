import { useEffect, useState } from "react";
import api from "../services/api";

export default function SuperAdminSubscriptions() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState({
    name: "",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "INR",
    properties: 1,
    rooms: 20,
    staff: 5,
    features: "",
  });
  const [error, setError] = useState("");
  async function load() {
    try {
      const [planResponse, subscriptionResponse] = await Promise.all([
        api.get("/super-admin/plans"),
        api.get("/super-admin/subscriptions"),
      ]);
      setPlans(planResponse.data.plans);
      setSubscriptions(subscriptionResponse.data.subscriptions);
    } catch (cause) {
      setError(cause.message || "Unable to load subscription management");
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function createPlan(event) {
    event.preventDefault();
    try {
      await api.post("/super-admin/plans", {
        ...form,
        priceMonthly: Number(form.priceMonthly),
        priceYearly: Number(form.priceYearly),
        limits: {
          properties: Number(form.properties),
          rooms: Number(form.rooms),
          staff: Number(form.staff),
        },
        features: form.features
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),
      });
      setForm({
        ...form,
        name: "",
        features: "",
      });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to create plan");
    }
  }
  async function updateSubscription(subscription, changes) {
    try {
      await api.patch(`/super-admin/subscriptions/${subscription._id}`, changes);
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to update subscription");
    }
  }
  async function updatePlan(plan, active) {
    try {
      await api.patch(`/super-admin/plans/${plan._id}`, { active });
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to update plan");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PLATFORM ADMIN</div>
          <h1>Plans & subscriptions</h1>
          <p>Manage hotel plans and manually track subscription billing.</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <form className="panel form-grid" onSubmit={createPlan}>
        <div className="form-title">Create plan</div>
        <label>
          Plan name
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          Monthly price
          <input
            type="number"
            min="0"
            required
            value={form.priceMonthly}
            onChange={(event) =>
              setForm({ ...form, priceMonthly: event.target.value })
            }
          />
        </label>
        <label>
          Yearly price
          <input
            type="number"
            min="0"
            required
            value={form.priceYearly}
            onChange={(event) =>
              setForm({ ...form, priceYearly: event.target.value })
            }
          />
        </label>
        {["properties", "rooms", "staff"].map((limit) => (
          <label key={limit}>
            Maximum {limit}
            <input
              type="number"
              min="1"
              required
              value={form[limit]}
              onChange={(event) =>
                setForm({ ...form, [limit]: event.target.value })
              }
            />
          </label>
        ))}
        <label>
          Features (comma-separated)
          <input
            value={form.features}
            onChange={(event) =>
              setForm({ ...form, features: event.target.value })
            }
          />
        </label>
        <div className="form-actions">
          <button className="primary">Create plan</button>
        </div>
      </form>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Plans</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PLAN</th>
                <th>MONTHLY</th>
                <th>YEARLY</th>
                <th>ROOMS</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan._id}>
                  <td>{plan.name}</td>
                  <td>₹{plan.priceMonthly}</td>
                  <td>₹{plan.priceYearly}</td>
                  <td>{plan.limits?.rooms ?? "—"}</td>
                  <td>{plan.active ? "Active" : "Inactive"}</td>
                  <td>
                    <button
                      className="mini-btn"
                      onClick={() => updatePlan(plan, !plan.active)}
                    >
                      {plan.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Subscriptions</h3>
            <p>Update status after receiving payments off-platform.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>HOTEL</th>
                <th>PLAN</th>
                <th>CYCLE</th>
                <th>STATUS</th>
                <th>PAYMENT</th>
                <th>UPDATE</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription._id}>
                  <td>{subscription.hotel?.name || "—"}</td>
                  <td>{subscription.plan?.name || "—"}</td>
                  <td>{subscription.billingCycle}</td>
                  <td>
                    <select
                      className="inline-select"
                      value={subscription.status}
                      onChange={(event) =>
                        updateSubscription(subscription, {
                          status: event.target.value,
                        })
                      }
                    >
                      {["trialing", "active", "past_due", "cancelled", "expired"].map(
                        (value) => (
                          <option value={value} key={value}>
                            {value.replaceAll("_", " ")}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td>
                    <select
                      className="inline-select"
                      value={subscription.paymentStatus}
                      onChange={(event) =>
                        updateSubscription(subscription, {
                          paymentStatus: event.target.value,
                        })
                      }
                    >
                      {["pending", "paid", "past_due", "refunded"].map(
                        (value) => (
                          <option value={value} key={value}>
                            {value.replaceAll("_", " ")}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td>
                    <input
                      className="inline-date"
                      type="date"
                      value={
                        subscription.currentPeriodEnd
                          ? new Date(subscription.currentPeriodEnd)
                              .toISOString()
                              .slice(0, 10)
                          : ""
                      }
                      aria-label={`Set period end for ${subscription.hotel?.name || "subscription"}`}
                      onChange={(event) =>
                        updateSubscription(subscription, {
                          currentPeriodEnd: event.target.value || null,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty">
                    No subscriptions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
