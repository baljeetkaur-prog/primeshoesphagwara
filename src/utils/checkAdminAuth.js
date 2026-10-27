import { jwtDecode } from "jwt-decode";
import { decryptToken } from "./securetoken"; // Adjust path if needed

export const isAdminAuthenticated = async () => {
  const encoded = sessionStorage.getItem("adminToken");
  const userInfo = sessionStorage.getItem("uinfo");

  // ❌ Prevent admin login if user is already logged in
  if (userInfo) return false;

  if (!encoded) return false;

  try {
    const token = await decryptToken(encoded);
    const decoded = jwtDecode(token);

    const currentTime = Date.now() / 1000;
    if (decoded.exp && decoded.exp < currentTime) {
      console.warn("Admin token has expired");
      sessionStorage.removeItem("adminToken");
      return false;
    }

    return decoded.role === "admin" || decoded.role === "superadmin";
  } catch (error) {
    console.error("Failed to decode or decrypt admin token:", error);
    return false;
  }
};
