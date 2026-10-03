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

// exports.checkLowStock = onDocumentUpdated(
//     { document: "rhu/{rhuId}", region: "asia-southeast1" },
//     async (event) => {
//         console.log("Function triggered");

//         const before = event.data.before.data();
//         const after = event.data.after.data();
//         console.log("before.stock:", before.stock, "after.stock:", after.stock);

//         if (before.stock === after.stock) return null;

//         const settingsSnap = await admin.firestore()
//             .doc("lowStock/lowStockLimit")
//             .get();
//         const threshold = settingsSnap.exists ? settingsSnap.data().lowStockLimit : 0;
//         console.log("threshold:", threshold);

//         const isNowLow = after.stock <= threshold;
//         const wasAlreadyNotified = after.lowStockNotified === true;
//         console.log("isNowLow:", isNowLow, "wasAlreadyNotified:", wasAlreadyNotified);

//         if (isNowLow && !wasAlreadyNotified) {
//             const usersSnap = await admin.firestore().collection("users").get();
//             const allEmails = usersSnap.docs
//                 .map((doc) => {
//                     const data = doc.data();
//                     if (data && (data.email || data.Email)) return data.email || data.Email;
//                     if (doc.id && doc.id.includes("@")) return doc.id;
//                     return null;
//                 })
//                 .filter(Boolean);

//             if (allEmails.length > 0) {
//                 const mailOptions = {
//                     from: `"PlanWise System" <${process.env.BREVO_FROM_EMAIL}>`,
//                     to: allEmails.join(","),
//                     subject: `Low Stock Alert: ${after.name}`,
//                     text: `${after.name} has reached low stock: ${after.stock} units remaining.`,
//                 };

//                 try {
//                     await transporter.sendMail(mailOptions);
//                     console.log(`Low stock email sent for ${after.name} to`, allEmails);
//                 } catch (err) {
//                     console.error("Failed to send email:", err);
//                 }
//             } else {
//                 console.log("No recipient emails found in users collection.");
//             }

//             return event.data.after.ref.update({ lowStockNotified: true });
//         }

//         if (!isNowLow && wasAlreadyNotified) {
//             return event.data.after.ref.update({ lowStockNotified: false });
//         }

//         return null;
//     }
// );

const STOCK_FIELD = "stock";


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

      const label = METHOD_LABELS[methodId] || methodId;
      const subject = `Low Stock Alert: ${label} at ${rhuName}`;
      const text = `${rhuName} is low on ${label}.\n\nRemaining: ${qty}\nLimit: ${limit}`;

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
 
// exports.checkLowStock = onDocumentUpdated(
//   { document: "rhu/{rhuId}", region: "asia-southeast1" },
//   async (event) => {
//     const { rhuId } = event.params;
//     const before = event.data.before.data();
//     const after = event.data.after.data();
 
//     const beforeStock = before.stockByMethod || {};
//     const afterStock = after.stockByMethod || {};
//     console.log(`Function triggered for ${rhuId}`);
 
//     // Settings saved by the LowStockSettings page
//     const settingsSnap = await admin.firestore().doc("lowStock/lowStockLimit").get();
//     if (!settingsSnap.exists) return null;
 
//     const { enabled = true, limitsByMethod = {} } = settingsSnap.data();
//     if (!enabled) {
//       console.log("Alerts are turned off in settings.");
//       return null;
//     }
 
//     const notified = after.lowStockNotifiedByMethod || {};
//     const newlyLow = [];
//     const updates = {};
 
//     for (const [methodId, qty] of Object.entries(afterStock)) {
//       if (beforeStock[methodId] === qty) continue; // this method didn't change
//       console.log(`${rhuId}/${methodId}: ${beforeStock[methodId]} -> ${qty}`);
 
//       const limit = limitsByMethod[methodId];
//       if (limit === undefined || limit === null || limit === "") {
//         console.log(`No limit set for method "${methodId}"`);
//         continue;
//       }
 
//       const isNowLow = Number(qty) <= Number(limit);
//       const wasAlreadyNotified = notified[methodId] === true;
//       console.log(`limit: ${limit} isNowLow: ${isNowLow} wasAlreadyNotified: ${wasAlreadyNotified}`);
 
//       if (isNowLow && !wasAlreadyNotified) {
//         newlyLow.push({ methodId, qty, limit });
//         updates[`lowStockNotifiedByMethod.${methodId}`] = true;
//       } else if (!isNowLow && wasAlreadyNotified) {
//         updates[`lowStockNotifiedByMethod.${methodId}`] = false; // restocked
//       }
//     }
 
//     if (newlyLow.length > 0) {
//       const rhuName = after.name || rhuId;
 
//       const usersSnap = await admin.firestore().collection("users").get();
//       const allEmails = usersSnap.docs
//         .map((doc) => {
//           const data = doc.data();
//           if (data && (data.email || data.Email)) return data.email || data.Email;
//           if (doc.id && doc.id.includes("@")) return doc.id;
//           return null;
//         })
//         .filter(Boolean);
//       console.log("Recipients found:", allEmails.length);
 
//       if (allEmails.length > 0) {
//         const lines = newlyLow.map(
//           (m) => `- ${METHOD_LABELS[m.methodId] || m.methodId}: ${m.qty} left (limit: ${m.limit})`
//         );
//         const subjectMethods = newlyLow
//           .map((m) => METHOD_LABELS[m.methodId] || m.methodId)
//           .join(", ");
 
//         try {
//           const info = await transporter.sendMail({
//             from: `"PlanWise System" <${process.env.BREVO_FROM_EMAIL}>`,
//             to: process.env.BREVO_FROM_EMAIL,
//             bcc: allEmails.join(","), // keeps recipients' addresses private
//             subject: `Low Stock Alert: ${subjectMethods} at ${rhuName}`,
//             text: `${rhuName} has low stock:\n\n${lines.join("\n")}`,
//           });
//           console.log("Brevo accepted:", info.accepted);
//           console.log("Brevo rejected:", info.rejected);
//           console.log("Server response:", info.response);
//           console.log(`Low stock email sent for ${rhuName}`);
//         } catch (err) {
//           console.error("Failed to send email:", err);
//         }
//       } else {
//         console.log("No recipient emails found in users collection.");
//       }
//     }
 
//     if (Object.keys(updates).length > 0) {
//       return event.data.after.ref.update(updates);
//     }
//     return null;
//   }
// );

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
          const label = METHOD_LABELS[m.methodId] || m.methodId;
          const subject = `Low Stock Alert: ${label} at ${rhuName}`;
          const text = `${rhuName} is low on ${label}.\n\nRemaining: ${m.qty}\nLimit: ${m.limit}`;

          // Send to each user's own email
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
              console.error(`Failed for ${allEmails[i]} (${rhuId}/${m.methodId}):`, r.reason);
            } else {
              console.log(`Sent to ${allEmails[i]} (${rhuId}/${m.methodId}):`, r.value.accepted);
            }
          });

          // Flag only if at least one email was accepted
          const anySent = results.some(
            (r) => r.status === "fulfilled" && r.value.accepted && r.value.accepted.length > 0
          );
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