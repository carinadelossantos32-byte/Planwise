import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase-config";

export const findDuplicate = async (collectionName, tabType, record) => {
  const ref = collection(db, collectionName);
  let q;

  if (tabType === "public") {
    q = query(ref,
      where("name", "==", record.name.trim()),
      where("spouse_name", "==", (record.spouse_name || "").trim()),
      where("is_archived", "==", false)
    );
  } else if (tabType === "private") {
    q = query(ref,
      where("name", "==", record.name.trim()),
      where("birthdate", "==", (record.birthdate || "").trim()),
      where("is_archived", "==", false)
    );
  } else if (tabType === "referred") {
    q = query(ref,
      where("name", "==", record.name.trim()),
      where("address", "==", (record.address || "").trim()),
      where("is_archived", "==", false)
    );
  }

  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};