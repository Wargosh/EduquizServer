// para ejecutar el modo developer usar: npm run dev

const path = require('path');
const express = require('express');
const app = express();
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');
const session = require('express-session');



// config
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    layoutsDir: path.join(app.get('views'), 'layouts'),
    partialsDir:path.join(app.get('views'), 'partials'),
    extname: '.hbs'
}));
app.set('view engine', '.hbs');

// Middlewares 
app.use(express.urlencoded({extended: false})); // no aceptar imagenes
app.use(methodOverride('_method')); // permite usar otros metodos como PUT o DELETE ademas de GET y POST
app.use(session({
    secret: 'mysecreteduquiz',
    resave: true,
    saveUninitialized: true
}));

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
const io = SocketIO(server);

// websockets
io.on('connection', (socket) => {
    console.log('New connection', socket.id);
});
