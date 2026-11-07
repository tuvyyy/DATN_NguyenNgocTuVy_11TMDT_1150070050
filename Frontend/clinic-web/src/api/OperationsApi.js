import axios from "axios";

const base = () => `${localStorage.getItem("tiuv_auth_api_base") || "https://localhost:7007"}/api/operations`;
const token = () => localStorage.getItem("access_token") || sessionStorage.getItem("access_token") || "";
const config = () => ({ headers: { Authorization: `Bearer ${token()}` } });

export const OperationsApi = {
  health: async () => (await axios.get(`${base()}/health`)).data,
  notifications: async () => (await axios.get(`${base()}/notifications`, config())).data,
  notificationDetail: async (id) => (await axios.get(`${base()}/notifications/${id}`, config())).data,
  markRead: async (id) => axios.patch(`${base()}/notifications/${id}/read`, {}, config()),
  sendNotification: async (data) => (await axios.post(`${base()}/notifications`, data, config())).data,
  updateNotification: async (id, data) => (await axios.put(`${base()}/notifications/${id}`, data, config())).data,
  deleteNotification: async (id) => axios.delete(`${base()}/notifications/${id}`, config()),
  sentNotifications: async () => (await axios.get(`${base()}/notifications/sent`, config())).data,
  createSupport: async (data) => (await axios.post(`${base()}/support`, data, config())).data,
  supportRequests: async (status = "") =>
    (await axios.get(`${base()}/support`, { ...config(), params: status ? { status } : {} })).data,
  updateSupport: async (id, data) => (await axios.patch(`${base()}/support/${id}`, data, config())).data,
  diagnostics: async (id) => (await axios.get(`${base()}/support/${id}/diagnostics`, config())).data,
  targets: async () => (await axios.get(`${base()}/targets`, config())).data,
};

export const operationsHubUrl = () =>
  `${localStorage.getItem("tiuv_auth_api_base") || "https://localhost:7007"}/hubs/operations`;
export const operationsToken = token;
