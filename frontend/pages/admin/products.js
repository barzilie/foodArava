// pages/admin/products.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import withAdminAuth from '../../components/withAdminAuth';
import Image from 'next/image';
import { format } from 'date-fns';

// Define the API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const placeholderImg = 'https://res.cloudinary.com/dkfiohdyn/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1745856568/no_image_q68ugl.svg';

// Simple Modal Component (can be extracted later)
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

// --- Product Form Component (Modified) ---
const ProductForm = ({ initialProduct, onSubmit, onCancel, isSubmitting }) => {
  const [productData, setProductData] = useState({
      name: '',
      pricePerUnit: '',
      description: '',
      manufacturer: '',
      servingOptions: '',
      isSpecialOffer: false,
      defaultPacketCount: 0, // Initialize packet count
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Update state when initialProduct changes (for editing)
  useEffect(() => {
      setProductData({
          name: initialProduct?.name || '',
          pricePerUnit: initialProduct?.pricePerUnit || '',
          description: initialProduct?.description || '',
          manufacturer: initialProduct?.manufacturer || '',
          servingOptions: initialProduct?.servingOptions?.join(', ') || '',
          isSpecialOffer: initialProduct?.isSpecialOffer || false,
          // Set packet count from initial product or default to 0
          defaultPacketCount: initialProduct?.defaultPacketCount ?? 0,
      });
      setImageFile(null);
      setImagePreview(initialProduct?.photo || null);
  }, [initialProduct]);


  const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setProductData(prev => ({
          ...prev,
          // Use valueAsNumber for number inputs if possible, otherwise parse
          [name]: type === 'checkbox' ? checked : (type === 'number' ? value : value) // Keep as string for number initially
      }));
  };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setImageFile(null);
            setImagePreview(initialProduct?.photo || null); // Revert to initial/no image
        }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      const formData = new FormData();
      // Append all fields, ensuring numbers are sent correctly
      Object.entries(productData).forEach(([key, value]) => {
           if (key === 'isSpecialOffer') {
              formData.append(key, value ? 'true' : 'false');
           } else if (key === 'pricePerUnit' || key === 'defaultPacketCount') {
               // Ensure number values are valid numbers before appending
               const numValue = Number(value);
               formData.append(key, isNaN(numValue) ? '0' : numValue.toString()); // Send as string, backend will parse
           } else {
              formData.append(key, value);
          }
      });
      if (imageFile) { formData.append('productImage', imageFile); }
      onSubmit(formData);
  };

  return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">שם מוצר <span className="text-red-500">*</span></label>
                <input type="text" name="name" id="name" value={productData.name} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
             <div>
                <label htmlFor="pricePerUnit" className="block text-sm font-medium text-gray-700">מחיר ליחידה <span className="text-red-500">*</span></label>
                <input type="number" name="pricePerUnit" id="pricePerUnit" step="0.01" min="0" value={productData.pricePerUnit} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
             <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">תיאור</label>
                <textarea name="description" id="description" rows="3" value={productData.description} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
            </div>
             <div>
                <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">יצרן</label>
                <input type="text" name="manufacturer" id="manufacturer" value={productData.manufacturer} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
             <div>
                <label htmlFor="servingOptions" className="block text-sm font-medium text-gray-700">אפשרויות הגשה (מופרד בפסיק)</label>
                <input type="text" name="servingOptions" id="servingOptions" value={productData.servingOptions} onChange={handleChange} placeholder="לדוגמה: נתח שלם, פרוס לסטייקים" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
                        {/* --- Default Packet Count Field --- */}
                        <div>
                <label htmlFor="defaultPacketCount" className="block text-sm font-medium text-gray-700">מספר אריזות ברירת מחדל</label>
                <input
                    type="number"
                    name="defaultPacketCount"
                    id="defaultPacketCount"
                    step="1"
                    min="0"
                    value={productData.defaultPacketCount}
                    onChange={handleChange}
                    required // Make required? Or allow empty to mean 0? Let's allow empty for 0.
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                 <p className="text-xs text-gray-500 mt-1">מספר שלם (0 אם לא רלוונטי).</p>
            </div>
            {/* --- End Packet Count Field --- */}
             <div className="flex items-center">
                <input type="checkbox" name="isSpecialOffer" id="isSpecialOffer" checked={productData.isSpecialOffer} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <label htmlFor="isSpecialOffer" className="mr-2 block text-sm text-gray-900 rtl:ml-2 rtl:mr-0">מבצע מיוחד?</label>
            </div>
             <div>
                <label htmlFor="productImage" className="block text-sm font-medium text-gray-700">תמונת מוצר</label>
                <input type="file" name="productImage" id="productImage" accept="image/*" onChange={handleImageChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                {imagePreview && (
                    <div className="mt-2">
                        <Image src={imagePreview} alt="תצוגה מקדימה" width={100} height={100} objectFit="cover" className="rounded"/>
                    </div>
                )}
            </div>
             <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4 border-t">
                <button type="button" onClick={onCancel} className="btn-secondary">ביטול</button>
                <button type="submit" disabled={isSubmitting} className={`btn-primary ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isSubmitting ? 'שומר...' : (initialProduct ? 'עדכן מוצר' : 'הוסף מוצר')}
                </button>
            </div>
        </form>
    );
};


const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null for add, product object for edit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // No token needed for public product fetch
      const response = await axios.get(`${API_URL}/products`);
      setProducts(response.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err.response?.data?.message || err.message || 'שגיאה בטעינת המוצרים');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAddModal = () => {
    setEditingProduct(null); // Clear editing product for "Add" mode
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null); // Clear editing state when closing
    setFormError('');
  };

  const handleFormSubmit = async (formData) => {
     setIsSubmitting(true);
     setFormError('');
     const token = localStorage.getItem('token');
     if (!token) {
         setFormError("Admin token not found.");
         setIsSubmitting(false);
         return;
     }

     const config = {
         headers: {
             'Content-Type': 'multipart/form-data', // Important for file uploads
             Authorization: `Bearer ${token}`
         }
     };

     try {
         let response;
         if (editingProduct) {
             // Update existing product
             response = await axios.put(`${API_URL}/products/${editingProduct._id}`, formData, config);
         } else {
             // Add new product
             response = await axios.post(`${API_URL}/products`, formData, config);
         }

         if (response.status === 200 || response.status === 201) {
             closeModal();
             fetchProducts(); // Refresh the product list
         } else {
              throw new Error(response.data?.message || 'Failed to save product');
         }

     } catch (err) {
         console.error("Error saving product:", err);
         setFormError(err.response?.data?.message || err.message || 'שגיאה בשמירת המוצר');
     } finally {
         setIsSubmitting(false);
     }
  };

   const handleDeleteProduct = async (productId, productName) => {
        if (window.confirm(`האם אתה בטוח שברצונך למחוק את המוצר "${productName}"? פעולה זו אינה הפיכה.`)) {
             setError(''); // Clear previous general errors
             const token = localStorage.getItem('token');
             if (!token) {
                 setError("Admin token not found.");
                 return;
             }
             try {
                 const response = await axios.delete(`${API_URL}/products/${productId}`, {
                     headers: { Authorization: `Bearer ${token}` }
                 });

                 if (response.status === 200) {
                     fetchProducts(); // Refresh list after successful delete
                 } else {
                     throw new Error(response.data?.message || 'Failed to delete product');
                 }
             } catch (err) {
                 console.error("Error deleting product:", err);
                 setError(err.response?.data?.message || err.message || 'שגיאה במחיקת המוצר');
             }
        }
    };


  return (
    <Layout title="ניהול מוצרים">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">ניהול מוצרים</h1>
        <button onClick={openAddModal} className="btn-primary">
          הוסף מוצר חדש
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Products Table */}
      {loading ? (
        <div className="text-center py-10">טוען מוצרים...</div>
      ) : products.length === 0 ? (
         <div className="text-center py-10 bg-white rounded shadow p-6">לא נמצאו מוצרים.</div>
      ) : (
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תמונה</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מחיר</th>
                 <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">יצרן</th>
                 <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">אפשרויות הגשה</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מבצע</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך עדכון</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product._id}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Image
                        src={product.photo || placeholderImg}
                        alt={product.name}
                        width={50}
                        height={50}
                        objectFit="cover"
                        className="rounded"
                        onError={(e) => { e.target.src = placeholderImg; }}
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">₪{product.pricePerUnit.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{product.manufacturer || '-'}</td>
                   <td className="px-4 py-4 text-sm text-gray-500 max-w-xs">{(product.servingOptions || []).join(', ')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{product.isSpecialOffer ? 'כן' : 'לא'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(product.updatedAt), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2 rtl:space-x-reverse">
                  <button onClick={() => openEditModal(product)} className="text-indigo-600 hover:text-indigo-900">ערוך</button>
                  {/*<td className="text-gray-500">|</td> */}
                    {/* Added margin-right (mr-2) which works as margin-left in RTL */}
                    <button onClick={() => handleDeleteProduct(product._id, product.name)} className="text-red-600 hover:text-red-900 mr-3 rtl:ml-3 rtl:mr-2">מחק</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

       {/* Add/Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProduct ? 'עריכת מוצר' : 'הוספת מוצר חדש'}>
            {formError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{formError}</div>}
            <ProductForm
                initialProduct={editingProduct}
                onSubmit={handleFormSubmit}
                onCancel={closeModal}
                isSubmitting={isSubmitting}
            />
        </Modal>

    </Layout>
  );
};

export default withAdminAuth(AdminProductsPage);
