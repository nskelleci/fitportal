import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const userService = {
  /**
   * Get user profile by ID
   * @param {string} userId 
   */
  getUserProfile: async (userId) => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { uid: userDoc.id, ...userDoc.data() };
    }
    return null;
  },

  /**
   * Update extended user stats (v2 schema)
   * @param {string} userId 
   * @param {Object} stats - { weight, streak_days, last_workout_date }
   */
  updateUserStats: async (userId, stats) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'current_stats': {
        ...stats,
        updatedAt: serverTimestamp()
      }
    });
  },

  /**
   * Update integration settings
   * @param {string} userId 
   * @param {Object} integrations - { myfitnesspal_id, apple_health_sync }
   */
  updateIntegrations: async (userId, integrations) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'integrations': integrations
    });
  }
};

