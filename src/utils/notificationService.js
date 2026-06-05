import { ref, push, onValue, update } from "firebase/database";
import { db } from "../firebase";


export const storeNotification = async (toAddress, fromAddress, message, jobTitle, jobId) => {
  try {
    const notifRef = ref(db, `notifications/${toAddress}`);
    await push(notifRef, {
      from: fromAddress,
      fromShort: `${fromAddress.slice(0, 6)}...${fromAddress.slice(-4)}`,
      message: message,
      jobTitle: jobTitle || "Direct Chat",
      jobId: jobId || null,
      timestamp: Date.now(),
      read: false,
    });
  } catch (error) {
    console.error("Notification store error:", error);
  }
};


export const getNotifications = (walletAddress, callback) => {
  const notifRef = ref(db, `notifications/${walletAddress}`);
  return onValue(notifRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const notifs = Object.entries(data).map(([id, notif]) => ({
        id,
        ...notif,
      }));
      notifs.sort((a, b) => b.timestamp - a.timestamp);
      callback(notifs);
    } else {
      callback([]);
    }
  });
};


export const markAsRead = async (walletAddress, notifId) => {
  try {
    const notifRef = ref(db, `notifications/${walletAddress}/${notifId}`);
    await update(notifRef, { read: true });
  } catch (error) {
    console.error("Mark read error:", error);
  }
};


export const markAllAsRead = async (walletAddress, notifications) => {
  try {
    const updates = {};
    notifications.forEach((notif) => {
      if (!notif.read) {
        updates[`notifications/${walletAddress}/${notif.id}/read`] = true;
      }
    });
    await update(ref(db), updates);
  } catch (error) {
    console.error("Mark all read error:", error);
  }
};