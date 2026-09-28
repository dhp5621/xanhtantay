import { API_URL } from "./api";

/**
 * Push payloads and QR codes carry the web's paths (`/don-hang`, `/farmer`, `/tra-cuu/{id}` …).
 * Returns the matching in-app route, or null when the link does not belong to the app.
 */
export function resolveAppLink(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  let path = url.trim();
  if (/^https?:\/\//i.test(path)) {
    if (!path.startsWith(API_URL)) return null;
    path = path.slice(API_URL.length);
  }
  path = path.split(/[?#]/)[0].replace(/\/+$/, "");
  if (!path.startsWith("/")) path = `/${path}`;
  const [, head, id] = path.split("/");

  switch (head) {
    case undefined:
    case "":
      return "/tabs";
    case "farmer":
      return "/tabs/farmer";
    case "don-hang":
      return id ? `/don-hang/${id}` : "/tabs/don-hang";
    case "hop-rau":
      return id ? `/hop-rau/${id}` : "/tabs/hop-rau";
    case "gom-don":
      return id ? `/tabs/gom-don/${id}` : "/tabs/gom-don";
    case "tra-cuu":
      return id ? `/tra-cuu/${id}` : "/tra-cuu";
    case "dinh-ky":
    case "dang-ky":
      return "/dinh-ky";
    case "farms":
      return id ? `/farms/${id}` : "/farms";
    case "tai-khoan":
      return "/tabs/tai-khoan";
    default:
      return null;
  }
}
