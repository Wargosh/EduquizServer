const router = require('express').Router();
const Player = require('../models/Player');
const Friend = require('../models/Friend');
const passport = require('passport');
const shortid = require('shortid'); // genera ids aleatorios cortos
const helpers = require('../helpers');

// Mostrar vista de registrar una cuenta
router.get('/signin', (req, res) => {
    res.render('users/signin');
});

// Registrar una cuenta de usuario
router.post('/signin', async (req, res) => {
    const { _username, _email, _password, _passwordC } = req.body;
    const errors = [];
    if (_username.length <= 0 || _email.length <= 0 || _password.length <= 0 || _passwordC.length <= 0) {
        errors.push({ text: 'Todos los campos de entrada son obligatorios.' });
    }
    if (_password !== _passwordC) {
        errors.push({ text: 'Las claves no coinciden.' });
    } else if (_password.length < 5) {
        errors.push({ text: 'La contrase;a debe tener almenos 5 caracteres.' })
    }
    if (errors.length > 0) {
        res.render('users/signin', { errors, _username, _email, _password });
    } else {
        const userAux = await Player.findOne({ email: _email });
        console.log('ver match');
        if (userAux) {
            errors.push({ text: 'Este correo electronico ya se encuentra registrado.' })
            res.render('users/signin', { errors, _username, _email, _password });
            console.log('ya existente' + userAux);
        } else {
            const newPlayer = new Player({ username: _username, email: _email.toLowerCase(), password: _password });
            newPlayer.password = await newPlayer.encryptPassword(_password);
            await newPlayer.save();

            req.flash('success_msg', 'Cuenta creada exitosamente.');
            res.redirect('/login');
        }
    }
});

// Mostrar vista de logueo
router.get('/login', (req, res) => {
    res.render('users/login');
});

// Validar inicio de sesion de la cuenta
router.post('/login', passport.authenticate('local', {
    successRedirect: '/questions/my-questions',
    failureRedirect: '/login',
    failureFlash: true
}));

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

router.post('/singup/game', async (req, res) => {
    console.log(req.body);
    const { _username, _email, _password, _image, _method } = req.body;

    if (_password.length == 0) {
        // si no tiene contrase;a genera una aleatoria
        let newPassword = shortid.generate();
        _password = newPassword;
    }
    const errors = [];
    const userAux = await Player.findOne({ email: _email });
    if (userAux) {
        if (_method == "Google") {
            res.json(userAux);
        } else {
            errors.push({ text: 'Este correo electronico ya se encuentra registrado.' })
            res.json({ errors });
            console.log('ya existente' + userAux);
        }
    } else {
        const newPlayer = new Player({ username: _username, image: _image, email: _email.toLowerCase(), password: _password });
        newPlayer.password = await newPlayer.encryptPassword(_password);
        await newPlayer.save();

        res.json(newPlayer);
    }
});

router.post('/login/game', async (req, res) => {
    console.log(req.body);
    const { _email, _password } = req.body;
    const player = await Player.findOne({ email: _email });
    if (player) {
        const match = await player.matchPassword(_password);
        if (match) {
            res.json(player);
        } else {
            res.send({ message: 'Email o clave incorrecta.' });
        }
    } else {
        res.send({ message: 'Email o clave incorrecta.' });
    }
});

// Listar Ranking jugadores
router.get('/players/ranking', async (req, res) => {
    const players = await Player.find({ status_account: 'active', _hits: { $gt: 0 } }, (err, docs) => {
        if (err)
            console.log('Error in retrieving ranking list :' + err);
    }).sort({ _hits: 'desc' }).limit(30).lean(); // It is prevent the warning when trying to display records

    if (players) {
        res.json({ players: players });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener las preguntas' });
    }
});

// informacion de perfil jugador
router.get('/player/profile/:id', async (req, res) => {
    const player = await Player.findById(req.params.id, (err, docs) => {
        if (err)
            res.send({ error: 'Ha ocurrido un error al buscar el usuario.' });
    }).lean();

    if (player) {
        // establece un string temporal que menciona el ultimo acceso del mensaje
        player.timeAgo = helpers.timeago(Date.parse(player.updatedAt));
        player.password = '';
        res.json(player);
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener las preguntas' });
    }
});

router.post('/player/search', async (req, res) => {
    const { username } = req.body;
    const players = await Player.find({ 'username': new RegExp(username, 'i') }).limit(25);
    if (players) {
        for (var i in players) { // recorre los jugadores encontrados
            // establece un string temporal que menciona el ultimo acceso del jugador
            players[i].set('timeAgo', helpers.timeago(Date.parse(players[i].updatedAt)), { strict: false });
            players[i].password = '';
        }
        res.json(players);
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener el listado de usuarios' });
    }
});

// Obtiene la lista de solicitudes de amistad
router.post('/player/all_request', async (req, res) => {
    const { id_database } = req.body;
    const friendRequests = await Friend.find({ $or: [{ user_first: id_database }, { user_second: id_database }] });
    if (friendRequests) {
        for (var i in friendRequests) { // recorre los jugadores encontrados
            // establece un string temporal que menciona el ultimo acceso del jugador
            for (var j in friendRequests[i].chat) { // recorre los jugadores encontrados
                // establece un string temporal que menciona el ultimo acceso del jugador
                friendRequests[i].chat[j].set('timeAgo', helpers.timeago(Date.parse(friendRequests[i].chat[j].created_at)), { strict: false });
            }
        }

        res.json({ friendRequests });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener el listado de todas las solicitudes' });
    }
});

// Obtiene una lista de perfiles en conjunto
router.post('/player/get_profiles', async (req, res) => {
    console.log(req.body);
    const { ids_friends } = req.body;
    var ids = ids_friends.split(",");
    const listFriends = await Player.find({ '_id': { $in: ids } }).sort({ updatedAt: 'desc' });
    if (listFriends) {
        for (var i in listFriends) { // recorre los jugadores encontrados
            // establece un string temporal que menciona el ultimo acceso del jugador
            listFriends[i].set('timeAgo', helpers.timeago(Date.parse(listFriends[i].updatedAt)), { strict: false });
            listFriends[i].password = '';
        }
        res.json({ listFriends });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener el listado de amigos' });
    }
});

module.exports = router;
