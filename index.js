// para ejecutar el modo developer usar: npm run dev

const express = require('express');
const app = express();

// config
app.set('port', process.env.PORT || 3000);

// iniciar servidor
app.listen(app.get('port'), () => {
    console.log('Server on port: ', app.get('port'));
});
