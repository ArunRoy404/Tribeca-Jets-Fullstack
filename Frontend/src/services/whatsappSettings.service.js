import { request } from "@/lib/axios";

const url = "/settings/whatsapp";

export const whatsappSettingsService = {
  get: () => request({ url, method: "GET" }),
  update: (data) => request({ url, method: "PATCH", data }),
  testOpenAi: (data) => request({ url: `${url}/openai/test`, method: "POST", data }),
  testMeta: (data) => request({ url: `${url}/meta/test`, method: "POST", data }),
  sendCode: (data) => request({ url: `${url}/phone`, method: "POST", data }),
  verify: (data) => request({ url: `${url}/phone/verify`, method: "POST", data }),
  unlink: (data) => request({ url: `${url}/phone`, method: "DELETE", data }),
};
