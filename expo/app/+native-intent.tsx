export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    void initial;
    const match = path && path.match(/[?&]ref=([A-Za-z0-9]+)/i);
    if (match) {
      const code = match[1].toUpperCase();
      console.log("[native-intent] referral link → /join?ref=", code);
      return `/join?ref=${code}`;
    }
    return path;
  } catch (e) {
    console.log("[native-intent] redirect error", e);
    return "/";
  }
}
