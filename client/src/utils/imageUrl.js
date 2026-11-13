const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// image id -> full address for an <img> tag
export const imageUrl = (id) => (id ? `${API}/images/${id}` : '');