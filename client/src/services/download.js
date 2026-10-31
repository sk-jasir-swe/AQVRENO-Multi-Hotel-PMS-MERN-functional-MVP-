import api from "./api";

export async function downloadCsv(kind, params) {
  const response = await api.get(`/exports/${kind}`, {
    params,
    responseType: "blob",
  });
  const url = URL.createObjectURL(
    new Blob([response.data], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadBackup() {
  const response = await api.get("/exports/backup", { responseType: "blob" });
  const url = URL.createObjectURL(
    new Blob([response.data], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `staypro-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  window.localStorage.setItem("staypro-backup-last-downloaded", new Date().toISOString());
}
