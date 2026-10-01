const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

// Initialize Firebase Admin isang beses lamang
if (!admin.apps.length) {
  admin.initializeApp();
}

const KOBO_TOKEN = defineSecret("KOBO_TOKEN");
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

// ========================================
// LOW STOCK ALERT TRIGGER
// ========================================
exports.checkLowStock = onDocumentUpdated(
  { document: "rhu/{rhuId}", region: "asia-southeast1" },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after || before.stock === after.stock) return null;

    const settingsSnap = await admin.firestore().doc("lowStock/lowStockLimit").get();
    const threshold = settingsSnap.exists ? settingsSnap.data().lowStockLimit : 0;

    const isNowLow = after.stock <= threshold;
    const wasAlreadyNotified = after.lowStockNotified === true;

    if (isNowLow && !wasAlreadyNotified) {
      const usersSnap = await admin.firestore().collection("users").get();
      const allEmails = usersSnap.docs
        .map((doc) => {
          const data = doc.data();
          if (data && (data.email || data.Email)) return data.email || data.Email;
          if (doc.id && doc.id.includes("@")) return doc.id;
          return null;
        })
        .filter(Boolean);

      if (allEmails.length > 0) {
        const mailOptions = {
          from: `"PlanWise System" <${process.env.BREVO_FROM_EMAIL || "no-reply@planwise.com"}>`,
          to: allEmails.join(","),
          subject: `Low Stock Alert: ${after.name}`,
          text: `${after.name} has reached low stock: ${after.stock} units remaining.`,
        };

        try {
          const transporter = getTransporter();
          await transporter.sendMail(mailOptions);
          console.log(`Low stock email sent for ${after.name} to`, allEmails);
        } catch (err) {
          console.error("Failed to send email:", err.message);
        }
      }

      return event.data.after.ref.update({ lowStockNotified: true });
    }

    if (!isNowLow && wasAlreadyNotified) {
      return event.data.after.ref.update({ lowStockNotified: false });
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