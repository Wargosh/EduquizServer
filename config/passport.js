const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const Player = require('../models/Player');

passport.use(new LocalStrategy({
    usernameField: 'email'
}, async (email, password, done) => {
    const player = await Player.findOne({ email: email });
    if (!player) {
        return done(null, false, { message: 'El Usuario o la clave son incorrectos.' });
    } else {
        const match = await player.matchPassword(password);
        if (match) {
            return done(null, player);
        } else {
            return done(null, false, { message: 'El Usuario o la clave son incorrectos.' });
        }
    }
}));

passport.serializeUser((player, done) => {
    done(null, player.id);
});

passport.deserializeUser((id, done) => {
    Player.findById(id, (err, player) => {
        done(err, player);
    });
});