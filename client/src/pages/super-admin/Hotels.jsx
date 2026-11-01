import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import ActionMenu from "../../components/common/ActionMenu";

export default function SuperAdminHotels() {
  const [hotels, setHotels] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");

  const loadHotels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/super-admin/hotels");
      setHotels(response.data.hotels);
      setError("");
    } catch (cause) {
      setError(cause.message || "Unable to load hotels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHotels();
  }, [loadHotels]);

  async function updateStatus(id, status) {
    setUpdating(id);
    setError("");
    try {
      const response = await api.patch(`/super-admin/hotels/${id}`, {
        status,
      });
      setHotels((current) =>
        current.map((hotel) =>
          hotel._id === id ? response.data.hotel : hotel,
        ),
      );
    } catch (cause) {
      setError(cause.message || "Unable to update hotel status");
    } finally {
      setUpdating("");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PLATFORM CONTROL</div>
          <h1>Hotels</h1>
          <p>Review hotel applications and manage property access.</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Registered hotels</h3>
            <p>{hotels.length} hotels</p>
          </div>
          <button
            className="secondary"
            type="button"
            onClick={loadHotels}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>HOTEL</th>
                <th>ADDRESS</th>
                <th>CITY</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((hotel) => (
                <tr key={hotel._id}>
                  <td>
                    <b>{hotel.name}</b>
                  </td>
                  <td>{hotel.address || "—"}</td>
                  <td>{hotel.city || "—"}</td>
                  <td>{hotel.email || "—"}</td>
                  <td>{hotel.phone || "—"}</td>
                  <td>
                    <span className={`status ${hotel.status}`}>
                      {hotel.status}
                    </span>
                  </td>
                  <td>
                    <ActionMenu
                      disabled={updating === hotel._id}
                      items={[
                        hotel.status !== "approved" && {
                          label: "Approve",
                          onClick: () => updateStatus(hotel._id, "approved"),
                        },
                        hotel.status !== "suspended" && {
                          label: "Suspend",
                          danger: true,
                          onClick: () => updateStatus(hotel._id, "suspended"),
                        },
                        hotel.status === "suspended" && {
                          label: "Reopen",
                          onClick: () => updateStatus(hotel._id, "pending"),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {!loading && hotels.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty">
                    No hotels have registered yet.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="7" className="empty">
                    Loading hotels…
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
