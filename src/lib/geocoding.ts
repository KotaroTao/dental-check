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
  // Google Geocoding APIが設定されている場合はそちらを使用
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    const result = await reverseGeocodeWithGoogle(lat, lon, googleApiKey);
    if (result) return result;
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Google Geocoding HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        return parseGoogleResult(data.results[0]);
      }

      if (data.status === "OVER_QUERY_LIMIT" && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }

      console.error(`Google Geocoding error: ${data.status}`);
      return null;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
      console.error("Google Geocoding failed:", error instanceof Error ? error.message : error);
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

  // 町丁目の各レベルを個別に取得
  let sublocalityLevel2 = ""; // 町名（例: 松園町）
  let sublocalityLevel3 = ""; // 丁目（例: 7丁目 or 7）
  let sublocalityLevel4 = ""; // 番地レベル
  let sublocality = "";       // フォールバック用

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
    // 町丁目の各レベルを個別に取得
    if (types.includes("sublocality_level_2")) {
      sublocalityLevel2 = component.long_name;
    }
    if (types.includes("sublocality_level_3")) {
      sublocalityLevel3 = component.long_name;
    }
    if (types.includes("sublocality_level_4")) {
      sublocalityLevel4 = component.long_name;
    }
    // 番地レベル（フォールバック用）
    if (types.includes("sublocality") && !sublocality) {
      sublocality = component.long_name;
    }
  }

  // 町名を組み立て（町名 + 丁目を結合）
  let town = "";
  if (sublocalityLevel2) {
    town = sublocalityLevel2;
    // 丁目が数字のみの場合は「丁目」を付加して結合
    if (sublocalityLevel3) {
      // 数字のみかチェック（半角・全角両方）
      const isNumericOnly = /^[0-9０-９]+$/.test(sublocalityLevel3);
      if (isNumericOnly) {
        town += sublocalityLevel3 + "丁目";
      } else {
        town += sublocalityLevel3;
      }
    }
  } else if (sublocalityLevel3) {
    // level2がない場合はlevel3を使用（数字のみの場合は空にする）
    const isNumericOnly = /^[0-9０-９]+$/.test(sublocalityLevel3);
    if (!isNumericOnly) {
      town = sublocalityLevel3;
    }
  } else if (sublocalityLevel4) {
    const isNumericOnly = /^[0-9０-９]+$/.test(sublocalityLevel4);
    if (!isNumericOnly) {
      town = sublocalityLevel4;
    }
  } else if (sublocality) {
    const isNumericOnly = /^[0-9０-９]+$/.test(sublocality);
    if (!isNumericOnly) {
      town = sublocality;
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "DentalCheckApp/1.0 (https://qrqr-dental.com; mail@function-t.com)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429 && attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
          continue;
        }
        return null;
      }

      const data = await response.json();
      const address = data.address;

      if (!address) return null;

      return {
        country: address.country_code?.toUpperCase() || "JP",
        region: address.state || address.province || "",
        city: address.city || address.town || address.village || address.municipality || "",
        town: address.neighbourhood || address.quarter || address.suburb || "",
      };
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof Error && error.message.includes("fetch failed");

      if ((isTimeout || isNetworkError) && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
      console.error("Nominatim reverse geocode failed:", error instanceof Error ? error.message : error);
      return null;
    }
  }
  return null;
}

/**
 * 住所から緯度経度を取得（フォワードジオコーディング）
 */
export async function forwardGeocode(
  address: string
): Promise<ForwardGeocodingResult | null> {
  if (!address || address.trim() === "") {
    return null;
  }

  // Google Geocoding APIが設定されている場合はそちらを使用
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    const result = await forwardGeocodeWithGoogle(address, googleApiKey);
    if (result) return result;
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Google Geocoding HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }

      if (data.status === "OVER_QUERY_LIMIT" && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }

      console.error(`Google Geocoding error: ${data.status}`);
      return null;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
      console.error("Google forward geocode failed:", error instanceof Error ? error.message : error);
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "DentalCheckApp/1.0 (https://qrqr-dental.com; mail@function-t.com)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429 && attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
          continue;
        }
        return null;
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof Error && error.message.includes("fetch failed");

      if ((isTimeout || isNetworkError) && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
      console.error("Nominatim forward geocode failed:", error instanceof Error ? error.message : error);
      return null;
    }
  }
  return null;
}
