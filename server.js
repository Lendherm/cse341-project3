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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
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

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:8080/auth/github/callback"
},
async function(accessToken, refreshToken, profile, done) {
  try {
    // Check if user already exists with this GitHub ID
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      return done(null, user);
    }

    // Check if user exists with the same email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link GitHub account to existing user
      user.githubId = profile.id;
      await user.save();
      return done(null, user);
    }

    // Create new user
    const newUser = new User({
      githubId: profile.id,
      username: profile.username,
      email: profile.emails[0].value,
      displayName: profile.displayName,
      profileUrl: profile.profileUrl
    });

    await newUser.save();
    return done(null, newUser);
  } catch (error) {
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
      logoutUrl: '/auth/logout',
      apiDocs: '/api-docs'
    });
  } else {
    res.json({
      message: 'Welcome to Books & Authors API!',
      loginUrl: '/auth/github',
      apiDocs: '/api-docs'
    });
  }
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
    res.redirect('/api-docs');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
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
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});

module.exports = app;