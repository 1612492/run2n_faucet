import axios from "axios";

const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export function addToQueue({ account, reCaptcha }) {
  return request.post("/queue/add", { account, reCaptcha });
}

export function getQueue() {
  return request.get("/queue");
}
