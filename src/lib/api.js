import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app);

// Production modunda region 'europe-west1' gibi ayarlanmalıdır.
// Emulator kullanılıyorsa otomatik localhost'a yönlenir.

export const api = {
  // Payment
  createSubscription: httpsCallable(functions, 'createSubscription'),
  
  // AI (Future)
  generateAIProgram: httpsCallable(functions, 'generateAIProgram'),
  
  // SaaS (Future)
  checkTrainerLimits: httpsCallable(functions, 'checkTrainerLimits')
};

