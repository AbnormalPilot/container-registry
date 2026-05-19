import axios from "axios";

const TOKEN_KEY = "registry-dashboard-token";

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function encodeRepoPath(name) {
  return name.split("/").map(encodeURIComponent).join("/");
}

export function formatApiError(error) {
  return error?.response?.data?.error?.message || error?.message || "Request failed";
}

const api = axios.create({
  baseURL: "/api",
  timeout: 180000
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

export default api;
