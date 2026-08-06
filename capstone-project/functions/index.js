const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const KOBO_TOKEN = defineSecret("KOBO_TOKEN");
const KOBO_FORM_ID = "a97Fh5NxbpGbDkHENH3qfG"; 

admin.initializeApp();

if (!process.env.BREVO_LOGIN || !process.env.BREVO_SMTPKEY || !process.env.BREVO_FROM_EMAIL) {
    console.warn(
        "BREVO_LOGIN / BREVO_SMTPKEY not set. Create functions/.env " +
        "(see .env.example) or emails will fail to send."
    );
}

// Brevo SMTP transport
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
        user: process.env.BREVO_LOGIN,
        pass: process.env.BREVO_SMTPKEY,
    },
});

exports.checkLowStock = onDocumentUpdated(
    { document: "rhu/{rhuId}", region: "asia-southeast1" },
    async (event) => {
        console.log("Function triggered");

        const before = event.data.before.data();
        const after = event.data.after.data();
        console.log("before.stock:", before.stock, "after.stock:", after.stock);

        if (before.stock === after.stock) return null;

        const settingsSnap = await admin.firestore()
            .doc("lowStock/lowStockLimit")
            .get();
        const threshold = settingsSnap.exists ? settingsSnap.data().lowStockLimit : 0;
        console.log("threshold:", threshold);

        const isNowLow = after.stock <= threshold;
        const wasAlreadyNotified = after.lowStockNotified === true;
        console.log("isNowLow:", isNowLow, "wasAlreadyNotified:", wasAlreadyNotified);

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
                    from: `"PlanWise System" <${process.env.BREVO_FROM_EMAIL}>`,
                    to: allEmails.join(","),
                    subject: `Low Stock Alert: ${after.name}`,
                    text: `${after.name} has reached low stock: ${after.stock} units remaining.`,
                };

                try {
                    await transporter.sendMail(mailOptions);
                    console.log(`Low stock email sent for ${after.name} to`, allEmails);
                } catch (err) {
                    console.error("Failed to send email:", err);
                }
            } else {
                console.log("No recipient emails found in users collection.");
            }

            return event.data.after.ref.update({ lowStockNotified: true });
        }

        if (!isNowLow && wasAlreadyNotified) {
            return event.data.after.ref.update({ lowStockNotified: false });
        }

        return null;
    }
);

//========================================
exports.koboSync = onRequest(
  { secrets: [KOBO_TOKEN], region: "asia-southeast1" }, 
  (req, res) => {
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

const FORM_2_ID = "aW7kYXty3e9JZ9on94eZYk";

exports.koboSyncPrivate = onRequest(
  { secrets: [KOBO_TOKEN], region: "asia-southeast1" },
  (req, res) => {
    cors(req, res, async () => {
      try {
        const response = await axios.get(
          `https://kf.kobotoolbox.org/api/v2/assets/${FORM_2_ID}/data/`,
          { headers: { Authorization: `Token ${KOBO_TOKEN.value()}`, Accept: "application/json" } }
        );

        const normalized = response.data.results.map((submission) => {
          const clean = {};
          Object.entries(submission).forEach(([key, value]) => {
            const field = key.includes("/") ? key.split("/").pop() : key;
            clean[field] = value;
          });
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