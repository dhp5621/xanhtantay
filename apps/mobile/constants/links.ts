import { API_URL, type SessionUser } from "./api";

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
      return id === "vuon" ? "/farmer/vuon" : id === "nang-suat" ? "/farmer/nang-suat" : "/tabs/farmer";
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

const FARMER_ONLY = ["/tabs/farmer", "/farmer"];
const CUSTOMER_ONLY = ["/don-hang", "/tabs/don-hang", "/dinh-ky", "/tabs/gom-don", "/tabs/hop-rau", "/hop-rau"];
const SIGNED_IN = ["/farms"];
const under = (href: string, roots: string[]) => roots.some((r) => href === r || href.startsWith(`${r}/`));

/**
 * Where a link from a notification may really go for whoever is signed in: the screen itself, or
 * the login / the person's own home when the screen belongs to the other role.
 */
export function guardAppLink(href: string, user: SessionUser | null): string {
  const farmerOnly = under(href, FARMER_ONLY);
  const customerOnly = under(href, CUSTOMER_ONLY);
  if (!user) return farmerOnly || customerOnly || under(href, SIGNED_IN) ? `/dang-nhap?${farmerOnly ? "role=farmer&" : ""}next=${encodeURIComponent(href)}` : href;
  const isFarmer = user.role === "farmer";
  if (farmerOnly && !isFarmer) return "/tabs";
  if ((customerOnly || href === "/tabs") && isFarmer) return "/tabs/farmer";
  return href;
}
