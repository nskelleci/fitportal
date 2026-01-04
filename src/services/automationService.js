import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const automationService = {
  /**
   * Create a new automation rule
   * @param {Object} ruleData 
   */
  createRule: async (ruleData) => {
    const docRef = await addDoc(collection(db, 'autoflows'), {
      ...ruleData,
      createdAt: serverTimestamp(),
      isActive: true
    });
    return docRef.id;
  },

  /**
   * Get automation rules for a trainer
   * @param {string} trainerId 
   */
  getTrainerRules: async (trainerId) => {
    const q = query(collection(db, 'autoflows'), where('trainerId', '==', trainerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Toggle rule active status
   * @param {string} ruleId 
   * @param {boolean} isActive 
   */
  toggleRule: async (ruleId, isActive) => {
    await updateDoc(doc(db, 'autoflows', ruleId), { isActive });
  },

  /**
   * Delete a rule
   * @param {string} ruleId 
   */
  deleteRule: async (ruleId) => {
    await deleteDoc(doc(db, 'autoflows', ruleId));
  }
};

