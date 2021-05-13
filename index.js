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
const Friend = require('./models/Friend');
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
    socket.join(p._id); // unirse a esta sala oyente de notificaciones personales

    socket.broadcast.emit('player:online', { id: thisPlayerId, idDB: p._id, user: data.username });
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
      await p.save();
    }
  });

  // almacenar la experiencia, nivel actualizado y monedas
  socket.on('player:status_level', async function (data) {
    await Player.findByIdAndUpdate(data.id_database, { _xp: data._XP, _level: data._level, _coins: data._coins });
    console.log("XP y nivel actualizado de: " + players[thisPlayerId].username);
  });

  /* ***************** Amigos y Solicitudes ***************** */

  // almacecna la solicitud de amistad e informa al jugador dirigido
  socket.on('player:save_friend_request', async function (data) {
    const newFriend = new Friend();
    newFriend.user_first = data.user_first;
    newFriend.user_second = data.user_second;
    newFriend.status = 0; // solicitud
    const str1 = shortid.generate();
    const str2 = shortid.generate();
    newFriend.private_room = str1 + str2;

    await newFriend.save();

    socket.join(data.user_second); // entrar a la sala privada de notificaciones del jugador
    io.to(data.user_second).emit('player:notify_request', { user_request: data.user_first });
    socket.leave(data.user_second); // salir de la sala una vez que se ha enviado la solicitud
  });

  // almacecena la amistad e informa al jugador dirigido
  socket.on('player:save_friend', async function (data) {
    const fr = await Friend.findById(data.id_request);
    if (fr) {
      fr.status = 1; // amigo
      await fr.save();

      socket.join(fr.user_first); // entrar a la sala privada de notificaciones del jugador
      io.to(fr.user_first).emit('player:notify_new_friend', { user_friend: data.user_friend });
      socket.leave(fr.user_first); // salir de la sala una vez que se ha enviado la solicitud
    }
  });

  // almacecena la amistad e informa al jugador dirigido
  socket.on('player:remove_friendship', async function (data) {
    const fr = await Friend.findById(data.id_request);
    if (fr) {
      fr.remove();
      socket.join(data.id_removed); // entrar a la sala privada de notificaciones del jugador
      io.to(data.id_removed).emit('player:notify_remove_friend');
      socket.leave(data.id_removed); // salir de la sala una vez que se ha enviado la solicitud
    } else
      console.log("Ha ocurrido un error al intentar borrar la solicitud.");
  });

  /* ***************** Desconexión del jugador ***************** */

  // Cuando un jugador se desconecta
  socket.on('disconnect', async function () {
    // almacenar el estado de desconectado al jugador
    const p = await Player.findOneAndUpdate({ username: players[thisPlayerId].username }, { status_player: "offline" });
    delete players[thisPlayerId];
    socket.leave(p._id); // salir de la sala
    socket.broadcast.emit('disconnected', { id: thisPlayerId, idDB: p._id, user: p.username });
    console.log("player disconnected");
  });
});
