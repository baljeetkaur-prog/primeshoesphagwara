import { jwtDecode } from 'jwt-decode';
import { decryptToken } from '../utils/securetoken';

export const isAdminAuthenticated = async () => {
  const encryptedToken = sessionStorage.getItem("adminToken");
  const userInfo = sessionStorage.getItem("uinfo");

  if (userInfo) return false;
  if (!encryptedToken) return false;

  try {
    const decryptedToken = await decryptToken(encryptedToken); // ✅ uses iv + data from single string
    const decoded = jwtDecode(decryptedToken);

    const currentTime = Date.now() / 1000;
    if (decoded.exp && decoded.exp < currentTime) {
      sessionStorage.removeItem("adminToken");
      return false;
    }

    return decoded.role === "admin" || decoded.role === "superadmin";
  } catch (err) {
    console.error("Failed to decrypt or decode token", err);
    return false;
  }
};
