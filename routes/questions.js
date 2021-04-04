const router = require('express').Router();
const Question = require('../models/Question');
const helpers = require('../helpers');

// vista 
router.get('/questions/add', (req, res) => {
    res.render('questions/new-question');
});

// accion
router.post('/questions/new-question', async (req, res) => {
    const { _question, _option1, _option2, _option3, _option4, _category } = req.body;
    const errors = [];
    const category = _category;
    if (_category == 'Elegir categoría') {
        errors.push({ text: 'Selecciona una categoría.' });
    }

    if (!_question) {
        errors.push({ text: 'Escriba una pregunta.' });
    }
    if (!_option1 || !_option2 || !_option3 || !_option4) {
        errors.push({ text: 'Hace falta escribir las 4 opciones.' });
    }
    if (errors.length > 0) {
        res.render('questions/new-question', {
            errors, _question, _option1, _option2, _option3, _option4, _category
        });
    } else {
        const question = _question;

        const options = [];
        let checkedValue = req.body['_statusOp2'];
        let op2Status = false;
        if (checkedValue != undefined) {
            op2Status = true;
        }

        var option1 = {
            option: _option1, status: true
        };
        var option2 = {
            option: _option2, status: op2Status
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

        const newQuestion = new Question({ question, category, options });
        console.log(newQuestion);

        await newQuestion.save();

        req.flash('success_msg', 'Se ha almacenado exitosamente tu pregunta.');
        res.redirect('/questions');
    }
});

router.get('/questions', async (req, res) => {
    const questions = await Question.find((err, docs) => {
        if (err)
            console.log('Error in retrieving employee list :' + err);
    }).sort({ updated_at: 'desc' }).lean(); // It is prevent the warning when trying to display records

    // agregar el tiempo de registro (ultima modificacion)
    if (questions) {
        for (var i in questions) { // recorre los jugadores encontrados
            // establece un string temporal que menciona el ultimo acceso del mensaje
            questions[i].timeAgo = helpers.timeago(Date.parse(questions[i].updated_at));
        }
        res.render("questions/all-questions", {
            questions: questions,
        });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener las preguntas' });
    }
});

router.get('/questions/view-question/:id', async (req, res) => {
    const question = await Question.findById(req.params.id, (err, docs) => {
        if (err)
            console.log('Error in retrieving employee list :' + err);
    }).lean(); // It is prevent the warning when trying to display records

    // agregar el tiempo de registro (ultima modificacion)
    if (question) {
        // establece un string temporal que menciona el ultimo acceso del mensaje
        question.timeAgo = helpers.timeago(Date.parse(question.updated_at));
        res.render("questions/view-question", {
            questions: question
        });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener informacion de la pregunta' });
    }
});

router.put('/questions/update-question/:id', async (req, res) => {
    const { _question, _option1, _option2, _option3, _option4, _category } = req.body;

    let checkedValue = req.body['_statusOp2'];
    let op2Status = false;
    if (checkedValue != undefined) {
        op2Status = true;
    }

    await Question.findByIdAndUpdate(req.params.id, {
        question: _question,
        options: [{ option: _option1, status: true },
        { option: _option2, status: op2Status },
        { option: _option3, status: false },
        { option: _option4, status: false }],
        category: _category,
        updated_at: Date.now()
    });

    req.flash('success_msg', 'Se ha actualizado la pregunta con exito.');
    res.redirect('/questions');
});

router.delete('/questions/remove-question/:id', async (req, res) => {
    await Question.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Se ha eliminado la pregunta correctamente.');
    res.redirect('/questions');
});

router.get('/create_question', (req, res) => {
    res.send('Iniciar Sesion');
});

module.exports = router;
