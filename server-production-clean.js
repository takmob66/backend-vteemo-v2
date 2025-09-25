// VTEEMO Backend - Clean Production Server for Liara
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Basic configuration
const JWT_SECRET = process.env.JWT_SECRET || 'VtEeMo2025SuperSecretKey4ProductionUse32CharsLong';

// In-memory storage for production (safe fallback)
const users = new Map();
const videos = new Map();
let userIdCounter = 1;
let videoIdCounter = 1;

// CORS Configuration
const corsOptions = {
  origin: [
    'https://vteemo-frontend.liara.run',
    'http://localhost:3000',
    'https://vteemo.com',
    'https://vteemo.ir',
    'https://www.vteemo.ir',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'VTEEMO Backend is running on Liara!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: '3.0.0-clean',
    database: 'in-memory',
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎬 VTEEMO Video Platform API',
    version: '3.0.0-clean',
    status: 'operational',
    database: 'In-Memory Storage',
    storage: process.env.STORAGE_ENDPOINT ? 'configured' : 'not configured',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      videos: '/api/videos/*',
      users: '/api/users/*'
    },
    environment: process.env.NODE_ENV || 'production'
  });
});

// API Status
app.get('/api/status', (req, res) => {
  res.json({
    api: 'VTEEMO Backend API',
    version: '3.0.0-clean',
    status: 'operational',
    database: {
      status: 'in-memory',
      users: users.size,
      videos: videos.size
    },
    storage: {
      status: process.env.STORAGE_ENDPOINT ? 'configured' : 'not configured',
      endpoint: process.env.STORAGE_ENDPOINT || 'not configured'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    timestamp: new Date().toISOString()
  });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user exists
    for (let user of users.values()) {
      if (user.email === email || user.username === username) {
        return res.status(400).json({ error: 'User already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = userIdCounter++;
    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      avatar: null,
      bio: '',
      isVerified: false,
      subscriberCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.set(userId, user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    let user = null;
    for (let u of users.values()) {
      if (u.email === email) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = users.get(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio,
      isVerified: user.isVerified,
      subscriberCount: user.subscriberCount,
      createdAt: user.createdAt
    }
  });
});

// Video Routes
app.get('/api/videos', (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, userId } = req.query;
    const offset = (page - 1) * limit;
    
    let videoList = Array.from(videos.values());
    
    // Filter by userId (for user profile)
    if (userId) {
      videoList = videoList.filter(video => video.userId === parseInt(userId));
    }
    
    // Filter by category
    if (category) {
      videoList = videoList.filter(video => video.category === category);
    }
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      videoList = videoList.filter(video => 
        video.title.toLowerCase().includes(searchLower) ||
        video.description.toLowerCase().includes(searchLower) ||
        (video.tags && video.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }
    
    // Sort by created date (newest first)
    videoList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Paginate
    const paginatedVideos = videoList.slice(offset, offset + parseInt(limit));

    // Add user info to each video
    const videosWithUsers = paginatedVideos.map(video => {
      const user = users.get(video.userId);
      return {
        ...video,
        user: user ? {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isVerified: user.isVerified
        } : null
      };
    });

    res.json({
      videos: videosWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: videoList.length,
        pages: Math.ceil(videoList.length / limit)
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Server error getting videos' });
  }
});

app.post('/api/videos', authenticate, (req, res) => {
  try {
    const { title, description, category, tags, visibility = 'public' } = req.body;
    const user = users.get(req.user.userId);

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const videoId = videoIdCounter++;
    const video = {
      id: videoId,
      title,
      description: description || '',
      category: category || 'General',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      visibility,
      status: 'published',
      views: 0,
      likes: 0,
      dislikes: 0,
      commentCount: 0,
      thumbnail: null,
      videoUrl: null,
      duration: null,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    videos.set(videoId, video);

    res.status(201).json({
      message: 'Video created successfully',
      video: {
        ...video,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isVerified: user.isVerified
        }
      }
    });
  } catch (error) {
    console.error('Video creation error:', error);
    res.status(500).json({ error: 'Server error during video creation' });
  }
});

app.get('/api/videos/:id', (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const video = videos.get(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Increment views
    video.views++;
    video.updatedAt = new Date();
    videos.set(videoId, video);

    // Get user info
    const user = users.get(video.userId);

    res.json({
      video: {
        ...video,
        user: user ? {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isVerified: user.isVerified,
          subscriberCount: user.subscriberCount
        } : null
      }
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Server error getting video' });
  }
});

// User Profile Routes
app.get('/api/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = users.get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user videos
    const userVideos = Array.from(videos.values())
      .filter(video => video.userId === userId)
      .map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        views: video.views,
        likes: video.likes,
        duration: video.duration,
        createdAt: video.createdAt
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        isVerified: user.isVerified,
        subscriberCount: user.subscriberCount,
        videoCount: userVideos.length,
        createdAt: user.createdAt,
        videos: userVideos
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error getting user' });
  }
});

// Like/Unlike video
app.post('/api/videos/:id/like', authenticate, (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const video = videos.get(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Simple like toggle (in production, you'd track user likes)
    video.likes++;
    video.updatedAt = new Date();
    videos.set(videoId, video);

    res.json({
      message: 'Video liked successfully',
      likes: video.likes
    });
  } catch (error) {
    console.error('Like video error:', error);
    res.status(500).json({ error: 'Server error liking video' });
  }
});

// Search endpoint
app.get('/api/search', (req, res) => {
  try {
    const { q, type = 'videos', page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = q.toLowerCase();
    const offset = (page - 1) * limit;

    if (type === 'videos') {
      let results = Array.from(videos.values())
        .filter(video => 
          video.title.toLowerCase().includes(searchQuery) ||
          video.description.toLowerCase().includes(searchQuery) ||
          (video.tags && video.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + parseInt(limit));

      // Add user info
      results = results.map(video => {
        const user = users.get(video.userId);
        return {
          ...video,
          user: user ? {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar
          } : null
        };
      });

      res.json({
        results,
        type: 'videos',
        query: q,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } else if (type === 'users') {
      const results = Array.from(users.values())
        .filter(user => 
          user.username.toLowerCase().includes(searchQuery) ||
          user.firstName.toLowerCase().includes(searchQuery) ||
          user.lastName.toLowerCase().includes(searchQuery)
        )
        .slice(offset, offset + parseInt(limit))
        .map(user => ({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isVerified: user.isVerified,
          subscriberCount: user.subscriberCount
        }));

      res.json({
        results,
        type: 'users',
        query: q,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } else {
      res.status(400).json({ error: 'Invalid search type. Use "videos" or "users"' });
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error during search' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
============================================================
🎬 VTEEMO Backend Server v3.0.0-clean
============================================================
📊 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'production'}
🗄️ Database: In-Memory Storage (Safe Mode)
📁 Storage: ${process.env.STORAGE_ENDPOINT ? 'Configured' : 'Not configured'}
🔗 Health: http://localhost:${PORT}/health
🚀 API: http://localhost:${PORT}/api
============================================================
✅ Ready for production deployment!
============================================================
  `);
});