import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const marketplaceService = {
  /**
   * Register trainer as a sub-merchant (Iyzico)
   * @param {Object} merchantData 
   */
  registerSubMerchant: async (merchantData) => {
    // In real app, this calls Cloud Function -> Iyzico API
    // Here we mock it by updating user profile
    const { userId, iban, identityNumber } = merchantData;
    
    await updateDoc(doc(db, 'users', userId), {
      isSeller: true,
      sellerInfo: {
        iban,
        identityNumber,
        subMerchantKey: `mock-sub-merchant-${Date.now()}`, // Mock key from Iyzico
        approvedAt: serverTimestamp()
      }
    });
  },

  /**
   * Create a product
   * @param {Object} productData 
   */
  createProduct: async (productData) => {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: serverTimestamp(),
      salesCount: 0,
      rating: 0
    });
    return docRef.id;
  },

  /**
   * Get trainer's products
   */
  getTrainerProducts: async (trainerId) => {
    const q = query(collection(db, 'products'), where('trainerId', '==', trainerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Get all products (Marketplace View)
   */
  getAllProducts: async () => {
    // Real app would use pagination and filtering
    const q = query(collection(db, 'products')); 
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

