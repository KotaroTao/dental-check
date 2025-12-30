/**
 * ジオコーディングユーティリティ
 * Google Geocoding API を使用（フォールバック: Nominatim）
 */

export interface GeocodingResult {
  country: string;
  region: string;  // 都道府県
  city: string;    // 市区町村
  town: string;    // 町丁目
}

export interface ForwardGeocodingResult {
  latitude: number;
  longitude: number;
}

const TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;

/**
 * 緯度経度から住所情報を取得
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<GeocodingResult | null> {
  console.log(`=== Reverse Geocode ===`);
  console.log(`Input: lat=${lat}, lon=${lon}`);

  // Google Geocoding APIが設定されている場合はそちらを使用
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    const result = await reverseGeocodeWithGoogle(lat, lon, googleApiKey);
    if (result) return result;
    console.log("Google Geocoding failed, falling back to Nominatim...");
  }

  // フォールバック: Nominatim API
  return reverseGeocodeWithNominatim(lat, lon);
}

/**
 * Google Geocoding API を使用した逆ジオコーディング
 */
async function reverseGeocodeWithGoogle(
  lat: number,
  lon: number,
  apiKey: string
): Promise<GeocodingResult | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&language=ja&key=${apiKey}`;
      console.log(`Google Geocoding attempt ${attempt}/${MAX_RETRIES}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Google Geocoding HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log(`Google Geocoding status: ${data.status}`);

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = parseGoogleResult(data.results[0]);
        console.log(`Google Geocoding result:`, result);
        return result;
      }

      if (data.status === "OVER_QUERY_LIMIT" && attempt < MAX_RETRIES) {
        const waitTime = attempt * 1000;
        console.log(`Rate limited, waiting ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      console.error(`Google Geocoding error: ${data.status} - ${data.error_message || ""}`);
      return null;
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      console.error(
        `Google Geocoding error (attempt ${attempt}/${MAX_RETRIES}):`,
        isTimeout ? "Request timed out" : error
      );

      if (attempt < MAX_RETRIES) {
        const waitTime = attempt * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Google Geocoding API のレスポンスをパース
 */
function parseGoogleResult(result: {
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}): GeocodingResult {
  const components = result.address_components;

  let country = "JP";
  let region = "";
  let city = "";
  let town = "";

  for (const component of components) {
    const types = component.types;

    if (types.includes("country")) {
      country = component.short_name;
    }
    // 都道府県
    if (types.includes("administrative_area_level_1")) {
      region = component.long_name;
    }
    // 市区町村（複数のタイプをチェック）
    if (
      types.includes("locality") ||
      types.includes("administrative_area_level_2") ||
      types.includes("sublocality_level_1")
    ) {
      if (!city) city = component.long_name;
    }
    // 町丁目
    if (
      types.includes("sublocality_level_2") ||
      types.includes("sublocality_level_3") ||
      types.includes("sublocality_level_4")
    ) {
      if (!town) town = component.long_name;
    }
    // 番地レベル（町丁目が取れない場合のフォールバック）
    if (types.includes("sublocality") && !town) {
      town = component.long_name;
    }
  }

  return { country, region, city, town };
}

/**
 * Nominatim API を使用した逆ジオコーディング（フォールバック用）
 */
async function reverseGeocodeWithNominatim(
  lat: number,
  lon: number
): Promise<GeocodingResult | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ja`;
      console.log(`Nominatim attempt ${attempt}/${MAX_RETRIES}: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "DentalCheckApp/1.0 (https://qrqr-dental.com; mail@function-t.com)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`Nominatim response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 429 && attempt < MAX_RETRIES) {
          const waitTime = attempt * 2000;
          console.log(`Rate limited, waiting ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        return null;
      }

      const data = await response.json();
      const address = data.address;

      if (!address) {
        console.warn("Nominatim returned no address data");
        return null;
      }

      const result: GeocodingResult = {
        country: address.country_code?.toUpperCase() || "JP",
        region: address.state || address.province || "",
        city: address.city || address.town || address.village || address.municipality || "",
        town: address.neighbourhood || address.quarter || address.suburb || "",
      };

      console.log(`Nominatim result:`, result);
      return result;
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof Error && error.message.includes("fetch failed");

      console.error(
        `Nominatim error (attempt ${attempt}/${MAX_RETRIES}):`,
        isTimeout ? "Request timed out" : error
      );

      if ((isTimeout || isNetworkError) && attempt < MAX_RETRIES) {
        const waitTime = attempt * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      return null;
    }
  }

  console.error("All Nominatim attempts failed");
  return null;
}

/**
 * 住所から緯度経度を取得（フォワードジオコーディング）
 */
export async function forwardGeocode(
  address: string
): Promise<ForwardGeocodingResult | null> {
  console.log(`=== Forward Geocode ===`);
  console.log(`Input: address=${address}`);

  if (!address || address.trim() === "") {
    console.log("Empty address provided");
    return null;
  }

  // Google Geocoding APIが設定されている場合はそちらを使用
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    const result = await forwardGeocodeWithGoogle(address, googleApiKey);
    if (result) return result;
    console.log("Google Geocoding failed, falling back to Nominatim...");
  }

  // フォールバック: Nominatim API
  return forwardGeocodeWithNominatim(address);
}

/**
 * Google Geocoding API を使用したフォワードジオコーディング
 */
async function forwardGeocodeWithGoogle(
  address: string,
  apiKey: string
): Promise<ForwardGeocodingResult | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&language=ja&region=jp&key=${apiKey}`;
      console.log(`Google Forward Geocoding attempt ${attempt}/${MAX_RETRIES}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Google Geocoding HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log(`Google Geocoding status: ${data.status}`);

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const result: ForwardGeocodingResult = {
          latitude: location.lat,
          longitude: location.lng,
        };
        console.log(`Google Forward Geocoding result:`, result);
        return result;
      }

      if (data.status === "OVER_QUERY_LIMIT" && attempt < MAX_RETRIES) {
        const waitTime = attempt * 1000;
        console.log(`Rate limited, waiting ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      console.error(`Google Geocoding error: ${data.status} - ${data.error_message || ""}`);
      return null;
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      console.error(
        `Google Forward Geocoding error (attempt ${attempt}/${MAX_RETRIES}):`,
        isTimeout ? "Request timed out" : error
      );

      if (attempt < MAX_RETRIES) {
        const waitTime = attempt * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Nominatim API を使用したフォワードジオコーディング（フォールバック用）
 */
async function forwardGeocodeWithNominatim(
  address: string
): Promise<ForwardGeocodingResult | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=jp&limit=1`;
      console.log(`Nominatim Forward Geocoding attempt ${attempt}/${MAX_RETRIES}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "DentalCheckApp/1.0 (https://qrqr-dental.com; mail@function-t.com)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`Nominatim response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 429 && attempt < MAX_RETRIES) {
          const waitTime = attempt * 2000;
          console.log(`Rate limited, waiting ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        return null;
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        console.warn("Nominatim returned no results");
        return null;
      }

      const result: ForwardGeocodingResult = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };

      console.log(`Nominatim Forward Geocoding result:`, result);
      return result;
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof Error && error.message.includes("fetch failed");

      console.error(
        `Nominatim Forward Geocoding error (attempt ${attempt}/${MAX_RETRIES}):`,
        isTimeout ? "Request timed out" : error
      );

      if ((isTimeout || isNetworkError) && attempt < MAX_RETRIES) {
        const waitTime = attempt * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      return null;
    }
  }

  console.error("All Nominatim Forward Geocoding attempts failed");
  return null;
}
