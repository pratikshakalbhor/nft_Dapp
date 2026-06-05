import { ref, push, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { db } from "../firebase";

/**
 * Supported types: 
 * - mint
 * - list
 * - buy
 * - sell
 * - job_posted
 * - job_accepted
 * - work_submitted
 * - payment_released
 */
export const recordActivity = async (walletAddress, activity) => {
  if (!walletAddress) return;
  
  try {
    const activityRef = ref(db, `activities/${walletAddress}`);
    await push(activityRef, {
      ...activity,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Failed to record activity:", error);
  }
};

export const listenToActivities = (walletAddress, callback) => {
  if (!walletAddress) return () => {};
  
  const activityRef = ref(db, `activities/${walletAddress}`);
  const activityQuery = query(activityRef, orderByChild("timestamp"), limitToLast(50));
  
  return onValue(activityQuery, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.entries(data).map(([id, val]) => ({
        id,
        ...val,
      }));
      list.sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    } else {
      callback([]);
    }
  });
};
