const router = require('express').Router();

router.get('/myquestions', (req, res) => {
    res.send('Registrarse');
});

router.get('/create_question', (req, res) => {
    res.send('Iniciar Sesion');
});

module.exports = router;
