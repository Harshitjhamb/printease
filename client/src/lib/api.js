import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: `${baseURL}/api`
});

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

