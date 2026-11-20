import { request, requestWithMeta } from "@/lib/axios";

const url = "/settings/whatsapp";

export const whatsappSettingsService = {
  get: () => request({ url, method: "GET" }),
  update: (data) => request({ url, method: "PATCH", data }),
  reveal: (field, currentPassword) => request({ url: `${url}/reveal`, method: "POST", data: { field, currentPassword } }),
  setAssistant: (enabled, currentPassword) => request({ url: `${url}/assistant`, method: "PATCH", data: { enabled, currentPassword } }),
  testOpenAi: (data) => request({ url: `${url}/openai/test`, method: "POST", data }),
  testMeta: (data) => request({ url: `${url}/meta/test`, method: "POST", data }),
  sendCode: (data) => request({ url: `${url}/phone`, method: "POST", data }),
  verify: (data) => request({ url: `${url}/phone/verify`, method: "POST", data }),
  phones: (params, signal) => requestWithMeta({ url: `${url}/phones`, method: "GET", params, signal }),
  renamePhone: (id, label) => request({ url: `${url}/phone/${id}`, method: "PATCH", data: { label } }),
  unlinkPhone: (id, currentPassword) => request({ url: `${url}/phone/${id}`, method: "DELETE", data: { currentPassword } }),
  history: (params, signal) => requestWithMeta({ url: `${url}/history`, method: "GET", params, signal }),
};
