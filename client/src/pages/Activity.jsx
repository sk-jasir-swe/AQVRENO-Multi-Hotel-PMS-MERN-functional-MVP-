import { useEffect, useState } from "react";
import api from "../services/api";

export default function Activity() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/activity")
      .then((response) => setItems(response.data.items))
      .catch((cause) => setError(cause.message || "Unable to load activity"));
  }, []);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HOTEL ADMINISTRATION</div>
          <h1>Staff activity</h1>
          <p>Recent booking, payment, room, staff and inventory changes.</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>WHEN</th>
                <th>STAFF MEMBER</th>
                <th>ACTION</th>
                <th>RECORD</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{new Date(item.createdAt).toLocaleString("en-IN")}</td>
                  <td>{item.actor?.name || "Former staff"}</td>
                  <td>{item.action.replaceAll(".", " ")}</td>
                  <td>{item.entity}</td>
                  <td>{JSON.stringify(item.details || {})}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty">No activity recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
