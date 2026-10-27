export const encodePayload = (data) => {
  const jsonString = JSON.stringify(data);
  return btoa(jsonString); // Base64 encode
};
