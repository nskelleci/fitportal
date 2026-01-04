import { doc, updateDoc, arrayUnion, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Badge Definitions
export const BADGES = {
  FIRST_STEP: {
    id: 'first_step',
    name: 'İlk Adım',
    description: 'İlk antrenmanını başarıyla tamamladın!',
    icon: '🚀',
    color: 'bg-blue-100 text-blue-600'
  },
  CONSISTENT_5: {
    id: 'consistent_5',
    name: 'İstikrarlı',
    description: 'Toplam 5 antrenmanı tamamladın.',
    icon: '🔥',
    color: 'bg-orange-100 text-orange-600'
  },
  WARRIOR_10: {
    id: 'warrior_10',
    name: 'Savaşçı',
    description: '10 antrenman barajını aştın!',
    icon: '⚔️',
    color: 'bg-red-100 text-red-600'
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Gece Kuşu',
    description: 'Gece 22:00\'den sonra antrenman yaptın.',
    icon: '🦉',
    color: 'bg-indigo-100 text-indigo-600'
  },
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Erkenci Kuş',
    description: 'Sabah 08:00\'den önce antrenman yaptın.',
    icon: '🌅',
    color: 'bg-yellow-100 text-yellow-600'
  }
};

/**
 * Checks and awards badges based on user stats and current activity
 * @param {string} userId 
 * @param {object} currentActivityContext { duration, timeOfDay, logs }
 */
export const checkAndAwardBadges = async (userId, activityContext) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return [];

    const userData = userSnap.data();
    const existingBadges = userData.badges || [];
    const stats = userData.stats || { totalWorkouts: 0 };
    
    // Update stats (increment workout count)
    const newTotalWorkouts = (stats.totalWorkouts || 0) + 1;
    
    // Determine earned badges
    const newBadges = [];

    // Rule 1: First Workout
    if (newTotalWorkouts === 1 && !existingBadges.includes(BADGES.FIRST_STEP.id)) {
      newBadges.push(BADGES.FIRST_STEP.id);
    }

    // Rule 2: 5 Workouts
    if (newTotalWorkouts >= 5 && !existingBadges.includes(BADGES.CONSISTENT_5.id)) {
      newBadges.push(BADGES.CONSISTENT_5.id);
    }

    // Rule 3: 10 Workouts
    if (newTotalWorkouts >= 10 && !existingBadges.includes(BADGES.WARRIOR_10.id)) {
      newBadges.push(BADGES.WARRIOR_10.id);
    }

    // Rule 4: Night Owl (After 22:00)
    const hour = new Date().getHours();
    if (hour >= 22 && !existingBadges.includes(BADGES.NIGHT_OWL.id)) {
      newBadges.push(BADGES.NIGHT_OWL.id);
    }

    // Rule 5: Early Bird (Before 08:00)
    if (hour < 8 && !existingBadges.includes(BADGES.EARLY_BIRD.id)) {
      newBadges.push(BADGES.EARLY_BIRD.id);
    }

    // Update DB if there are changes
    if (newBadges.length > 0 || newTotalWorkouts !== stats.totalWorkouts) {
      await updateDoc(userRef, {
        "stats.totalWorkouts": newTotalWorkouts,
        badges: arrayUnion(...newBadges)
      });

      // Create notifications for new badges
      const badgeObjects = newBadges.map(id => Object.values(BADGES).find(b => b.id === id));
      
      for (const badge of badgeObjects) {
        await addDoc(collection(db, "notifications"), {
          recipientId: userId,
          message: `Tebrikler! "${badge.name}" rozetini kazandın! 🎉`,
          type: "badge_earned",
          read: false,
          createdAt: serverTimestamp()
        });
      }
    }

    // Return full badge objects for UI display
    return newBadges.map(id => Object.values(BADGES).find(b => b.id === id));

  } catch (error) {
    console.error("Error in gamification logic:", error);
    return [];
  }
};
