# 🔗 راهنمای اتصال Frontend به Backend

## 🎯 اطلاعات اتصال Backend:

### 📡 Backend URLs:
```
Production Backend: https://vteemo-backend.liara.run
Health Check:      https://vteemo-backend.liara.run/health
API Base:          https://vteemo-backend.liara.run/api
```

### 🔑 API Endpoints آماده:

#### Authentication:
```
POST /api/auth/register  - ثبت نام کاربر
POST /api/auth/login     - ورود کاربر  
GET  /api/auth/me        - پروفایل کاربر جاری
```

#### Videos:
```
GET  /api/videos         - لیست ویدیوها (با pagination)
POST /api/videos         - آپلود ویدیو جدید
GET  /api/videos/:id     - مشاهده ویدیو
POST /api/videos/:id/like        - لایک/آنلایک ویدیو
POST /api/videos/:id/comments    - اضافه کردن کامنت
```

#### Users:
```
GET /api/users/:id       - پروفایل کاربر
```

---

## 🚀 React Frontend Setup:

### 1. Environment Variables (.env):
```env
REACT_APP_API_BASE_URL=https://vteemo-backend.liara.run
REACT_APP_API_VERSION=v1
REACT_APP_BACKEND_URL=https://vteemo-backend.liara.run/api
```

### 2. API Service (src/services/api.js):
```javascript
// VTEEMO API Service
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'https://vteemo-backend.liara.run/api';

class APIService {
  constructor() {
    this.baseURL = API_BASE;
    this.token = localStorage.getItem('vteemo_token');
  }

  // Set auth token
  setToken(token) {
    this.token = token;
    localStorage.setItem('vteemo_token', token);
  }

  // Remove auth token  
  removeToken() {
    this.token = null;
    localStorage.removeItem('vteemo_token');
  }

  // Generic API request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Authentication methods
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST', 
      body: credentials,
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  logout() {
    this.removeToken();
  }

  // Video methods
  async getVideos(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/videos?${query}`);
  }

  async getVideo(id) {
    return this.request(`/videos/${id}`);
  }

  async createVideo(videoData) {
    return this.request('/videos', {
      method: 'POST',
      body: videoData,
    });
  }

  async likeVideo(videoId) {
    return this.request(`/videos/${videoId}/like`, {
      method: 'POST',
    });
  }

  async addComment(videoId, content) {
    return this.request(`/videos/${videoId}/comments`, {
      method: 'POST',
      body: { content },
    });
  }

  // User methods
  async getUser(userId) {
    return this.request(`/users/${userId}`);
  }
}

export default new APIService();
```

### 3. Auth Context (src/contexts/AuthContext.js):
```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import APIService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('vteemo_token');
    
    if (token) {
      try {
        APIService.setToken(token);
        const userData = await APIService.getCurrentUser();
        setUser(userData.user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        APIService.removeToken();
      }
    }
    
    setLoading(false);
  };

  const login = async (credentials) => {
    try {
      const response = await APIService.login(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await APIService.register(userData);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    APIService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 4. Example Login Component:
```javascript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(credentials);
      // Redirect or show success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={credentials.email}
        onChange={(e) => setCredentials({...credentials, email: e.target.value})}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={credentials.password}
        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
        required
      />
      
      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'در حال ورود...' : 'ورود'}
      </button>
    </form>
  );
};

export default LoginForm;
```

### 5. Example Videos List Component:
```javascript
import React, { useState, useEffect } from 'react';
import APIService from '../services/api';

const VideosList = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await APIService.getVideos();
      setVideos(response.videos);
    } catch (err) {
      setError('خطا در بارگذاری ویدیوها');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>در حال بارگذاری...</div>;
  if (error) return <div>خطا: {error}</div>;

  return (
    <div>
      <h2>ویدیوهای VTEEMO</h2>
      {videos.map(video => (
        <div key={video.id} className="video-card">
          <h3>{video.title}</h3>
          <p>{video.description}</p>
          <small>بازدید: {video.views} | لایک: {video.likes}</small>
        </div>
      ))}
    </div>
  );
};

export default VideosList;
```

---

## 🔧 Next.js Setup (اگر Next.js استفاده می‌کنی):

### next.config.js:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_BASE_URL: 'https://vteemo-backend.liara.run',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://vteemo-backend.liara.run/api/:path*'
      }
    ];
  }
};

module.exports = nextConfig;
```

---

## 🚀 Deployment در Liara:

### 1. Frontend Environment در Liara Panel:
```env
REACT_APP_BACKEND_URL=https://vteemo-backend.liara.run/api
REACT_APP_API_BASE_URL=https://vteemo-backend.liara.run
```

### 2. CORS تنظیم شده در Backend برای:
```
https://vteemo-frontend.liara.run
http://localhost:3000
```

---

## ✅ تست اتصال:

### 1. Health Check:
```javascript
const testConnection = async () => {
  try {
    const response = await fetch('https://vteemo-backend.liara.run/health');
    const data = await response.json();
    console.log('Backend Status:', data);
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
```

حالا Frontend تو آماده اتصال به Backend هست! 🎊