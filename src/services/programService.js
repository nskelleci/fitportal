import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const programService = {
  /**
   * Create a new program template (v2 Block-based)
   * @param {Object} programData 
   */
  createProgram: async (programData) => {
    // Validate block structure if needed
    const docRef = await addDoc(collection(db, 'programs'), {
      ...programData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: '2.0' // Mark as v2 program
    });
    return docRef.id;
  },

  /**
   * Get programs by trainer ID
   * @param {string} trainerId 
   */
  getTrainerPrograms: async (trainerId) => {
    const q = query(collection(db, 'programs'), where('trainerId', '==', trainerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Update an existing program
   * @param {string} programId 
   * @param {Object} updates 
   */
  updateProgram: async (programId, updates) => {
    const programRef = doc(db, 'programs', programId);
    await updateDoc(programRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Delete a program
   * @param {string} programId 
   */
  deleteProgram: async (programId) => {
    await deleteDoc(doc(db, 'programs', programId));
  }
};

