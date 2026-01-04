import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const assignmentService = {
  /**
   * Assign a program to a member (Concurrent support)
   * @param {Object} assignmentData 
   * @param {string} assignmentData.memberId
   * @param {string} assignmentData.trainerId
   * @param {string} assignmentData.sourceProgramId
   * @param {Object} assignmentData.programSnapshot - Copy of the program data at time of assignment
   */
  assignProgram: async (assignmentData) => {
    const { memberId, trainerId, sourceProgramId, programSnapshot } = assignmentData;
    
    // Unlike v1, we don't archive previous programs automatically unless they conflict 
    // or business logic requires it. For now, we allow concurrent active programs.
    
    const docRef = await addDoc(collection(db, 'assigned_programs'), {
      memberId,
      trainerId,
      sourceProgramId,
      programSnapshot, // Store full copy to allow customization
      status: 'active',
      startDate: serverTimestamp(),
      currentWeek: 1,
      progress: 0
    });
    
    return docRef.id;
  },

  /**
   * Get active programs for a member
   * @param {string} memberId 
   */
  getActiveAssignments: async (memberId) => {
    const q = query(
      collection(db, 'assigned_programs'), 
      where('memberId', '==', memberId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Update assignment status (e.g. complete, pause)
   * @param {string} assignmentId 
   * @param {string} status 
   */
  updateStatus: async (assignmentId, status) => {
    const ref = doc(db, 'assigned_programs', assignmentId);
    await updateDoc(ref, { status });
  }
};

