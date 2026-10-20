const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

// Initialize Firebase Admin isang beses lamang
if (!admin.apps.length) {
  admin.initializeApp();
}

const KOBO_TOKEN = defineSecret("KOBO_TOKEN");
const GOOGLE_MAPS_KEY = defineSecret("GOOGLE_MAPS_KEY"); // Geocoding API
const GOOGLE_STATIC_KEY = defineSecret("GOOGLE_STATIC_KEY"); // Maps Static API (the exported barangay map)
const KOBO_FORM_ID = "a97Fh5NxbpGbDkHENH3qfG";
const FORM_2_ID = "aW7kYXty3e9JZ9on94eZYk";
const NOMINATIM_MIN_INTERVAL_MS = 1100;
let lastNominatimRequestAt = 0;
let nominatimRequestQueue = Promise.resolve();

function queueNominatimRequest(url) {
  const queuedRequest = nominatimRequestQueue.then(async () => {
    const waitMs = NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastNominatimRequestAt);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    lastNominatimRequestAt = Date.now();
    return require("axios").get(url, {
      headers: {
        "User-Agent": "PlanWise/1.0",
        Accept: "application/json",
      },
      timeout: 10000,
    });
  });

  nominatimRequestQueue = queuedRequest.catch(() => {});
  return queuedRequest;
}

// Lazy helper para sa email transporter
function getTransporter() {
  const nodemailer = require("nodemailer");
  if (!process.env.BREVO_LOGIN || !process.env.BREVO_SMTPKEY) {
    throw new Error("BREVO credentials not found in environment variables.");
  }
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.BREVO_LOGIN,
      pass: process.env.BREVO_SMTPKEY,
    },
  });
}

const STOCK_FIELD = "stock";

// Rejects HTTP requests that don't carry a valid Firebase sign-in token
async function requireSignedIn(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "You must be signed in." });
    return false;
  }
  try {
    await admin.auth().verifyIdToken(token);
    return true;
  } catch (error) {
    res.status(401).json({ error: "Your session is invalid or has expired." });
    return false;
  }
}


async function getAllEmails() {
  const usersSnap = await admin.firestore().collection("users").get();
  return usersSnap.docs
    .map((doc) => {
      const data = doc.data();
      if (data && (data.email || data.Email)) return data.email || data.Email;
      if (doc.id && doc.id.includes("@")) return doc.id;
      return null;
    })
    .filter(Boolean);
}

async function alertIfLow(rhuRef, rhuId, rhu, methodIds, limitsByMethod) {
  const stock = rhu.stockByMethod || {};
  const notified = rhu.lowStockNotifiedByMethod || {};
  const rhuName = rhu.name || rhuId;
  const updates = {};
  let allEmails = null;

  for (const methodId of methodIds) {
    const limit = limitsByMethod[methodId];
    if (limit === undefined || limit === null || limit === "") continue;
    const qty = stock[methodId];
    if (qty === undefined) continue;

    const isLow = Number(qty) <= Number(limit);
    const alreadyNotified = notified[methodId] === true;
    console.log(`${rhuId}/${methodId}: qty=${qty} limit=${limit} isLow=${isLow} notified=${alreadyNotified}`);

    if (isLow && !alreadyNotified) {
      if (allEmails === null) allEmails = await getAllEmails();
      if (allEmails.length === 0) {
        console.log("No recipient emails found in users collection.");
        continue;
      }

      const { subject, text } = lowStockEmail({ methodId, rhuName, qty, limit });

      const transporter = getTransporter();
      const results = await Promise.allSettled(
        allEmails.map((email) =>
          transporter.sendMail({
            from: `"PlanWise System" <${process.env.BREVO_FROM_EMAIL}>`,
            to: email,
            subject,
            text,
          })
        )
      );

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`Failed for ${allEmails[i]} (${rhuId}/${methodId}):`, r.reason);
        } else {
          console.log(`Sent to ${allEmails[i]} (${rhuId}/${methodId}):`, r.value.accepted);
        }
      });

      const anySent = results.some(
        (r) => r.status === "fulfilled" && r.value.accepted && r.value.accepted.length > 0
      );
      if (anySent) updates[`lowStockNotifiedByMethod.${methodId}`] = true;
    } else if (!isLow && alreadyNotified) {
      updates[`lowStockNotifiedByMethod.${methodId}`] = false;
    }
  }

  if (Object.keys(updates).length > 0) await rhuRef.update(updates);
}
 
const METHOD_LABELS = {
  condom: "Condom",
  iud: "IUD",
  pills: "Pills",
  injectable: "Injectable",
  vasectomy: "Vasectomy",
  tubal_ligation: "Tubal Ligation",
  implant: "Implant",
  cmm_billings: "CMM/Billings",
  bbt: "Basal Body Temperature (BBT)",
  stm: "Sympto-Thermal Method (STM)",
  sdm: "Standard Days Method (SDM)",
  lam: "Lactational Amenorrhea Method (LAM)",
};

// Base unit stock is counted in, same as STOCK_CONFIG in AllocateStockModal.jsx
const BASE_UNITS = {
  condom: "pcs",
  pills: "cycle",
  injectable: "vial",
  iud: "pcs",
  implant: "set",
  sdm: "set",
  bbt: "pcs",
};

const unitOf = (methodId) => BASE_UNITS[methodId] || "units";

// TEMPLATE 2: LOW STOCK ALERT
function lowStockEmail({ methodId, rhuName, qty, limit }) {
  const item = `${METHOD_LABELS[methodId] || methodId} - ${rhuName}`;
  const unit = unitOf(methodId);
  return {
    subject: `LOW STOCK ALERT: ${item} Running Low`,
    text: [
      "Dear Inventory Team,",
      "",
      "This is a notification to inform you that the inventory level for one of our key items has dropped below the safety threshold.",
      "",
      `* Product Name: ${item}`,
      `* Current Stock Level: ${Number(qty).toLocaleString("en-PH")} ${unit} remaining`,
      `* Reorder Threshold: ${Number(limit).toLocaleString("en-PH")} ${unit}`,
      "",
      "To ensure uninterrupted public service delivery and avoid depletion of essential supplies, please initiate the procurement or requisition process immediately.",
      "",
      "Best regards,",
      "PlanWise",
    ].join("\n"),
  };
}

// TEMPLATE 1: EXPIRATION ALERT
function expirationEmail({ methodId, rhuName, lotNo, qty, expiryDate, daysLeft }) {
  const label = METHOD_LABELS[methodId] || methodId;
  const date = expiryDate.toLocaleDateString("en-PH", { timeZone: MANILA_TZ, year: "numeric", month: "long", day: "numeric" });
  return {
    subject: `EXPIRATION ALERT: ${label} - Batch #${lotNo} Nearing Expiry`,
    text: [
      "Dear CPD Personnel and Health Officer,",
      "",
      "This is to alert you that a specific batch of inventory items under our custody is approaching its expiration date and requires immediate utilization or disposition in compliance with LGU audit and inventory standards.",
      "",
      `* Item Description: ${label} - ${rhuName}`,
      `* Batch / Lot Number: ${lotNo}`,
      `* Current Quantity: ${Number(qty).toLocaleString("en-PH")} ${unitOf(methodId)}`,
      `* Expiration Date: ${date}`,
      `* Days Remaining: ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`,
      "",
      "Recommended Next Steps:",
      "To prevent wastage of public resources and ensure proper compliance, please consider the following actions:",
      "",
      "1. Prioritize Distribution (FIFO): Issue or distribute this specific batch first to ongoing LGU programs or recipient barangays.",
      "2. Reallocation: If our office cannot consume these units before expiry, coordinate with other municipal departments or health centers that may need them immediately.",
      "3. Inspection / Disposal Protocol: If the items expire before use, coordinate with the General Services Office (GSO) and the Commission on Audit (COA) representative for proper condemnation and write-off procedures.",
      "",
      "Please advise on the action plan for this batch.",
      "",
      "Best regards,",
      "PlanWise",
    ].join("\n"),
  };
}

const MANILA_TZ = "Asia/Manila";

// Whole days from today to `date`, both counted as calendar days in Manila time
function daysUntil(date) {
  const day = (d) => {
    const [y, m, dd] = d.toLocaleDateString("en-CA", { timeZone: MANILA_TZ }).split("-").map(Number);
    return Date.UTC(y, m - 1, dd);
  };
  return Math.round((day(date) - day(new Date())) / 86400000);
}

// `date` plus `months` calendar months, at midnight Manila time (day clamped to the month's end)
function addMonths(date, months) {
  const [y, m, d] = date.toLocaleDateString("en-CA", { timeZone: MANILA_TZ }).split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return new Date(target.getTime() - 8 * 3600000); // Manila is UTC+8
}

// Sends one email to every user; true if at least one was accepted
async function sendToAll(allEmails, { subject, text }, logTag) {
  const transporter = getTransporter();
  const results = await Promise.allSettled(
    allEmails.map((email) =>
      transporter.sendMail({
        from: `"PlanWise System" <${process.env.BREVO_FROM_EMAIL}>`,
        to: email,
        subject,
        text,
      })
    )
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`Failed for ${allEmails[i]} (${logTag}):`, r.reason);
    } else {
      console.log(`Sent to ${allEmails[i]} (${logTag}):`, r.value.accepted);
    }
  });

  return results.some(
    (r) => r.status === "fulfilled" && r.value.accepted && r.value.accepted.length > 0
  );
}

// Daily check of every RHU's batches. Each batch expires `shelfLifeMonthsByMethod[method]` months
// after its own Date Arrived (arrivedAt), and is emailed once, `expiryNoticeMonthsByMethod[method]`
// (default 1) months before that, while it still has stock. Both settings live in lowStock/lowStockLimit.
exports.checkExpiringStock = onSchedule(
  { schedule: "every day 08:00", timeZone: MANILA_TZ, region: "asia-southeast1" },
  async () => {
    const settingsSnap = await admin.firestore().doc("lowStock/lowStockLimit").get();
    const { enabled = true, shelfLifeMonthsByMethod = {}, expiryNoticeMonthsByMethod = {} } = settingsSnap.exists ? settingsSnap.data() : {};
    if (!enabled) {
      console.log("Alerts are turned off in settings.");
      return;
    }

    const rhuSnap = await admin.firestore().collection("rhu").get();
    const due = [];
    for (const rhuDoc of rhuSnap.docs) {
      const rhuName = rhuDoc.data().name || rhuDoc.id;
      const batchSnap = await rhuDoc.ref.collection("batches").get();
      batchSnap.docs.forEach((b) => {
        const batch = b.data();
        const shelfLife = Number(shelfLifeMonthsByMethod[batch.method]);
        const arrived = batch.arrivedAt || batch.receivedAt; // batches saved before Date Arrived only have receivedAt
        if (!(shelfLife > 0) || !arrived || !(batch.qtyRemaining > 0) || batch.expiryNotified === true) return;
        const expiryDate = addMonths(arrived.toDate(), shelfLife);
        const daysLeft = daysUntil(expiryDate);
        const notice = expiryNoticeMonthsByMethod[batch.method];
        const noticeMonths = notice === undefined || notice === "" ? 1 : Number(notice);
        const alertFrom = addMonths(arrived.toDate(), shelfLife - noticeMonths);
        if (daysLeft < 0 || daysUntil(alertFrom) > 0) return;
        due.push({ ref: b.ref, methodId: batch.method, rhuName, lotNo: batch.lotNo, qty: batch.qtyRemaining, expiryDate, daysLeft });
      });
    }
    console.log("Batches nearing expiry:", due.length);
    if (due.length === 0) return;

    const allEmails = await getAllEmails();
    if (allEmails.length === 0) {
      console.log("No recipient emails found in users collection.");
      return;
    }

    for (const d of due) {
      const anySent = await sendToAll(allEmails, expirationEmail(d), `${d.rhuName}/${d.methodId}/Lot ${d.lotNo}`);
      if (anySent) await d.ref.update({ expiryNotified: true });
    }
  }
);


exports.checkLowStock = onDocumentUpdated(
  { document: "rhu/{rhuId}", region: "asia-southeast1" },
  async (event) => {
    const { rhuId } = event.params;
    const before = event.data.before.data();
    const after = event.data.after.data();

    const beforeStock = before.stockByMethod || {};
    const afterStock = after.stockByMethod || {};
    const rhuName = after.name || rhuId;
    console.log(`Function triggered for ${rhuId}`);

    // Settings saved by the LowStockSettings page
    const settingsSnap = await admin.firestore().doc("lowStock/lowStockLimit").get();
    if (!settingsSnap.exists) return null;

    const { enabled = true, limitsByMethod = {} } = settingsSnap.data();
    if (!enabled) {
      console.log("Alerts are turned off in settings.");
      return null;
    }

    const notified = after.lowStockNotifiedByMethod || {};
    const newlyLow = [];
    const updates = {};

    for (const [methodId, qty] of Object.entries(afterStock)) {
      if (beforeStock[methodId] === qty) continue; // this method didn't change
      console.log(`${rhuId}/${methodId}: ${beforeStock[methodId]} -> ${qty}`);

      const limit = limitsByMethod[methodId];
      if (limit === undefined || limit === null || limit === "") {
        console.log(`No limit set for method "${methodId}"`);
        continue;
      }

      const isNowLow = Number(qty) <= Number(limit);
      const wasAlreadyNotified = notified[methodId] === true;
      console.log(`limit: ${limit} isNowLow: ${isNowLow} wasAlreadyNotified: ${wasAlreadyNotified}`);

      if (isNowLow && !wasAlreadyNotified) {
        newlyLow.push({ methodId, qty, limit });
      } else if (!isNowLow && wasAlreadyNotified) {
        updates[`lowStockNotifiedByMethod.${methodId}`] = false; // restocked
      }
    }

    if (newlyLow.length > 0) {
      const usersSnap = await admin.firestore().collection("users").get();
      const allEmails = usersSnap.docs
        .map((doc) => {
          const data = doc.data();
          if (data && (data.email || data.Email)) return data.email || data.Email;
          if (doc.id && doc.id.includes("@")) return doc.id;
          return null;
        })
        .filter(Boolean);
      console.log("Recipients found:", allEmails.length);

      if (allEmails.length > 0) {
        for (const m of newlyLow) {
          // Send to each user's own email; flag only if at least one was accepted
          const email = lowStockEmail({ methodId: m.methodId, rhuName, qty: m.qty, limit: m.limit });
          const anySent = await sendToAll(allEmails, email, `${rhuId}/${m.methodId}`);
          if (anySent) {
            updates[`lowStockNotifiedByMethod.${m.methodId}`] = true;
          }
        }
      } else {
        console.log("No recipient emails found in users collection.");
      }
    }

    if (Object.keys(updates).length > 0) {
      return event.data.after.ref.update(updates);
    }
    return null;
  }
);

// ========================================
// KOBO FORM 1 SYNC
// ========================================
exports.koboSync = onRequest(
  { secrets: [KOBO_TOKEN], region: "asia-southeast1" },
  (req, res) => {
    const cors = require("cors")({ origin: true });
    const axios = require("axios");

    cors(req, res, async () => {
      if (!(await requireSignedIn(req, res))) return;

      try {
        const response = await axios.get(
          `https://kf.kobotoolbox.org/api/v2/assets/${KOBO_FORM_ID}/data/`,
          {
            headers: {
              Authorization: `Token ${KOBO_TOKEN.value()}`,
              Accept: "application/json",
            },
          }
        );

        const normalized = response.data.results.map((submission) => {
          const clean = {};
          Object.entries(submission).forEach(([key, value]) => {
            const field = key.includes("/") ? key.split("/").pop() : key;
            clean[field] = value;
          });
          clean._attachments = submission._attachments || [];
          return clean;
        });

        res.json({ count: normalized.length, results: normalized });
      } catch (error) {
        console.error("Kobo fetch error:", error.message);
        res.status(500).json({ error: error.message });
      }
    });
  }
);

// ========================================
// KOBO FORM 2 (PRIVATE) SYNC
// ========================================
exports.koboSyncPrivate = onRequest(
  { secrets: [KOBO_TOKEN], region: "asia-southeast1" },
  (req, res) => {
    const cors = require("cors")({ origin: true });
    const axios = require("axios");

    cors(req, res, async () => {
      if (!(await requireSignedIn(req, res))) return;

      try {
        const response = await axios.get(
          `https://kf.kobotoolbox.org/api/v2/assets/${FORM_2_ID}/data/`,
          {
            headers: {
              Authorization: `Token ${KOBO_TOKEN.value()}`,
              Accept: "application/json",
            },
          }
        );

        const normalized = response.data.results.map((submission) => {
          const clean = {};
          Object.entries(submission).forEach(([key, value]) => {
            const field = key.includes("/") ? key.split("/").pop() : key;
            clean[field] = value;
          });
          clean._attachments = submission._attachments || [];
          return clean;
        });

        res.json({ count: normalized.length, results: normalized });
      } catch (error) {
        console.error("Kobo Form 2 fetch error:", error.message);
        res.status(500).json({ error: error.message });
      }
    });
  }
);

// ========================================
// REVERSE GEOCODE KOBO COORDINATES
// ========================================
exports.reverseGeocodeBatch = onCall(
  {
    region: "asia-southeast1",
    invoker: "public",
    timeoutSeconds: 120,
    maxInstances: 1,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to resolve addresses.");
    }

    const locations = request.data?.locations;
    if (!Array.isArray(locations) || locations.length > 25) {
      throw new HttpsError("invalid-argument", "Provide up to 25 coordinate pairs per request.");
    }

    const normalizedLocations = locations.map((location) => {
      const lat = Number(location?.lat);
      const lon = Number(location?.lon);
      if (
        location?.lat == null ||
        location?.lon == null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 || lat > 90 ||
        lon < -180 || lon > 180
      ) {
        throw new HttpsError("invalid-argument", "One or more coordinates are invalid.");
      }

      return {
        lat,
        lon,
        key: `${lat.toFixed(5)}_${lon.toFixed(5)}`,
        fallback: `${lat}, ${lon}`,
      };
    });

    const cache = admin.firestore().collection("reverseGeocodeCache");
    const addressByKey = new Map();

    for (const location of normalizedLocations) {
      if (addressByKey.has(location.key)) continue;

      try {
        const cacheSnap = await cache.doc(location.key).get();
        if (cacheSnap.exists && cacheSnap.data().address) {
          addressByKey.set(location.key, cacheSnap.data().address);
          continue;
        }

        const params = new URLSearchParams({
          format: "jsonv2",
          lat: String(location.lat),
          lon: String(location.lon),
          zoom: "18",
          addressdetails: "1",
        });
        const response = await queueNominatimRequest(
          `https://nominatim.openstreetmap.org/reverse?${params}`
        );
        const address = response.data?.display_name;

        if (address) {
          addressByKey.set(location.key, address);
          await cache.doc(location.key).set({
            address,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          addressByKey.set(location.key, location.fallback);
        }
      } catch (error) {
        console.warn(
          `Reverse geocoding failed for ${location.key}:`,
          error.response?.status || error.message
        );
        addressByKey.set(location.key, location.fallback);
      }
    }

    return {
      addresses: normalizedLocations.map((location) => addressByKey.get(location.key)),
    };
  }
);

// ========================================
// GEOCODE KOBO ADDRESSES (address -> latitude and longitude)
// ========================================
// Search area: the bounding box of Malolos, with a little margin. Results outside it are never returned,
// and the app checks every answer against the barangay boundaries again.
const MALOLOS_VIEWBOX = "120.77,14.90,120.88,14.745"; // left,top,right,bottom

function geocodePrecision(place) {
  const address = place.address || {};
  // a numbered house, a building, or a named place such as a school or a store is one specific spot
  const specificPlace = ["amenity", "shop", "building", "office", "tourism", "leisure", "craft", "healthcare"];
  if (address.house_number || ["house", "building"].includes(place.addresstype) || specificPlace.includes(place.category)) {
    return "house";
  }
  if (place.category === "highway" || ["road", "street"].includes(place.addresstype)) return "street";
  return "area";
}

// "left,top,right,bottom" inside the Malolos search area, or "" when it is not a usable box
function cleanViewbox(viewbox) {
  if (typeof viewbox !== "string") return "";
  const parts = viewbox.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return "";
  const [left, top, right, bottom] = parts;
  if (left < 120.77 || right > 120.88 || top > 14.90 || bottom < 14.745 || left >= right || bottom >= top) return "";
  return parts.map((n) => n.toFixed(5)).join(",");
}

// Up to five matches for one search text inside one search box
async function searchPlaces(query, viewbox) {
  const crypto = require("crypto");
  const key = crypto.createHash("sha1").update(`v2|${viewbox}|${query.toLowerCase().trim()}`).digest("hex");
  const cache = admin.firestore().collection("geocodeCache").doc(key);

  const cached = await cache.get();
  if (cached.exists && cached.data().found) return cached.data();

  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: "5",
    addressdetails: "1",
    countrycodes: "ph",
    viewbox,
    bounded: "1",
  });
  const response = await queueNominatimRequest(`https://nominatim.openstreetmap.org/search?${params}`);
  const places = Array.isArray(response.data) ? response.data : [];
  if (places.length === 0) return null;

  const candidates = places.map((place) => ({
    lat: Number(place.lat),
    lon: Number(place.lon),
    displayName: place.display_name || "",
    precision: geocodePrecision(place),
  }));
  const result = { found: true, ...candidates[0], candidates, queryUsed: query };
  await cache.set({ ...result, updated_at: admin.firestore.FieldValue.serverTimestamp() });
  return result;
}

// Google Geocoding API. Google only lets latitude and longitude be cached for 30 days, so cached answers expire after that.
const GEOCODE_CACHE_MS = 30 * 24 * 60 * 60 * 1000;

function googlePrecision(result) {
  const types = result.types || [];
  const kind = result.geometry?.location_type;
  if (kind === "ROOFTOP") return "house";
  if (types.some((t) => ["street_address", "premise", "subpremise", "establishment", "point_of_interest"].includes(t))) return "house";
  if (kind === "RANGE_INTERPOLATED" || types.includes("route")) return "street";
  return "area";
}

async function searchGoogle(query, viewbox, key) {
  const crypto = require("crypto");
  const cacheKey = crypto.createHash("sha1").update(`google-v1|${viewbox}|${query.toLowerCase().trim()}`).digest("hex");
  const cache = admin.firestore().collection("geocodeCache").doc(cacheKey);

  const cached = await cache.get();
  if (cached.exists && cached.data().found && Number(cached.data().expires_at) > Date.now()) return cached.data();

  // the app sends "left,top,right,bottom"; Google wants "south,west|north,east", and only uses it as a hint
  const [left, top, right, bottom] = viewbox.split(",");
  const params = new URLSearchParams({
    address: query,
    components: "country:PH|administrative_area:Bulacan",
    bounds: `${bottom},${left}|${top},${right}`,
    region: "ph",
    language: "en",
    key,
  });
  const response = await require("axios").get(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    { timeout: 10000 }
  );

  const status = response.data?.status;
  if (status === "ZERO_RESULTS") return null;
  if (status !== "OK") {
    // a key, billing, or quota problem: report it as the service not answering
    console.warn("Google geocoding status:", status, response.data?.error_message || "");
    throw new Error(`Google geocoding returned ${status}`);
  }

  const candidates = (response.data.results || []).slice(0, 5).map((result) => ({
    lat: Number(result.geometry?.location?.lat),
    lon: Number(result.geometry?.location?.lng),
    precision: googlePrecision(result),
  })).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon));
  if (candidates.length === 0) return null;

  const result = { found: true, ...candidates[0], candidates, queryUsed: query, provider: "google" };
  await cache.set({ ...result, expires_at: Date.now() + GEOCODE_CACHE_MS, updated_at: admin.firestore.FieldValue.serverTimestamp() });
  return result;
}

exports.geocodeAddressBatch = onCall(
  {
    secrets: [GOOGLE_MAPS_KEY],
    region: "asia-southeast1",
    invoker: "public",
    timeoutSeconds: 180,
    maxInstances: 1,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to look up addresses.");
    }

    const items = request.data?.items;
    if (!Array.isArray(items) || items.length > 10) {
      throw new HttpsError("invalid-argument", "Provide up to 10 addresses per request.");
    }

    const results = [];
    for (const item of items) {
      const queries = [item?.query, item?.fallbackQuery]
        .filter((q) => typeof q === "string" && q.trim() && q.length <= 300);
      if (queries.length === 0) {
        throw new HttpsError("invalid-argument", "Each item needs an address to look up.");
      }

      // The barangay's own area is searched first, then the whole of Malolos
      const barangayBox = cleanViewbox(item?.viewbox);
      const boxes = barangayBox ? [barangayBox, MALOLOS_VIEWBOX] : [MALOLOS_VIEWBOX];

      // Google is asked first; OpenStreetMap is the backup, and also knows some landmarks Google does not
      const googleKey = GOOGLE_MAPS_KEY.value();
      const providers = [
        ...(googleKey ? [(query, box) => searchGoogle(query, box, googleKey)] : []),
        (query, box) => searchPlaces(query, box),
      ];

      let result = null;
      let failures = 0;
      search: for (const search of providers) {
        for (const box of boxes) {
          for (const query of queries) {
            try {
              result = await search(query, box);
            } catch (error) {
              console.warn("Address lookup failed:", error.response?.status || error.message);
              failures += 1;
              continue search; // this service is not answering, so move on to the next one
            }
            if (result) break search;
          }
        }
      }

      // every service failed, so say so instead of reporting "not found"
      if (!result && failures === providers.length) {
        throw new HttpsError("unavailable", "The address lookup service is not responding.");
      }
      results.push(result || { found: false });
    }

    return { results };
  }
);

// ========================================
// STATIC MAP IMAGE (barangay map export)
// ========================================
// Google's map cannot be photographed from the page, so the export asks Google for a picture of the same view.
function encodePolyline(points) {
  let lastLat = 0;
  let lastLng = 0;
  let out = "";
  const push = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
  };
  for (const [lat, lng] of points) {
    const la = Math.round(lat * 1e5);
    const lo = Math.round(lng * 1e5);
    push(la - lastLat);
    push(lo - lastLng);
    lastLat = la;
    lastLng = lo;
  }
  return out;
}

exports.staticMapImage = onCall(
  {
    secrets: [GOOGLE_STATIC_KEY],
    region: "asia-southeast1",
    invoker: "public",
    timeoutSeconds: 60,
    maxInstances: 2,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to export a map.");
    }

    const { center, zoom, width, height, boundary, markers } = request.data || {};
    const inMalolos = (lat, lng) => lat > 14.70 && lat < 14.95 && lng > 120.73 && lng < 120.93;
    const lat = Number(center?.lat);
    const lng = Number(center?.lng);
    const z = Math.round(Number(zoom));
    const w = Math.round(Number(width));
    const h = Math.round(Number(height));
    if (!inMalolos(lat, lng) || !(z >= 10 && z <= 20) || !(w >= 100 && w <= 640) || !(h >= 100 && h <= 640)) {
      throw new HttpsError("invalid-argument", "The map view is not valid.");
    }

    const parts = [
      `center=${lat.toFixed(6)},${lng.toFixed(6)}`,
      `zoom=${z}`,
      `size=${w}x${h}`,
      "scale=2",
      "maptype=roadmap",
      // the map's own place and transit markers are kept but washed out, so only the client markers stand out
      `style=${encodeURIComponent("feature:poi|element:labels|saturation:-100|lightness:60")}`,
      `style=${encodeURIComponent("feature:transit|element:labels|saturation:-100|lightness:60")}`,
    ];

    // The barangay is drawn in full color. Everything around it is covered by a white veil: one big square joined to
    // the barangay's outline by a zero-width bridge, which leaves the barangay itself uncovered.
    if (Array.isArray(boundary) && boundary.length >= 3) {
      const points = boundary.slice(0, 600).map(([a, b]) => [Number(a), Number(b)]).filter(([a, b]) => inMalolos(a, b));
      if (points.length >= 3) {
        const around = 0.4;
        const square = [
          [14.844782 - around, 120.812683 - around],
          [14.844782 - around, 120.812683 + around],
          [14.844782 + around, 120.812683 + around],
          [14.844782 + around, 120.812683 - around],
        ];
        const area = (ring) => ring.reduce((sum, p, i) => {
          const q = ring[(i + 1) % ring.length];
          return sum + (p[1] * q[0] - q[1] * p[0]);
        }, 0);
        const ring = area(points) * area(square) > 0 ? [...points].reverse() : points;
        const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring : [...ring, ring[0]];
        const veil = [...square, square[0], closed[0], ...closed.slice(1), square[0]];

        parts.push(`path=${encodeURIComponent(`fillcolor:0xffffff66|weight:0|enc:${encodePolyline(veil)}`)}`);
        parts.push(`path=${encodeURIComponent(`color:0x0f172aff|weight:3|enc:${encodePolyline(closed)}`)}`);
      }
    }

    // one group of small dots per color
    const byColor = new Map();
    for (const m of Array.isArray(markers) ? markers.slice(0, 400) : []) {
      const a = Number(m?.lat);
      const b = Number(m?.lng);
      const color = /^[0-9a-fA-F]{6}$/.test(String(m?.color)) ? String(m.color) : "64748B";
      if (!inMalolos(a, b)) continue;
      if (!byColor.has(color)) byColor.set(color, []);
      byColor.get(color).push(`${a.toFixed(5)},${b.toFixed(5)}`);
    }
    for (const [color, spots] of byColor) {
      parts.push(`markers=${encodeURIComponent(`size:mid|color:0x${color}|${spots.join("|")}`)}`);
    }

    const url = `https://maps.googleapis.com/maps/api/staticmap?${parts.join("&")}&key=${GOOGLE_STATIC_KEY.value()}`;
    if (url.length > 16000) {
      throw new HttpsError("invalid-argument", "This barangay has too much detail for one map image.");
    }

    try {
      const response = await require("axios").get(url, { responseType: "arraybuffer", timeout: 20000 });
      return { image: `data:image/png;base64,${Buffer.from(response.data).toString("base64")}` };
    } catch (error) {
      console.warn("Static map failed:", error.response?.status || error.message);
      throw new HttpsError("unavailable", "The map image could not be created.");
    }
  }
);

// ========================================
// ✍️ SECURE CALLABLE FUNCTION: SYNC KOBO SIGNATURE
// ========================================
exports.syncKoboSignature = onCall(
  { secrets: [KOBO_TOKEN], region: "asia-southeast1", invoker: "public" },
  async (request) => {
    const { submissionId, downloadUrl, filename, collectionName = "clients_public" } = request.data || {};

    const axios = require("axios");
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    try {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Access denied. You must be authenticated to sync signatures."
        );
      }

      if (!submissionId || !downloadUrl) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: submissionId or downloadUrl."
        );
      }

      const koboMedia = await axios.get(downloadUrl, {
        headers: {
          Authorization: `Token ${KOBO_TOKEN.value()}`,
        },
        responseType: "arraybuffer",
        timeout: 25000,
      });

      const buffer = Buffer.from(koboMedia.data);
      const destination = `signatures/${collectionName}/${submissionId}_${filename || "signature.png"}`;
      const file = bucket.file(destination);

      await file.save(buffer, {
        metadata: {
          contentType: koboMedia.headers["content-type"] || "image/png",
          metadata: {
            kobo_id: String(submissionId),
            synced_by: request.auth.uid,
          },
        },
      });

      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

      const collRef = db.collection(collectionName);
      let querySnap = await collRef.where("kobo_id", "==", Number(submissionId)).get();
      if (querySnap.empty) {
        querySnap = await collRef.where("kobo_id", "==", String(submissionId)).get();
      }

      const updateData = {
        signature_url: publicUrl,
        signature_status: "synced",
        signature_synced_at: admin.firestore.FieldValue.serverTimestamp(),
        signature_synced_by: request.auth.uid,
      };

      if (!querySnap.empty) {
        const updatePromises = querySnap.docs.map((docSnap) =>
          docSnap.ref.update(updateData)
        );
        await Promise.all(updatePromises);
      } else {
        await collRef.doc(String(submissionId)).set(updateData, { merge: true });
      }

      return { success: true, signature_url: publicUrl };
    } catch (error) {
      console.error(`Signature sync failed for ID ${submissionId}:`, error.message);

      try {
        if (submissionId) {
          const collRef = db.collection(collectionName);
          let querySnap = await collRef.where("kobo_id", "==", Number(submissionId)).get();
          if (querySnap.empty) {
            querySnap = await collRef.where("kobo_id", "==", String(submissionId)).get();
          }

          if (!querySnap.empty) {
            const failPromises = querySnap.docs.map((docSnap) =>
              docSnap.ref.update({ signature_status: "failed" })
            );
            await Promise.all(failPromises);
          }
        }
      } catch (statusError) {
        console.error(`Could not update signature status for ID ${submissionId}:`, statusError.message);
      }

      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message || "Failed to download/upload signature.");
    }
  }
);

// ========================================
// GET CLIENT SIGNATURE IMAGES FOR PDF EXPORT
// ========================================
exports.getClientSignatureImages = onCall(
  {
    region: "asia-southeast1",
    invoker: "public",
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to export client signatures.");
    }

    const documentIds = request.data?.documentIds;
    if (
      !Array.isArray(documentIds) ||
      documentIds.length > 10 ||
      documentIds.some((id) => typeof id !== "string" || id.length === 0 || id.length > 150)
    ) {
      throw new HttpsError("invalid-argument", "Provide up to 10 valid client document IDs.");
    }

    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const images = [];
    let totalBytes = 0;
    const maxImageBytes = 512 * 1024;
    const maxResponseBytes = 4 * 1024 * 1024;

    for (const documentId of documentIds) {
      try {
        const clientSnap = await db.collection("clients_public").doc(documentId).get();
        const signatureUrl = clientSnap.data()?.signature_url;
        if (!signatureUrl) continue;

        const parsedUrl = new URL(signatureUrl);
        const objectPrefix = `/${bucket.name}/`;
        if (
          parsedUrl.hostname !== "storage.googleapis.com" ||
          !parsedUrl.pathname.startsWith(objectPrefix)
        ) {
          continue;
        }

        const objectPath = decodeURIComponent(parsedUrl.pathname.slice(objectPrefix.length));
        if (!objectPath.startsWith("signatures/clients_public/")) continue;

        const file = bucket.file(objectPath);
        const [metadata] = await file.getMetadata();
        const contentType = metadata.contentType || "image/png";
        const imageSize = Number(metadata.size || 0);
        if (
          !contentType.startsWith("image/") ||
          imageSize > maxImageBytes ||
          totalBytes + imageSize > maxResponseBytes
        ) {
          console.warn(`Skipping signature image for client ${documentId}: unsupported or too large.`);
          continue;
        }

        const [buffer] = await file.download();
        totalBytes += buffer.length;
        images.push({
          documentId,
          contentType,
          data: buffer.toString("base64"),
        });
      } catch (error) {
        console.warn(`Could not load signature image for client ${documentId}:`, error.message);
      }
    }

    return { images };
  }
);