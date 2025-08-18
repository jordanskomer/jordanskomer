export function extractColo(request: Request): string {
  const colo = request.cf?.colo;
  if (colo && typeof colo === "string") {
    return colo;
  }
  console.warn("Invalid colo type");
  return "DFW";
}
