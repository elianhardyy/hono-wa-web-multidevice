import crypto from "crypto";
import {
  getAppName,
  getAppDescription,
  getAppLogoUrl,
  type User,
} from "../utils/auth.js";

export const md5Hex = (value: string) =>
  crypto.createHash("md5").update(value.trim().toLowerCase()).digest("hex");

export const getGravatarUrl = (key: string, size = 96) =>
  `https://www.gravatar.com/avatar/${md5Hex(key)}?s=${size}&d=identicon&r=g`;

export const getAvatarUrl = (user: User) => {
  if (user.profilePhotoUrl) return user.profilePhotoUrl;
  const key = user.email?.trim() ? user.email : user.username;
  return getGravatarUrl(key ?? user.username);
};

export const DEFAULT_APP_LOGO_URL = "/assets/uploads/honowa.png";

export const getUiSettings = async () => {
  const [appName, appDescription, appLogoUrl] = await Promise.all([
    getAppName(),
    getAppDescription(),
    getAppLogoUrl(),
  ]);
  const customLogoUrl = appLogoUrl?.trim() ? appLogoUrl : null;
  return {
    appName,
    appDescription,
    appLogoUrl: customLogoUrl ?? DEFAULT_APP_LOGO_URL,
    appLogoIsDefault: !customLogoUrl,
  };
};

export const withToast = (url: string, message: string, type: "success" | "error" | "info" = "info") => {
  const sep = url.includes("?") ? "&" : "?";
  return (
    url +
    sep +
    "toast=" +
    encodeURIComponent(message) +
    "&toastType=" +
    encodeURIComponent(type)
  );
};
