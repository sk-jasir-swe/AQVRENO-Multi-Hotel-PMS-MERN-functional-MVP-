import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";

export default function Subscription() {
  const user = useSelector((state) => state.auth.user);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState({ rooms: 0, staff: 0, properties: 1 });
  const [plan, setPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [plansResponse, subscriptionResponse] = await Promise.all([
        api.get("/plans"),
        api.get("/subscription"),
      ]);
      setPlans(plansResponse.data.plans);
      setSubscription(subscriptionResponse.data.subscription);
      setUsage(subscriptionResponse.data.usage || { rooms: 0, staff: 0, properties: 1 });
      setPlan(
        subscriptionResponse.data.subscription?.plan?._id ||
          plansResponse.data.plans[0]?._id ||
          "",
      );
    } catch (cause) {
      setError(cause.message || "Unable to load subscription options");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function request(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/subscription", { plan, billingCycle });
      setMessage(
        "Plan request saved. Your hotel administrator will update payment status manually.",
      );
      await load();
    } catch (cause) {
      setError(cause.message || "Unable to request subscription");
    }
  }

  const selectedPlan = plans.find((item) => item._id === plan);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACCOUNT</div>
          <h1>Subscription</h1>
          <p>Choose a plan. Billing and payment status are tracked manually.</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      {message && <div className="success-notice">{message}</div>}
      <section className="panel subscription-current">
        <h3>Current subscription</h3>
        {subscription ? (
          <>
            <p>
              <b>{subscription.plan?.name || "Plan"}</b> ·{" "}
              {subscription.status.replaceAll("_", " ")} ·{" "}
              {subscription.paymentStatus.replaceAll("_", " ")}
              {subscription.currentPeriodEnd &&
                ` · Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
            </p>
            <p className="booking-hint">
              Usage: {usage.rooms}/{subscription.plan?.limits?.rooms ?? "∞"} rooms ·{" "}
              {usage.staff}/{subscription.plan?.limits?.staff ?? "∞"} staff ·{" "}
              {usage.properties}/{subscription.plan?.limits?.properties ?? "∞"} properties
            </p>
          </>
        ) : (
          <p>
            No subscription request has been made yet. Existing hotel data
            remains available, but a plan is required before adding rooms or
            staff.
          </p>
        )}
      </section>
      <div className="plan-grid">
        {plans.map((item) => (
          <button
            type="button"
            className={`plan-card ${plan === item._id ? "plan-selected" : ""}`}
            onClick={() => setPlan(item._id)}
            key={item._id}
          >
            <span className="eyebrow">{item.name}</span>
            <strong>
              ₹
              {Number(
                billingCycle === "yearly" ? item.priceYearly : item.priceMonthly,
              ).toLocaleString("en-IN")}
            </strong>
            <small>/{billingCycle === "yearly" ? "year" : "month"}</small>
            <ul>
              {item.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <small>
              Up to {item.limits?.rooms ?? "—"} rooms ·{" "}
              {item.limits?.staff ?? "—"} staff
            </small>
          </button>
        ))}
      </div>
      {plans.length > 0 && user?.role === "hotel_owner" && (
        <form className="panel form-grid" onSubmit={request}>
          <div className="form-title">
            Request {selectedPlan?.name || "a plan"}
          </div>
          <label>
            Billing cycle
            <select
              value={billingCycle}
              onChange={(event) => setBillingCycle(event.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <p className="booking-hint">
            No automatic payment is taken. Your account administrator will
            confirm billing and update the subscription record.
          </p>
          <div className="form-actions">
            <button className="primary">Request plan</button>
          </div>
        </form>
      )}
    </>
  );
}
