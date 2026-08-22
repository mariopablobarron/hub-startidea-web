export function isExactSameOrigin(request: Request): boolean {
  let expected: string;
  try {
    expected = new URL(request.url).origin;
  } catch {
    return false;
  }

  const supplied = request.headers.get("origin") || request.headers.get("referer");
  if (!supplied || supplied === "null") return false;
  try {
    return new URL(supplied).origin === expected;
  } catch {
    return false;
  }
}
