import { useState, useEffect } from "react";
import { ShoppingBag, Plus, Tag, DollarSign, Package, Star, Edit2, Trash2, ExternalLink, CreditCard } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { marketplaceService } from "../../services/marketplaceService";

export default function ProductsTab() {
  const { currentUser, userProfile } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSeller, setIsSeller] = useState(userProfile?.isSeller || false);

  // New Product State
  const [newProduct, setNewProduct] = useState({
    title: "",
    description: "",
    price: "",
    category: "program", // program, coaching, video_series
    coverImage: "",
    programId: "" // Link to an existing program template
  });

  // Fetch Trainer's Products
  useEffect(() => {
    if (currentUser) {
      fetchProducts();
    }
  }, [currentUser]);

  const fetchProducts = async () => {
    try {
      const data = await marketplaceService.getTrainerProducts(currentUser.uid);
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.title || !newProduct.price) return alert("Lütfen zorunlu alanları doldurun.");
    
    try {
      await marketplaceService.createProduct({
        ...newProduct,
        trainerId: currentUser.uid,
        trainerName: userProfile.name,
        price: Number(newProduct.price)
      });
      setShowModal(false);
      fetchProducts();
      alert("Ürün satışa çıkarıldı!");
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Hata oluştu.");
    }
  };

  const handleBecomeSeller = async () => {
    if(!confirm("Satıcı hesabı oluşturmak üzeresiniz. (Demo: Otomatik onaylanacak)")) return;
    
    try {
        // Mock registration
        await marketplaceService.registerSubMerchant({
            userId: currentUser.uid,
            iban: "TR000000000000000000",
            identityNumber: "11111111111"
        });
        setIsSeller(true);
        alert("Satıcı hesabınız onaylandı! Artık ürün satabilirsiniz.");
        window.location.reload();
    } catch (error) {
        console.error(error);
        alert("Hata oluştu.");
    }
  };

  if (!isSeller) {
      return (
          <div className="p-8 flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                  <ShoppingBag size={40} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Bilgini Gelire Dönüştür</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                  Antrenman programlarını, beslenme planlarını veya özel koçluk paketlerini marketplace üzerinden binlerce üyeye satabilirsin.
                  Ödemeler her hafta hesabına yatar.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8 text-left">
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <DollarSign className="text-emerald-500 mb-2" />
                    <h4 className="font-bold text-slate-800">Ek Gelir</h4>
                    <p className="text-xs text-slate-500">Şablonlarını bir kez hazırla, sınırsız sat.</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <CreditCard className="text-blue-500 mb-2" />
                    <h4 className="font-bold text-slate-800">Kolay Ödeme</h4>
                    <p className="text-xs text-slate-500">Iyzico güvencesiyle kredi kartı kabul et.</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <Star className="text-amber-500 mb-2" />
                    <h4 className="font-bold text-slate-800">Puanlama</h4>
                    <p className="text-xs text-slate-500">Yüksek puan al, vitrinde öne çık.</p>
                 </div>
              </div>

              <button 
                onClick={handleBecomeSeller}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
              >
                  Satıcı Hesabı Oluştur
              </button>
          </div>
      )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-indigo-600" /> Ürünlerim
          </h1>
          <p className="text-slate-500 mt-1">Marketplace vitrinindeki ürünlerini yönet.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 transition"
        >
          <Plus size={20} /> Yeni Ürün Ekle
        </button>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Yükleniyor...</div>
      ) : products.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
          <p className="text-slate-500 mb-4">Henüz satışta bir ürünün yok.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="text-emerald-600 font-bold hover:underline"
          >
            İlk ürününü ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition group">
              <div className="h-40 bg-slate-200 relative">
                 {product.coverImage ? (
                     <img src={product.coverImage} alt={product.title} className="w-full h-full object-cover" />
                 ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                         <Package size={48} className="opacity-20" />
                     </div>
                 )}
                 <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-800 shadow-sm">
                     {product.category === 'program' ? 'Program' : 'Koçluk'}
                 </div>
              </div>
              
              <div className="p-5">
                <h3 className="font-bold text-slate-800 text-lg mb-1">{product.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">{product.description}</p>
                
                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                   <span className="font-bold text-xl text-emerald-600">{product.price} ₺</span>
                   <div className="flex items-center gap-1 text-slate-400 text-sm">
                       <ShoppingBag size={14} /> {product.salesCount || 0} Satış
                   </div>
                </div>
              </div>
              
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between">
                  <button className="text-slate-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1">
                      <Edit2 size={14} /> Düzenle
                  </button>
                  <button className="text-slate-500 hover:text-red-600 text-sm font-medium flex items-center gap-1">
                      <Trash2 size={14} /> Kaldır
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <Tag size={20} className="text-indigo-600" /> Ürün Ekle
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ürün Başlığı</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="Örn: 12 Haftalık Hipertrofi Programı"
                  value={newProduct.title}
                  onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    <option value="program">Antrenman Programı</option>
                    <option value="coaching">Online Koçluk</option>
                    <option value="nutrition">Beslenme Planı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fiyat (₺)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="299.90"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
                  rows="4"
                  placeholder="Bu ürün neleri kapsıyor? Kimler için uygun?"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                ></textarea>
              </div>

              {/* Link to existing program template logic would go here (Select dropdown) */}
              
              <button 
                onClick={handleCreateProduct}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
              >
                Satışa Çıkar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X(props) {
    return (
      <svg 
        {...props}
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    )
}

