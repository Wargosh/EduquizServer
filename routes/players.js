const router = require('express').Router();
const Player = require('../models/Player');
const passport = require('passport');

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

module.exports = router;
