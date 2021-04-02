const router = require('express').Router();
const Question = require('../models/Question');

// vista 
router.get('/questions/add', (req, res) => {
    res.render('questions/new-question');
});

// accion
router.post('/questions/new-question', async (req, res) => {
    console.log(req.body); // BORRAR ESTO LUEGO
    const { _question, _option1, _option2, _option3, _option4 } = req.body;
    const errors = [];

    if (!_question) {
        errors.push({ text: 'Escriba una pregunta.' });
    }
    if (!_option1 || !_option2 || !_option3 || !_option4) {
        errors.push({ text: 'Hace falta escribir las 4 opciones.' });
    }
    if (errors.length > 0) {
        res.render('questions/new-question', {
            errors, _question, _option1, _option2, _option3, _option4
        });
    } else {
        const question = _question;

        const options = [];

        var option1 = {
            option: _option1, status: true
        };
        var option2 = {
            option: _option2, status: false
        };
        var option3 = {
            option: _option3, status: false
        };
        var option4 = {
            option: _option4, status: false
        };

        options.push(option1);
        options.push(option2);
        options.push(option3);
        options.push(option4);

        const newQuestion = new Question({ question, options });
        console.log(newQuestion);

        await newQuestion.save();

        res.redirect('/questions');
    }
});

router.get('/questions', async (req, res) => {
    await Question.find().then(documentos => {
        const contexto = {
            questions: documentos.map(documento => {
                return {
                    question: documento.question,
                    //options: [documento.options.option, documento.options.status]
                    options: documento.options,
                    options2: documento.options[0],
                }
            })
        }
        console.log(contexto.questions);
        res.render('questions/all-questions', {
            questions: contexto.questions
        })
    });

    //res.send('algo anda mal...');
});

router.get('/create_question', (req, res) => {
    res.send('Iniciar Sesion');
});

module.exports = router;
