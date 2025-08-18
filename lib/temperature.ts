/**
 * Countries that primarily use Fahrenheit for temperature
 */
const FAHRENHEIT_COUNTRIES = ["US", "LR", "MM", "BS"]; // US, Liberia, Myanmar, Bahamas

/**
 * Convert Celsius to Fahrenheit
 */
export const celsiusToFahrenheit = (celsius: number): number => {
  return Math.round((celsius * 9) / 5 + 32);
};

/**
 * Convert Fahrenheit to Celsius
 */
export const fahrenheitToCelsius = (fahrenheit: number): number => {
  return Math.round(((fahrenheit - 32) * 5) / 9);
};

/**
 * Determine if user location should use Fahrenheit based on country code
 */
export const shouldUseFahrenheit = (countryCode?: string): boolean => {
  if (!countryCode) return false;
  return FAHRENHEIT_COUNTRIES.includes(countryCode.toUpperCase());
};

/**
 * Format temperature with appropriate unit and symbol based on user's country
 * @param tempCelsius - Temperature in Celsius (base unit)
 * @param userCountryCode - User's country code
 * @returns Formatted temperature string like "72°F" or "22°C"
 */
export const formatTemperatureForUser = (
  tempCelsius: number,
  userCountryCode?: string
): string => {
  const useFahrenheit = shouldUseFahrenheit(userCountryCode);
  
  if (useFahrenheit) {
    const tempF = celsiusToFahrenheit(tempCelsius);
    return `${tempF}°F`;
  } else {
    return `${Math.round(tempCelsius)}°C`;
  }
};

/**
 * Get the temperature unit symbol based on user's country
 */
export const getTemperatureUnit = (userCountryCode?: string): "°C" | "°F" => {
  return shouldUseFahrenheit(userCountryCode) ? "°F" : "°C";
};

/**
 * Convert temperature value to user's preferred unit
 * @param tempCelsius - Temperature in Celsius (base unit)
 * @param userCountryCode - User's country code
 * @returns Temperature value in user's preferred unit
 */
export const convertTemperatureForUser = (
  tempCelsius: number,
  userCountryCode?: string
): number => {
  const useFahrenheit = shouldUseFahrenheit(userCountryCode);
  return useFahrenheit ? celsiusToFahrenheit(tempCelsius) : Math.round(tempCelsius);
};