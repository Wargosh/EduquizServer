// para ejecutar el modo developer usar: npm run dev

const path = require('path');
const express = require('express');
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');
const session = require('express-session');
const shortid = require('shortid'); // genera ids aleatorios cortos
const multer = require('multer');
const flash = require('connect-flash');
const passport = require('passport');

// Inicializaciones
const app = express();
require('./config/passport');

// config
app.set('port', process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.engine(
  ".hbs",
  exphbs({
    defaultLayout: "main",
    layoutsDir: path.join(app.get("views"), "layouts"),
    partialsDir: path.join(app.get("views"), "partials"),
    helpers: require('./helpers'),
    extname: ".hbs",
  })
);
app.set('view engine', '.hbs');

// Middlewares 
app.use(multer({ dest: path.join(__dirname, '/public/upload/temp') }).single('image'));
app.use(express.urlencoded({ extended: false })); // no aceptar imagenes
app.use(methodOverride('_method')); // permite usar otros metodos como PUT o DELETE ademas de GET y POST
app.use(session({
  secret: 'mysecreteduquiz',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Variables globales
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg'); // errores recopilados generales
  res.locals.error = req.flash('error'); // muestra los errores que se pueden producir con passport durante la autenticacion
  res.locals.user_p = null;
  try {
    if (req.user !== undefined) {
      res.locals.user_p = req.user.toJSON();
    }
  } catch (error) {
    console.log('error no se pudo obtener req.user: ' + error);
  }
  //res.locals.user = req.user || null;

  next();
});

// Rutas
app.use(require('./routes/home'));
app.use(require('./routes/players'));
app.use(require('./routes/questions'));

// config de archivos estaticos (como los html)
app.use(express.static(path.join(__dirname, 'public')));

// Conectar a BD
require('./database');

// iniciar servidor
const server = app.listen(app.get('port'), () => {
  console.log('Server on port: ', app.get('port'));
});

// socketIO necesita un servidor ya inicializado
const SocketIO = require('socket.io');
const io = SocketIO(server, {
  perMessageDeflate: false,
  serveClient: true,
  reconnection: false,
  reconnectionDelay: 3000,
  reconnectionAttempts: 20,
  //forceNew: false,
  cookie: false
});

// config socketIO
const Question = require('./models/Question');
const Player = require('./models/Player');

// Variables globales SOCKET.IO
var players = [];

// websockets
io.on('connection', (socket) => {
  const thisPlayerId = shortid.generate();
  //const thisPlayerId = socket.id;
  console.log('new connection. ID Socket:' + socket.id + " ID: " + thisPlayerId);

  var player = {
    id: thisPlayerId,
    username: "none",
    roomGame: ""
  }

  players[thisPlayerId] = player;

  socket.emit('connectionEstabilished', { id: thisPlayerId });

  // el jugador acaba de iniciar sesion
  socket.on('player:online', async function (data) {
    const p = await Player.findById(data.id_database);
    if (p) {
      p.status_player = "online";
      await p.save();
    }
    players[thisPlayerId].username = data.username;
    socket.join(data.username); // unirse a esta sala oyente de notificaciones personales

    socket.broadcast.emit('player:online', { id: thisPlayerId, user: data.username });
  });

  // almacenar en tiempo real los estados de las partidas jugadas
  socket.on('player:status_hits', async function (data) {
    const p = await Player.findById(data.id_database);
    if (p) {
      switch (data.status_hits) {
        case "hit":
          p._hits++;
          break;
        case "fail":
          p._fails++;
          break;
      }
      p.updated_at = Date.now();
      await p.save();
    }
  });

  socket.on('questions:get', async function () {
    //const questions = await Question.find();
    // Preguntas aleatorias
    const questions = await Question.aggregate([
      { $match: { status: 'active' } }, // filtrar los resultados
      { $sample: { size: 7 } } // Cantidad de documentos
    ]);

    console.log('buscando preguntas');
    io.emit('questions:get', { questions });
  });

  socket.on('click', function () {
    io.emit('click', { data: 'click' });
  });

  socket.on('disconnect', function () {
    console.log('user disconnected');
  });

  // Cuando un jugador se desconecta
  socket.on('disconnect', async function () {
    // almacenar el estado de desconectado al jugador
    await Player.findOneAndUpdate({ username: players[thisPlayerId].username }, { status_player: "offline" });
    delete players[thisPlayerId];
    console.log("player disconnected");
  });
});
