import { api } from "./api";

export async function fetchMeta() {
  const { data } = await api.get("/meta");
  return data; // { printerActive }
}

