import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  withCredentials: true,
});
api.interceptors.response.use(
  (r) => r,
  (e) => Promise.reject(e.response?.data || { message: "Network error" }),
);
export default api;
