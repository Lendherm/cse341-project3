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

// VERIFICACIÓN DE VARIABLES DE ENTORNO AL INICIAR
console.log('=== 🔑 VERIFICACIÓN DE CLAVES EN RENDER ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? `✅ PRESENTE (${process.env.GITHUB_CLIENT_ID.substring(0, 10)}...)` : '❌ FALTANTE');
console.log('GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('GITHUB_CALLBACK_URL:', process.env.GITHUB_CALLBACK_URL || '⚠️  Usando valor por defecto');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ PRESENTE' : '⚠️  Usando valor por defecto');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('PORT:', process.env.PORT);
console.log('==========================================');

// Configuración dinámica para múltiples entornos
const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_URL = 'http://localhost:8080';
const PRODUCTION_URL = 'https://cse341-project3-11r5.onrender.com';
const CURRENT_URL = isProduction ? PRODUCTION_URL : LOCAL_URL;

console.log('=== 🌍 CONFIGURACIÓN DE ENTORNO ===');
console.log('URL Actual:', CURRENT_URL);
console.log('Es producción:', isProduction);
console.log('====================================');

// Trust proxy para Render - CRÍTICO
if (isProduction) {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy habilitado para producción (ESENCIAL PARA RENDER)');
}

// Middleware
app.use(express.json());

// CORS configurado para ambos entornos
const corsOptions = {
  origin: [LOCAL_URL, PRODUCTION_URL],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Session configuration MEJORADA
app.use(session({
  secret: process.env.SESSION_SECRET || 'cse341-books-api-development-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isProduction ? 'none' : 'lax', // CRÍTICO para OAuth en producción
    domain: isProduction ? '.onrender.com' : undefined
  },
  proxy: isProduction
}));

console.log('✅ Configuración de sesión inicializada');

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
console.log('✅ Passport inicializado');

const User = require('./models/user');

// GitHub OAuth Strategy - CON MÁS LOGS
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
    console.log('📨 Perfil de GitHub recibido:');
    console.log('   ID:', profile.id);
    console.log('   Usuario:', profile.username);
    console.log('   Nombre:', profile.displayName);
    console.log('   Emails:', profile.emails ? `✅ ${profile.emails[0]?.value}` : '❌ No disponibles');
    
    if (!profile.emails) {
      console.log('⚠️  ADVERTENCIA: GitHub no devolvió emails. El usuario puede tener email privado.');
    }

    // Buscar usuario por GitHub ID
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      console.log('✅ Usuario encontrado por GitHub ID:', user.username);
      console.log('   User ID en DB:', user._id);
      return done(null, user);
    }

    // Manejar email
    let userEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    
    if (!userEmail) {
      userEmail = `${profile.username}@users.noreply.github.com`;
      console.log('📧 Email no disponible, usando:', userEmail);
    }

    // Buscar usuario por email
    if (userEmail) {
      user = await User.findOne({ email: userEmail });
      
      if (user) {
        console.log('✅ Usuario encontrado por email, vinculando cuenta GitHub:', user.username);
        user.githubId = profile.id;
        await user.save();
        return done(null, user);
      }
    }

    // Crear nuevo usuario
    console.log('🆕 Creando nuevo usuario en la base de datos...');
    const newUser = new User({
      githubId: profile.id,
      username: profile.username,
      email: userEmail,
      displayName: profile.displayName || profile.username,
      profileUrl: profile.profileUrl
    });

    await newUser.save();
    console.log('✅ Nuevo usuario creado:', newUser.username);
    console.log('   Nuevo User ID:', newUser._id);
    console.log('=== 🔐 AUTENTICACIÓN GITHUB COMPLETADA ===');
    return done(null, newUser);
  } catch (error) {
    console.error('❌ ERROR CRÍTICO en estrategia GitHub:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    return done(error, null);
  }
}));

// Passport serialization
passport.serializeUser((user, done) => {
  console.log('💾 Serializando usuario:', user.username, 'ID:', user._id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('📂 Deserializando usuario ID:', id);
    const user = await User.findById(id);
    if (user) {
      console.log('✅ Usuario deserializado:', user.username);
    } else {
      console.log('❌ Usuario no encontrado para ID:', id);
    }
    done(null, user);
  } catch (error) {
    console.error('❌ Error deserializando usuario:', error);
    done(error, null);
  }
});

// Middleware para logs de cada request
app.use((req, res, next) => {
  console.log(`\n=== 📨 REQUEST: ${req.method} ${req.url} ===`);
  console.log('   Time:', new Date().toISOString());
  console.log('   Origin:', req.headers.origin);
  console.log('   User-Agent:', req.headers['user-agent']?.substring(0, 50));
  console.log('   Session ID:', req.sessionID);
  console.log('   Authenticated:', req.isAuthenticated());
  next();
});

// Manejo mejorado de favicon - ELIMINA ERRORES 404
app.get('/favicon.ico', (req, res) => {
  console.log('🖼️  Favicon request - enviando 204 No Content');
  res.status(204).end();
});

app.get('/favicon-32x32.png', (req, res) => {
  console.log('🖼️  Favicon PNG request - enviando 204 No Content');
  res.status(204).end();
});

// Routes
app.get('/', (req, res) => {
  console.log('🏠 Home page accessed');
  console.log('   Authenticated:', req.isAuthenticated());
  console.log('   User:', req.user ? req.user.username : 'No user');
  
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

// Redirect /login to /auth/github
app.get('/login', (req, res) => {
  console.log('🔑 Login route - redirecting to GitHub OAuth');
  console.log('   Session ID:', req.sessionID);
  res.redirect('/auth/github');
});

// Auth routes CON MÁS LOGS
app.get('/auth/github',
  (req, res, next) => {
    console.log('=== 🔐 INICIANDO OAUTH GITHUB ===');
    console.log('   Client ID configurado:', !!process.env.GITHUB_CLIENT_ID);
    console.log('   Callback URL:', process.env.GITHUB_CALLBACK_URL || `${CURRENT_URL}/auth/github/callback`);
    console.log('   Session ID:', req.sessionID);
    console.log('   Headers origin:', req.headers.origin);
    next();
  },
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  (req, res, next) => {
    console.log('=== 🔄 GITHUB CALLBACK RECIBIDO ===');
    console.log('   Query params:', req.query);
    console.log('   Code received:', !!req.query.code);
    console.log('   Error:', req.query.error || 'None');
    console.log('   Session ID:', req.sessionID);
    
    if (req.query.error) {
      console.error('❌ GitHub returned error:', req.query.error);
      console.error('   Error description:', req.query.error_description);
    }
    
    next();
  },
  passport.authenticate('github', { 
    failureRedirect: '/?error=auth_failed',
    failureMessage: true 
  }),
  (req, res) => {
    console.log('=== ✅ LOGIN EXITOSO ===');
    console.log('   User authenticated:', req.user.username);
    console.log('   User ID:', req.user._id);
    console.log('   Session ID:', req.sessionID);
    console.log('   Redirecting to /api-docs');
    res.redirect('/api-docs');
  }
);

// Ruta de diagnóstico MEJORADA
app.get('/auth/debug', (req, res) => {
  console.log('=== 🐛 DIAGNÓSTICO COMPLETO ===');
  console.log('   Session ID:', req.sessionID);
  console.log('   Authenticated:', req.isAuthenticated());
  console.log('   User:', req.user);
  console.log('   Session data:', {
    cookie: req.session.cookie,
    passport: req.session.passport
  });
  console.log('   Headers:', {
    origin: req.headers.origin,
    cookie: req.headers.cookie ? 'Present' : 'Missing'
  });
  
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user,
    session: {
      id: req.sessionID,
      cookie: req.session.cookie,
      passport: req.session.passport
    },
    environment: {
      isProduction: isProduction,
      currentUrl: CURRENT_URL,
      nodeEnv: process.env.NODE_ENV
    },
    headers: {
      origin: req.headers.origin,
      cookiePresent: !!req.headers.cookie
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    session: {
      id: req.sessionID,
      authenticated: req.isAuthenticated()
    }
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// MongoDB connection con mejor manejo de errores
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('=== ✅ MONGODB CONECTADO ===');
    console.log('   Database:', mongoose.connection.db?.databaseName);
    console.log('   Ready state:', mongoose.connection.readyState);
  })
  .catch(err => {
    console.error('=== ❌ ERROR DE CONEXIÓN MONGODB ===');
    console.error('   Error:', err.message);
    console.error('   MongoDB URI present:', !!process.env.MONGODB_URI);
    process.exit(1);
  });

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('\n=== 🚀 SERVIDOR INICIADO EN RENDER ===');
  console.log('   Puerto:', PORT);
  console.log('   Entorno:', isProduction ? 'PRODUCCIÓN' : 'DESARROLLO');
  console.log('   URL:', CURRENT_URL);
  console.log('   Health check:', `${CURRENT_URL}/health`);
  console.log('   Diagnóstico:', `${CURRENT_URL}/auth/debug`);
  console.log('   Login:', `${CURRENT_URL}/login`);
  console.log('========================================\n');
});

module.exports = app;