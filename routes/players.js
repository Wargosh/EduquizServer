const router = require('express').Router();

router.get('/signin', (req, res) => {
    res.send('Registrarse');
});

router.get('/login', (req, res) => {
    res.send('Iniciar Sesion');
});

module.exports = router;
