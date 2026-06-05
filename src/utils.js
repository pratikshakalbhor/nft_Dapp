export const shortenAddress = (addr) => {
  if (typeof addr === "string" && addr.length > 10) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
  return typeof addr === "string" ? addr : "";
};