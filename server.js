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
const MongoStore = require('connect-mongo'); // ← NUEVO

dotenv.config();

const app = express();

// Configuración dinámica para múltiples entornos
const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_URL = 'http://localhost:8080';
const PRODUCTION_URL = 'https://cse341-project3-11r5.onrender.com';
const CURRENT_URL = isProduction ? PRODUCTION_URL : LOCAL_URL;

console.log('=== 🌍 CONFIGURACIÓN DE ENTORNO ===');
console.log('URL Actual:', CURRENT_URL);
console.log('Es producción:', isProduction);
console.log('====================================');

// Trust proxy para Render
if (isProduction) {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy habilitado para producción');
}

// Middleware
app.use(express.json());

// CORS configurado
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://cse341-project3-11r5.onrender.com',
      'http://localhost:8080',
      'http://localhost:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS bloqueado para origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Origin', 'Accept'],
  exposedHeaders: ['Set-Cookie']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Session configuration CON MONGOSTORE - SOLUCIÓN DEFINITIVA
app.use(session({
  secret: process.env.SESSION_SECRET || 'cse341-books-api-development-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 24 horas
  }),
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isProduction ? 'none' : 'lax'
  },
  proxy: isProduction
}));

console.log('✅ Configuración de sesión con MongoDB Store inicializada');

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

const User = require('./models/user');

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || `${CURRENT_URL}/auth/github/callback`,
  scope: ['user:email'],
  proxy: isProduction
},
async function(accessToken, refreshToken, profile, done) {
  try {
    console.log('=== 🔐 CALLBACK GITHUB EJECUTADO ===');
    
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      console.log('✅ Usuario encontrado por GitHub ID:', user.username);
      return done(null, user);
    }

    let userEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    
    if (!userEmail) {
      userEmail = `${profile.username}@users.noreply.github.com`;
    }

    if (userEmail) {
      user = await User.findOne({ email: userEmail });
      
      if (user) {
        console.log('✅ Usuario encontrado por email:', user.username);
        user.githubId = profile.id;
        await user.save();
        return done(null, user);
      }
    }

    const newUser = new User({
      githubId: profile.id,
      username: profile.username,
      email: userEmail,
      displayName: profile.displayName || profile.username,
      profileUrl: profile.profileUrl
    });

    await newUser.save();
    console.log('✅ Nuevo usuario creado:', newUser.username);
    return done(null, newUser);
  } catch (error) {
    console.error('❌ Error en estrategia GitHub:', error);
    return done(error, null);
  }
}));

// Passport serialization
passport.serializeUser((user, done) => {
  console.log('💾 Serializando usuario:', user.username);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('📂 Deserializando usuario ID:', id);
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware para logs
app.use((req, res, next) => {
  console.log(`\n=== 📨 ${req.method} ${req.url} ===`);
  console.log('   Origin:', req.headers.origin || 'No origin');
  console.log('   Session ID:', req.sessionID);
  console.log('   Authenticated:', req.isAuthenticated());
  console.log('   Cookies:', req.headers.cookie ? 'Present' : 'Missing');
  console.log('   User:', req.user ? req.user.username : 'No user');
  next();
});

// Favicon handlers
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon-32x32.png', (req, res) => res.status(204).end());

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
      authenticated: true
    });
  } else {
    res.json({
      message: 'Welcome to Books & Authors API!',
      loginUrl: '/auth/github',
      apiDocs: '/api-docs',
      authenticated: false
    });
  }
});

app.get('/login', (req, res) => {
  res.redirect('/auth/github');
});

// Auth routes
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { 
    failureRedirect: '/?error=auth_failed'
  }),
  (req, res) => {
    console.log('=== ✅ LOGIN EXITOSO - Redirigiendo ===');
    console.log('   User:', req.user.username);
    console.log('   Session ID:', req.sessionID);
    
    // Forzar guardado de sesión
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error guardando sesión:', err);
      } else {
        console.log('✅ Sesión guardada en MongoDB');
      }
      res.redirect('/api-docs');
    });
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
    req.session.destroy((err) => {
      res.redirect('/');
    });
  });
});

// Ruta de diagnóstico MEJORADA
app.get('/auth/debug', (req, res) => {
  console.log('=== 🐛 DIAGNÓSTICO SESIÓN ===');
  console.log('   Session ID:', req.sessionID);
  console.log('   Authenticated:', req.isAuthenticated());
  console.log('   User:', req.user);
  console.log('   Cookies recibidas:', req.headers.cookie || 'None');
  
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user,
    sessionId: req.sessionID,
    cookiesReceived: req.headers.cookie || 'None',
    environment: isProduction ? 'production' : 'development',
    sessionStore: 'MongoDB' // Confirmar que estamos usando MongoDB
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    authenticated: req.isAuthenticated(),
    sessionId: req.sessionID,
    sessionStore: 'MongoDB'
  });
});

// Import and apply routes
const bookRoutes = require('./routes/books');
const authorRoutes = require('./routes/authors');
app.use('/books', bookRoutes);
app.use('/authors', authorRoutes);

// Swagger
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    console.log('   Base de datos:', mongoose.connection.db?.databaseName);
  })
  .catch(err => console.error('❌ Error MongoDB:', err));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('\n=== 🚀 SERVIDOR INICIADO CON MONGODB STORE ===');
  console.log('   URL:', CURRENT_URL);
  console.log('   Login:', `${CURRENT_URL}/login`);
  console.log('   Diagnóstico:', `${CURRENT_URL}/auth/debug`);
  console.log('   Session Store: MongoDB (Solución definitiva)');
  console.log('================================\n');
});

module.exports = app;