const router = require('express').Router();

router.get('/signin', (req, res) => {
    res.render('users/signin');
});

router.get('/login', (req, res) => {
    res.render('users/login');
});

module.exports = router;
