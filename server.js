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

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Session configuration (sin SESSION_SECRET en .env)
app.use(session({
  secret: process.env.SESSION_SECRET || 'cse341-books-api-development-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

const User = require('./models/user');

// GitHub OAuth Strategy - VERSIÓN CORREGIDA
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:8080/auth/github/callback",
  scope: ['user:email']  // Asegurar que pedimos el scope de email
},
async function(accessToken, refreshToken, profile, done) {
  try {
    console.log('GitHub Profile received:'); // ← Para debug
    console.log('ID:', profile.id);
    console.log('Username:', profile.username);
    console.log('Display Name:', profile.displayName);
    console.log('Emails:', profile.emails);
    
    // Check if user already exists with this GitHub ID
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      console.log('User found by GitHub ID:', user.username);
      return done(null, user);
    }

    // Manejar email de forma segura - GitHub puede no devolver emails
    let userEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    
    // Si no hay email, crear uno basado en el username
    if (!userEmail) {
      userEmail = `${profile.username}@users.noreply.github.com`;
      console.log('No email from GitHub, using:', userEmail);
    }

    // Check if user exists with the same email
    if (userEmail) {
      user = await User.findOne({ email: userEmail });
      
      if (user) {
        console.log('User found by email, linking GitHub account:', user.username);
        // Link GitHub account to existing user
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
    console.log('New user created:', newUser.username);
    return done(null, newUser);
  } catch (error) {
    console.error('Error in GitHub strategy:', error);
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

// Middleware de debug temporal (opcional)
app.use((req, res, next) => {
  console.log('=== SESSION DEBUG ===');
  console.log('Session ID:', req.sessionID);
  console.log('Authenticated:', req.isAuthenticated());
  console.log('User:', req.user ? req.user.username : 'No user');
  console.log('=====================');
  next();
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
      logoutUrl: '/logout',  // ← Actualizado a /logout
      apiDocs: '/api-docs'
    });
  } else {
    res.json({
      message: 'Welcome to Books & Authors API!',
      loginUrl: '/login',    // ← Actualizado a /login
      apiDocs: '/api-docs'
    });
  }
});

// Redirect /login to /auth/github
app.get('/login', (req, res) => {
  res.redirect('/auth/github');
});

// Redirect /logout to /auth/logout
app.get('/logout', (req, res) => {
  res.redirect('/auth/logout');
});

// Auth routes
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { 
    failureRedirect: '/',
    failureMessage: true 
  }),
  (req, res) => {
    console.log('Login successful, user:', req.user.username);
    res.redirect('/api-docs');
  }
);

app.get('/auth/logout', (req, res) => {
  console.log('Logging out user:', req.user ? req.user.username : 'No user');
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.redirect('/');
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
      }
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Import routes
const bookRoutes = require('./routes/books');
const authorRoutes = require('./routes/authors');

// Apply routes
app.use('/books', bookRoutes);
app.use('/authors', authorRoutes);

// Swagger documentation
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    availableRoutes: {
      home: '/',
      login: '/login',
      logout: '/logout',  // ← Agregado
      apiDocs: '/api-docs',
      books: '/books',
      authors: '/authors',
      auth: {
        login: '/auth/github',
        logout: '/auth/logout',
        current: '/auth/current'
      }
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Home: http://localhost:${PORT}/`);
  console.log(`Login: http://localhost:${PORT}/login`);
  console.log(`Logout: http://localhost:${PORT}/logout`);  // ← Agregado
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});

module.exports = app;