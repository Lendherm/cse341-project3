const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerOptions = require('./swagger');
const path = require('path');

dotenv.config();

const app = express();

// Configuración dinámica para múltiples entornos
const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_URL = 'http://localhost:8080';
const PRODUCTION_URL = 'https://cse341-project3-11r5.onrender.com';
const CURRENT_URL = isProduction ? PRODUCTION_URL : LOCAL_URL;

// Trust proxy para Render
if (isProduction) {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy enabled for production');
}

console.log('=== ENVIRONMENT CONFIG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isProduction:', isProduction);
console.log('CURRENT_URL:', CURRENT_URL);
console.log('==========================');

// Middleware
app.use(express.json());

// CORS configurado para ambos entornos
const corsOptions = {
  origin: [LOCAL_URL, PRODUCTION_URL, 'https://cse341-project3-11r5.onrender.com'],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Session configuration para producción
app.use(session({
  secret: process.env.SESSION_SECRET || 'cse341-books-api-development-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // true en producción, false en desarrollo
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isProduction ? 'none' : 'lax' // Importante para OAuth en producción
  },
  proxy: isProduction // Permitir proxy en producción
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

const User = require('./models/user');

// GitHub OAuth Strategy - CONFIGURACIÓN MEJORADA
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || `${CURRENT_URL}/auth/github/callback`,
  scope: ['user:email'],
  proxy: isProduction // Importante para Render
},
async function(accessToken, refreshToken, profile, done) {
  try {
    console.log('🔐 GitHub Profile received:');
    console.log('ID:', profile.id);
    console.log('Username:', profile.username);
    console.log('Display Name:', profile.displayName);
    console.log('Emails:', profile.emails);
    
    // Check if user already exists with this GitHub ID
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      console.log('✅ User found by GitHub ID:', user.username);
      return done(null, user);
    }

    // Manejar email de forma segura
    let userEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    
    if (!userEmail) {
      userEmail = `${profile.username}@users.noreply.github.com`;
      console.log('📧 No email from GitHub, using:', userEmail);
    }

    // Check if user exists with the same email
    if (userEmail) {
      user = await User.findOne({ email: userEmail });
      
      if (user) {
        console.log('✅ User found by email, linking GitHub account:', user.username);
        user.githubId = profile.id;
        await user.save();
        return done(null, user);
      }
    }

    // Create new user
    const newUser = new User({
      githubId: profile.id,
      username: profile.username,
      email: userEmail,
      displayName: profile.displayName || profile.username,
      profileUrl: profile.profileUrl
    });

    await newUser.save();
    console.log('✅ New user created:', newUser.username);
    return done(null, newUser);
  } catch (error) {
    console.error('❌ Error in GitHub strategy:', error);
    return done(error, null);
  }
}));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware para log de entorno y debugging
app.use((req, res, next) => {
  console.log(`[${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}] ${req.method} ${req.url}`);
  console.log('Session ID:', req.sessionID);
  console.log('Authenticated:', req.isAuthenticated());
  console.log('User:', req.user ? req.user.username : 'No user');
  next();
});

// Servir archivos estáticos (para favicon y otros recursos)
app.use(express.static('public'));

// Crear ruta para favicon temporal
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content - elimina el error 404
});

app.get('/favicon-32x32.png', (req, res) => {
  res.status(204).end(); // No Content - elimina el error 404
});

// Routes
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      message: `Welcome ${req.user.displayName}!`,
      user: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName
      },
      logoutUrl: '/logout',
      apiDocs: '/api-docs',
      environment: isProduction ? 'production' : 'development',
      currentUrl: CURRENT_URL
    });
  } else {
    res.json({
      message: 'Welcome to Books & Authors API!',
      loginUrl: '/login',
      apiDocs: '/api-docs',
      environment: isProduction ? 'production' : 'development',
      currentUrl: CURRENT_URL
    });
  }
});

// Redirect /login to /auth/github
app.get('/login', (req, res) => {
  console.log('🔑 Login redirect initiated');
  res.redirect('/auth/github');
});

// Redirect /logout to /auth/logout
app.get('/logout', (req, res) => {
  console.log('🚪 Logout redirect initiated');
  res.redirect('/auth/logout');
});

// Auth routes
app.get('/auth/github',
  (req, res, next) => {
    console.log('🔐 Initiating GitHub OAuth flow');
    console.log('Callback URL:', process.env.GITHUB_CALLBACK_URL || `${CURRENT_URL}/auth/github/callback`);
    next();
  },
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  (req, res, next) => {
    console.log('🔄 GitHub callback received');
    console.log('Query params:', req.query);
    next();
  },
  passport.authenticate('github', { 
    failureRedirect: '/?error=auth_failed',
    failureMessage: true 
  }),
  (req, res) => {
    console.log('✅ Login successful, user:', req.user.username);
    res.redirect('/api-docs');
  }
);

app.get('/auth/logout', (req, res) => {
  console.log('🚪 Logging out user:', req.user ? req.user.username : 'No user');
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ message: 'Error logging out' });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destruction error:', err);
      }
      res.redirect('/');
    });
  });
});

app.get('/auth/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.displayName
      },
      environment: isProduction ? 'production' : 'development'
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Debug route para ver sesión
app.get('/auth/debug', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user,
    session: req.session,
    sessionID: req.sessionID,
    environment: isProduction ? 'production' : 'development'
  });
});

// Import routes
const bookRoutes = require('./routes/books');
const authorRoutes = require('./routes/authors');

// Apply routes
app.use('/books', bookRoutes);
app.use('/authors', authorRoutes);

// Swagger documentation
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    availableRoutes: {
      home: '/',
      login: '/login',
      logout: '/logout',
      apiDocs: '/api-docs',
      books: '/books',
      authors: '/authors',
      auth: {
        login: '/auth/github',
        logout: '/auth/logout',
        current: '/auth/current',
        debug: '/auth/debug'
      }
    },
    environment: isProduction ? 'production' : 'development'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: isProduction ? undefined : error.message,
    environment: isProduction ? 'production' : 'development'
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('=== 🚀 SERVER STARTED ===');
  console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Local URL: ${LOCAL_URL}`);
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log(`Current URL: ${CURRENT_URL}`);
  console.log(`Home: ${CURRENT_URL}/`);
  console.log(`Login: ${CURRENT_URL}/login`);
  console.log(`Logout: ${CURRENT_URL}/logout`);
  console.log(`API Documentation: ${CURRENT_URL}/api-docs`);
  console.log(`GitHub Callback: ${CURRENT_URL}/auth/github/callback`);
  console.log('==========================');
});

module.exports = app;