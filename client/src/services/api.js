import axios from "axios";
let refreshPromise = null;
let expirationNotified = false;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => {
    expirationNotified = false;
    return response;
  },
  async (error) => {
    const config = error.config;
    const url = config?.url || "";
    const isAuthEntryPoint = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
      "/auth/forgot-password",
      "/auth/reset-password",
    ].some((path) => url.endsWith(path));

    if (
      error.response?.status !== 401 ||
      !config ||
      config._skipAuthRefresh ||
      config._authRetried ||
      isAuthEntryPoint
    )
      return Promise.reject(
        error.response?.data || { message: error.message || "Network error" },
      );

    config._authRetried = true;
    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh", null, { _skipAuthRefresh: true })
          .finally(() => {
            refreshPromise = null;
          });
      }
      await refreshPromise;
      expirationNotified = false;
      return api(config);
    } catch (refreshError) {
      if (!expirationNotified) {
        expirationNotified = true;
        window.dispatchEvent(new Event("auth:session-expired"));
      }
      return Promise.reject(
        refreshError.response?.data ||
          error.response?.data ||
          { message: "Session expired. Please sign in again." },
      );
    }
  },
);

export default api;
