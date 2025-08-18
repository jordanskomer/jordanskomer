/**
 * Countries that primarily use miles instead of kilometers
 */
const MILE_USING_COUNTRIES = ["US", "UK", "GB", "LR", "MM"];

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance);
};

/**
 * Convert kilometers to miles
 */
export const kmToMiles = (km: number): number => {
  return Math.round(km * 0.621371);
};

/**
 * Determine if user location should use miles based on country code
 */
export const shouldUseMiles = (countryCode?: string): boolean => {
  if (!countryCode) return false;
  return MILE_USING_COUNTRIES.includes(countryCode.toUpperCase());
};

/**
 * Format distance with appropriate unit based on user's country
 * Returns formatted string like "150km away" or "93mi away"
 */
export const formatDistanceFromUser = (
  distanceKm: number,
  userCountryCode?: string
): string => {
  const useMiles = shouldUseMiles(userCountryCode);
  
  if (useMiles) {
    const miles = kmToMiles(distanceKm);
    return `${miles.toLocaleString()}mi away`;
  } else {
    return `${distanceKm.toLocaleString()}km away`;
  }
};

/**
 * Calculate and format distance between two geographic points
 * Returns formatted distance string with appropriate unit
 */
export const calculateAndFormatDistance = (
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  userCountryCode?: string
): string => {
  const distanceKm = calculateDistanceKm(fromLat, fromLon, toLat, toLon);
  return formatDistanceFromUser(distanceKm, userCountryCode);
};