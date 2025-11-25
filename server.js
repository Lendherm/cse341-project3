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

// VERIFICACIÓN DE VARIABLES DE ENTORNO
console.log('=== 🔑 VERIFICACIÓN DE CLAVES ===');
console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('GITHUB_CALLBACK_URL:', process.env.GITHUB_CALLBACK_URL || '⚠️  Usando valor por defecto');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ PRESENTE' : '⚠️  Usando valor por defecto');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('==================================');

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

// CORS configurado para ambos entornos
const corsOptions = {
  origin: [LOCAL_URL, PRODUCTION_URL],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'cse341-books-api-development-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isProduction ? 'none' : 'lax'
  },
  proxy: isProduction
}));

console.log('✅ Configuración de sesión inicializada');

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
console.log('✅ Passport inicializado');

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
    console.log('=== 🔐 INICIO AUTENTICACIÓN GITHUB ===');
    console.log('📨 Perfil de GitHub recibido:');
    console.log('   ID:', profile.id);
    console.log('   Usuario:', profile.username);
    console.log('   Nombre:', profile.displayName);
    console.log('   Emails:', profile.emails ? '✅ Presentes' : '❌ No disponibles');
    
    // Buscar usuario por GitHub ID
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      console.log('✅ Usuario encontrado por GitHub ID:', user.username);
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
    const newUser = new User({
      githubId: profile.id,
      username: profile.username,
      email: userEmail,
      displayName: profile.displayName || profile.username,
      profileUrl: profile.profileUrl
    });

    await newUser.save();
    console.log('✅ Nuevo usuario creado:', newUser.username);
    console.log('=== 🔐 AUTENTICACIÓN GITHUB COMPLETADA ===');
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

// Middleware de autenticación mejorado
const isAuthenticated = (req, res, next) => {
  console.log('=== 🔍 VERIFICANDO AUTENTICACIÓN ===');
  console.log('   Ruta:', req.path);
  console.log('   Session ID:', req.sessionID);
  console.log('   Autenticado:', req.isAuthenticated());
  console.log('   Usuario:', req.user ? req.user.username : 'No autenticado');
  
  if (req.isAuthenticated()) {
    console.log('✅ ACCESO PERMITIDO - Usuario autenticado');
    return next();
  }
  
  console.log('❌ ACCESO DENEGADO - Usuario no autenticado');
  res.status(401).json({ 
    message: 'Por favor inicia sesión para acceder a este recurso',
    loginUrl: '/auth/github'
  });
};

// Routes
app.get('/', (req, res) => {
  console.log('=== 🏠 PÁGINA PRINCIPAL ===');
  console.log('   Autenticado:', req.isAuthenticated());
  console.log('   Usuario:', req.user ? req.user.username : 'No autenticado');
  
  if (req.isAuthenticated()) {
    res.json({
      message: `Bienvenido ${req.user.displayName}!`,
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
      message: '¡Bienvenido a Books & Authors API!',
      loginUrl: '/auth/github',
      apiDocs: '/api-docs',
      authenticated: false
    });
  }
});

// Redirect /login to /auth/github
app.get('/login', (req, res) => {
  console.log('=== 🔑 SOLICITUD DE LOGIN ===');
  console.log('   Redirigiendo a GitHub OAuth');
  res.redirect('/auth/github');
});

// Auth routes
app.get('/auth/github',
  (req, res, next) => {
    console.log('=== 🔐 INICIANDO OAUTH GITHUB ===');
    console.log('   Client ID:', process.env.GITHUB_CLIENT_ID ? '✅ Configurado' : '❌ Faltante');
    console.log('   Callback URL:', process.env.GITHUB_CALLBACK_URL || `${CURRENT_URL}/auth/github/callback`);
    next();
  },
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  (req, res, next) => {
    console.log('=== 🔄 CALLBACK GITHUB RECIBIDO ===');
    console.log('   Código recibido:', req.query.code ? '✅ Sí' : '❌ No');
    console.log('   Error:', req.query.error || 'Ninguno');
    next();
  },
  passport.authenticate('github', { 
    failureRedirect: '/?error=auth_failed',
    failureMessage: true 
  }),
  (req, res) => {
    console.log('=== ✅ LOGIN EXITOSO ===');
    console.log('   Usuario:', req.user.username);
    console.log('   ID:', req.user._id);
    console.log('   Redirigiendo a /api-docs');
    res.redirect('/api-docs');
  }
);

app.get('/auth/logout', (req, res) => {
  console.log('=== 🚪 SOLICITUD DE LOGOUT ===');
  console.log('   Usuario antes de logout:', req.user ? req.user.username : 'No autenticado');
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Error en logout:', err);
      return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
    console.log('✅ Logout exitoso');
    res.redirect('/');
  });
});

app.get('/auth/current', (req, res) => {
  console.log('=== 👤 SOLICITUD DE USUARIO ACTUAL ===');
  console.log('   Autenticado:', req.isAuthenticated());
  console.log('   Usuario:', req.user ? req.user.username : 'No autenticado');
  
  if (req.isAuthenticated()) {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.displayName
      },
      authenticated: true
    });
  } else {
    res.status(401).json({ 
      message: 'No autenticado',
      authenticated: false 
    });
  }
});

// Ruta de diagnóstico
app.get('/auth/debug', (req, res) => {
  console.log('=== 🐛 DIAGNÓSTICO COMPLETO ===');
  console.log('   Session ID:', req.sessionID);
  console.log('   Autenticado:', req.isAuthenticated());
  console.log('   Usuario:', req.user);
  console.log('   Session:', req.session);
  
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
      currentUrl: CURRENT_URL
    }
  });
});

// Import routes
const bookRoutes = require('./routes/books');
const authorRoutes = require('./routes/authors');

// Aplicar autenticación a rutas protegidas
app.use('/books', bookRoutes);
app.use('/authors', authorRoutes);

// Swagger documentation
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('=== ✅ MONGODB CONECTADO ===');
    console.log('   Base de datos:', mongoose.connection.db?.databaseName);
  })
  .catch(err => {
    console.error('=== ❌ ERROR MONGODB ===');
    console.error('   Error:', err.message);
  });

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('\n=== 🚀 SERVIDOR INICIADO ===');
  console.log('   Puerto:', PORT);
  console.log('   Entorno:', isProduction ? 'Producción' : 'Desarrollo');
  console.log('   URL:', CURRENT_URL);
  console.log('   Login:', `${CURRENT_URL}/login`);
  console.log('   Diagnóstico:', `${CURRENT_URL}/auth/debug`);
  console.log('=============================\n');
});

module.exports = app;