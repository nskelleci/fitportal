import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { userService } from "../services/userService";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthListener: Başlatılıyor...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthListener: Kullanıcı durumu değişti ->", user ? user.uid : "Giriş yapılmamış");
      setCurrentUser(user);
      
      if (user) {
        try {
          // Fetch user profile using v2 service
          console.log("Firestore: Profil çekiliyor...");
          const profile = await userService.getUserProfile(user.uid);
          
          if (profile) {
            console.log("Firestore: Profil bulundu ->", profile);
            setUserProfile(profile);
          } else {
            console.warn("Firestore: Profil belgesi YOK!");
            setUserProfile(null); 
          }
        } catch (error) {
          console.error("Firestore Hatası:", error);
        }
      } else {
        setUserProfile(null);
      }
      
      console.log("AuthListener: Loading kapatılıyor.");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    isAuthenticated: !!currentUser,
    role: userProfile?.role || null,
    // v2 New Fields
    currentStats: userProfile?.current_stats || {},
    integrations: userProfile?.integrations || {}
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

