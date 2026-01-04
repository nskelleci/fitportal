import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Search, Star, User, Check, Package, ShoppingCart, Filter, DollarSign } from "lucide-react";
import { marketplaceService } from "../../services/marketplaceService";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function MarketplaceTab() {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("products"); // 'trainers' | 'products'
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      if (activeTab === 'trainers') {
        const q = query(collection(db, "users"), where("role", "==", "trainer"), where("status", "==", "active"));
        const snapshot = await getDocs(q);
        setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        // Products
        const products = await marketplaceService.getAllProducts();
        setItems(products);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product) => {
    if (!confirm(`${product.title} ürününü ${product.price}₺ karşılığında satın almak istiyor musunuz? (Demo)`)) return;
    
    setProcessingId(product.id);
    try {
      // 1. Create Order Record
      await addDoc(collection(db, "orders"), {
        buyerId: currentUser.uid,
        buyerName: userProfile.name,
        sellerId: product.trainerId,
        productId: product.id,
        productTitle: product.title,
        amount: product.price,
        status: 'completed', // Auto-complete for demo
        createdAt: serverTimestamp()
      });

      // 2. Assign Product Content (If it's a program)
      if (product.category === 'program' && product.programId) {
          // Logic to copy template to assigned_programs would go here
          // For now just notify
      }
      
      // 3. Notify User
      await addDoc(collection(db, "notifications"), {
        recipientId: currentUser.uid,
        message: `${product.title} satın alımı başarılı! Teşekkürler. 🎉`,
        type: "success",
        read: false,
        createdAt: serverTimestamp()
      });

      alert("Satın alma başarılı!");
    } catch (error) {
      console.error("Purchase error:", error);
      alert("İşlem başarısız.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSubscribe = async (trainer) => {
    if (!confirm(`${trainer.name} adlı eğitmene abone olmak istiyor musunuz?`)) return;
    
    setProcessingId(trainer.id);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        trainerId: trainer.id,
        subscriptionStatus: 'active',
        subscriptionDate: serverTimestamp()
      });
      
      alert("Tebrikler! Abonelik başarıyla başlatıldı.");
      window.location.reload(); 
    } catch (error) {
      console.error("Subscription error:", error);
      alert("İşlem başarısız.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredItems = items.filter(item => 
    (item.title || item.name)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button 
             onClick={() => setActiveTab('products')}
             className={`px-6 py-2 rounded-md text-sm font-bold transition ${activeTab === 'products' ? 'bg-white text-slate-800 shadow' : 'text-slate-500'}`}
           >
             Programlar & Paketler
           </button>
           <button 
             onClick={() => setActiveTab('trainers')}
             className={`px-6 py-2 rounded-md text-sm font-bold transition ${activeTab === 'trainers' ? 'bg-white text-slate-800 shadow' : 'text-slate-500'}`}
           >
             Eğitmenler
           </button>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={activeTab === 'trainers' ? "Eğitmen ara..." : "Program ara..."}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'products' ? (
             // PRODUCT CARDS
             filteredItems.length === 0 ? <div className="col-span-3 text-center py-12 text-slate-400">Ürün bulunamadı.</div> :
             filteredItems.map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition group">
                  <div className="h-40 bg-slate-100 relative">
                     {product.coverImage ? (
                         <img src={product.coverImage} alt={product.title} className="w-full h-full object-cover" />
                     ) : (
                         <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                             <Package size={48} className="opacity-20" />
                         </div>
                     )}
                     <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-800 shadow-sm">
                        {product.category === 'program' ? 'Antrenman Programı' : 'Online Koçluk'}
                     </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{product.title}</h3>
                       <div className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                          <Star size={10} className="fill-current" /> 4.8
                       </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">Eğitmen: {product.trainerName}</p>
                    
                    <p className="text-slate-600 text-sm line-clamp-2 mb-4 h-10">
                      {product.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                       <div className="font-bold text-xl text-emerald-600">
                         {product.price} ₺
                       </div>
                       <button 
                         onClick={() => handlePurchase(product)}
                         disabled={processingId === product.id}
                         className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 transition flex items-center gap-2 disabled:opacity-50"
                       >
                         <ShoppingCart size={16} />
                         {processingId === product.id ? '...' : 'Satın Al'}
                       </button>
                    </div>
                  </div>
                </div>
             ))
          ) : (
             // TRAINER CARDS
             filteredItems.length === 0 ? <div className="col-span-3 text-center py-12 text-slate-400">Eğitmen bulunamadı.</div> :
             filteredItems.map(trainer => (
                <div key={trainer.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition group ${userProfile?.trainerId === trainer.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:shadow-md'}`}>
                  <div className="h-32 bg-slate-100 relative flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <User size={48} className="text-slate-600" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
                       <Star size={10} className="text-yellow-400 fill-yellow-400" /> 4.9
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-800">{trainer.name}</h3>
                    <p className="text-emerald-600 text-sm font-medium mb-3">{trainer.specialization || 'Genel Fitness'}</p>
                    
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4 h-10">
                      {trainer.bio || 'Henüz biyografi eklenmemiş.'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                       <div className="text-slate-800 font-bold">
                         2000₺ <span className="text-xs text-slate-400 font-normal">/ Ay</span>
                       </div>
                       
                       {userProfile?.trainerId === trainer.id ? (
                         <button disabled className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                           <Check size={16} /> Abonesin
                         </button>
                       ) : (
                         <button 
                           onClick={() => handleSubscribe(trainer)}
                           disabled={processingId === trainer.id}
                           className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 transition disabled:opacity-50"
                         >
                           {processingId === trainer.id ? '...' : 'Abone Ol'}
                         </button>
                       )}
                    </div>
                  </div>
                </div>
             ))
          )}
        </div>
      )}
    </div>
  );
}
