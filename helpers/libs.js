const helpers = {};

helpers.randomString = () => {
    const possible = 'abcdefghijkmnlopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomChar = 0;
    for (let i = 0; i < 15; i++){
        randomChar += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return randomChar;
};

module.exports = helpers;