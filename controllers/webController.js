import {
  runQuery,
  successResponse,
  errorResponse,
} from "../utils/commonFunctions.js";
import axios from "axios";

export const chatBot = async (req, res) => {
  const userMessage = (req?.body?.message || "").trim();

  if (!userMessage) {
    return res.status(400).json({ reply: "Message is required." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful boat rental assistant. Answer clearly and concisely." },
          { role: "user", content: userMessage },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return res.status(500).json({ reply: `OpenAI API error: ${errText}` });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn’t get a response.";
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Error contacting chatbot service." });
  }
};


export const oldnearby = async (req, res) => {
    const { type = "hospital", lat, lng, radiusKm = 20} = req.body;
    console.log("req.body", req.body)
    if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: "Please provide latitude and longitude" });
    }

    try {
        const radiusMeters = radiusKm * 1000;
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
        const response = await axios.get(url, {
            params: {
                location: `${lat},${lng}`,
                radius: radiusMeters,
                type,
                key: process.env.GOOGLE_MAPS_API_KEY,
            },
        });

        if (response.data.status !== "OK") {
            return res.status(500).json({ error: `Google API error: ${response.data.status}` });
        }

        const places = response.data.results;

        if (places.length === 0) {
            return res.json({ message: `No ${type}s found within ${radiusKm} km.` });
        }

        return res.json({
            count: places.length,
            type,
            places: places.map(p => ({
                name: p.name,
                address: p.vicinity,
                location: p.geometry.location,
            })),
        });

    } catch (error) {
        console.error("Error fetching places:", error.response?.data || error.message);
        return res.status(500).json({ error: "Failed to fetch nearby places" });
    }
};


export const nearby = async (req, res) => {
    const {type, lat, lng, radiusKm = 5, page = 1, limit = 10 } = req.body;

    if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: "Please provide latitude and longitude" });
    }

    const radiusMeters = radiusKm * 1000;

    // Overpass QL query
    const query = `
        [out:json];
        node
          ["amenity"="${type}"]
          (around:${radiusMeters},${lat},${lng});
        out;
    `;

    try {
        const response = await axios.get("https://overpass-api.de/api/interpreter", {
            params: { data: query }
        });

        const places = response.data.elements.map(p => ({
            id: p.id,
            name: p.tags.name || "Unknown",
            location: { lat: p.lat, lng: p.lon },
        }));

        if (places.length === 0) {
            return res.json({ message: `No ${type}s found within ${radiusKm} km.` });
        }

        // Pagination logic
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedPlaces = places.slice(startIndex, endIndex);

        return res.json({
            count: places.length,       // total results
            page,                       // current page
            limit,                      // results per page
            totalPages: Math.ceil(places.length / limit),
            type,
            places: paginatedPlaces
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch nearby places" });
    }
};

export const oldlocation = async (req, res) => {
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: {
        lat,
        lon: lon,             // 🚨 must be lon
        format: "json",
        addressdetails: 1
      },
      headers: {
        "User-Agent": "MyApp/1.0 (email@example.com)" // Required
      }
    });

    const d = response.data;
    const a = d.address || {};

    return res.json({
      place_id: d.place_id || null,
      lat: d.lat || "",
      lon: d.lon || "",
      display_name: d.display_name || "",
      address: {
        house_number: a.house_number || "",
        road: a.road || "",
        city: a.city || a.town || a.village || "",
        state: a.state || "",
        postcode: a.postcode || "",
        country: a.country || "",
        country_code: a.country_code || ""
      }
    });

  } catch (err) {
    console.error("Nominatim error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to fetch address" });
  }
};

export const location = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "Request body lat, lng is missing" });
  }
  const { lat, lng } = req.body;
  console.log("req.body", req.body)
  if (lat === undefined || lng === undefined) {
    return errorResponse(res, "Latitude and longitude are required", 400);
  }

  try {
  const nominatimRes = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    { headers: { "User-Agent": "chat-app" } }
  );
  const nominatimData = await nominatimRes.json();
  const tzRes = await fetch(
    `http://api.geonames.org/timezoneJSON?lat=${lat}&lng=${lng}&username=demo`
  );
  const tzData = await tzRes.json();
  const overpassRes = await fetch(
    `https://overpass-api.de/api/interpreter?data=[out:json];(node(around:1000,${lat},${lng})["tourism"];);out;`
  );
  const overpassData = await overpassRes.json();
  const landmarks = overpassData.elements
    .map((el) => el.tags && el.tags.name)
    .filter(Boolean)
    .slice(0, 5);

   const location = {
      lat,
      lng,
      city:
        nominatimData.address.city ||
        nominatimData.address.town ||
        nominatimData.address.village,
      district: nominatimData.address.county || null,
      state: nominatimData.address.state,
      state_code: nominatimData.address.state_code || null,
      country: nominatimData.address.country,
      country_code: nominatimData.address.country_code?.toUpperCase(),
      postcode: nominatimData.address.postcode,
      address: nominatimData.display_name,
      timezone: tzData.timezoneId || null,
      continent: "Asia", // static, can map later
      location_type: "urban",
      nearby_landmarks: landmarks,
      coordinates_format: toDMS(lat, lng),
    }

    return successResponse(res, "User Location in successfully", {...location});
  } catch (err) {
    console.error("Login error:", err.message);
    return errorResponse(res, "Error logging in user", 500);
  }
};


// Convert decimal to DMS
function toDMS(lat, lng) {
  const toDegMinSec = (coord, isLat) => {
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    const direction = coord >= 0 ? (isLat ? "N" : "E") : isLat ? "S" : "W";
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };
  return {
    decimal: `${lat}, ${lng}`,
    dms: `${toDegMinSec(lat, true)} ${toDegMinSec(lng, false)}`,
  };
}