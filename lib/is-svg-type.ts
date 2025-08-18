import type { SVGTypes } from "@/app/@types";

const VALID_SVG_TYPES: Array<SVGTypes> = [
  "feed",
  "info",
  "leaderboard",
  "repo",
  "tamagitchi",
];

export const isSVGType = (type: string): type is SVGTypes => {
  return VALID_SVG_TYPES.includes(type as SVGTypes);
};
