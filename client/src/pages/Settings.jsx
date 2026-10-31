import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import {
  BACKUP_LAST_DOWNLOADED_KEY,
  downloadBackup,
} from "../services/download";
import PhoneInput from "../components/PhoneInput";

export default function Settings() {
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [backupReminder, setBackupReminder] = useState(false);
  const [backup, setBackup] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoring, setRestoring] = useState(false);
  useEffect(() => {
    const lastBackup =
      window.localStorage.getItem(BACKUP_LAST_DOWNLOADED_KEY) ||
      window.localStorage.getItem("staypro-backup-last-downloaded");
    setBackupReminder(
      !lastBackup || Date.now() - new Date(lastBackup).getTime() > 7 * 86400000,
    );
    api
      .get("/hotel/settings")
      .then((response) => setForm(response.data.hotel))
      .catch((cause) => setError(cause.message || "Unable to load hotel settings"));
  }, []);

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await api.patch("/hotel/settings", {
        ...form,
        gstRate: Number(form.gstRate),
        cancellationCutoffHours: Number(form.cancellationCutoffHours),
        cancellationRefundPercent: Number(form.cancellationRefundPercent),
      });
      setForm(response.data.hotel);
      setMessage("Hotel and invoice settings saved.");
    } catch (cause) {
      setError(cause.message || "Unable to save settings");
    }
  }

  async function downloadHotelBackup() {
    try {
      await downloadBackup();
      setBackupReminder(false);
      setMessage("Hotel backup downloaded.");
    } catch (cause) {
      setError(cause.message || "Unable to download backup");
    }
  }

  async function selectBackup(event) {
    const file = event.target.files?.[0];
    setBackup(null);
    setRestorePreview(null);
    setError("");
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("Backup file must be 25 MB or smaller");
      event.target.value = "";
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const response = await api.post("/exports/restore/preview", parsed);
      setBackup(parsed);
      setRestorePreview(response.data.preview);
    } catch (cause) {
      setError(cause.message || "Backup file is invalid");
    }
  }

  async function restoreHotelBackup() {
    if (!backup || !window.confirm("Restore the listed records? Existing records will not be overwritten."))
      return;
    setRestoring(true);
    setError("");
    try {
      const response = await api.post("/exports/restore", {
        backup,
        confirm: true,
      });
      setMessage(response.data.message);
      setBackup(null);
      setRestorePreview(null);
    } catch (cause) {
      setError(cause.message || "Unable to restore backup");
    } finally {
      setRestoring(false);
    }
  }

  if (!form) return <div className="loading">Loading hotel settings…</div>;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HOTEL ADMINISTRATION</div>
          <h1>Hotel settings</h1>
          <p>
            Hotel details, cancellation policy and invoice defaults. New hotels
            start with a 24-hour cutoff and 100% refundable amount before cutoff.
          </p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      {message && <div className="success-notice">{message}</div>}
      <form className="panel form-grid" onSubmit={save}>
        {[
          ["name", "Hotel name"],
          ["address", "Address"],
          ["city", "City"],
          ["country", "Country"],
          ["gstin", "GSTIN (optional)"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={form[key] || ""}
              onChange={(event) =>
                setForm({ ...form, [key]: event.target.value })
              }
            />
          </label>
        ))}
        <PhoneInput
          label="Phone (optional)"
          phone={form.phone || ""}
          phoneCountryCode={form.phoneCountryCode || "+91"}
          onPhoneChange={(phone) => setForm({ ...form, phone })}
          onCountryCodeChange={(phoneCountryCode) =>
            setForm({ ...form, phoneCountryCode })
          }
        />
        <label>
          GST rate (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.gstRate ?? 0}
            onChange={(event) =>
              setForm({ ...form, gstRate: event.target.value })
            }
          />
        </label>
        <label>
          Free cancellation cutoff (hours before check-in)
          <input
            type="number"
            min="0"
            max="8760"
            value={form.cancellationCutoffHours ?? 24}
            onChange={(event) =>
              setForm({ ...form, cancellationCutoffHours: event.target.value })
            }
          />
        </label>
        <label>
          Refund percentage before cutoff (%)
          <input
            type="number"
            min="0"
            max="100"
            value={form.cancellationRefundPercent ?? 100}
            onChange={(event) =>
              setForm({
                ...form,
                cancellationRefundPercent: event.target.value,
              })
            }
          />
        </label>
        <p className="booking-hint">
          Refund eligibility is calculated at cancellation. Eligible refunds
          must still be recorded manually in Payments.
        </p>
        <div className="form-actions">
          <button className="primary">Save settings</button>
          {user?.role === "hotel_owner" && (
            <button
              type="button"
              className="secondary"
              onClick={downloadHotelBackup}
            >
              Download hotel backup
            </button>
          )}
        </div>
      </form>
      {user?.role === "hotel_owner" && (
        <section className="panel form-grid backup-tools">
          <h3>Backup and recovery</h3>
          {backupReminder && (
            <div className="notice">
              Reminder: download a hotel backup. This browser has no backup
              recorded in the last 7 days.
            </div>
          )}
          <label>
            Validate an AQVRENO backup
            <input type="file" accept="application/json,.json" onChange={selectBackup} />
          </label>
          <p className="booking-hint">
            Staff login credentials, subscription records and hotel profile
            settings are not imported. Staff referenced by the backup must
            already exist in this hotel.
          </p>
          {restorePreview && (
            <>
              <p className="booking-hint">
                Preview only. Restore will add missing records for this hotel
                and will not overwrite existing records or another hotel.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>COLLECTION</th><th>IN FILE</th><th>EXISTING</th><th>TO ADD</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(restorePreview).map(([name, counts]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{counts.backup}</td>
                        <td>{counts.existing}</td>
                        <td>{counts.toRestore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="primary"
                onClick={restoreHotelBackup}
                disabled={restoring}
              >
                {restoring ? "Restoring…" : "Confirm restore"}
              </button>
            </>
          )}
        </section>
      )}
    </>
  );
}
