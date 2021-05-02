const router = require('express').Router();
const Question = require('../models/Question');
const helpers = require('../helpers');
const fs = require('fs-extra');
const path = require('path');
const { randomString } = require('../helpers/libs');
const { isAuthenticated } = require('../helpers/auth');

// Para subir archivos a AWS S3
const AWS = require('aws-sdk');
const fs_aws = require('fs');

// configurar AWS con las claves de acceso
const s3 = new AWS.S3({
    accessKeyId: "AKIAQQDX6GYZQJGCARVH",
    secretAccessKey: "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",
    region: 'us-east-2'
});

// Listar TODAS preguntas
router.get('/questions', async (req, res) => {
    const questions = await Question.find((err, docs) => {
        if (err)
            console.log('Error in retrieving employee list :' + err);
    }).sort({ updatedAt: 'desc' }).lean(); // It is prevent the warning when trying to display records


    // agregar el tiempo de registro (ultima modificacion)
    if (questions) {
        for (var i in questions) { // recorre los jugadores encontrados
            // establece un string temporal que menciona el ultimo acceso del mensaje
            questions[i].timeAgo = helpers.timeago(Date.parse(questions[i].updatedAt));
            questions[i]._id = ""; // evita enviar el id a usuarios anonimos
        }
        console.log(questions);
        res.render("questions/all-questions", {
            questions: questions,
        });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener las preguntas' });
    }
});

router.get('/getRandomQuestions', async (req, res) => {
    const questions = await Question.aggregate([
        { $match: { status: 'active' } }, // filtrar los resultados
        { $sample: { size: 7 } } // Cantidad de documentos
    ]);

    res.render("questions/my-questions", {
        questions: questions
    });
    //res.send({ questions: questions });
});

// Listar mis preguntas
router.get('/questions/my-questions', isAuthenticated, async (req, res) => {
    const questions = await Question.find({ user: req.user.id }, (err, docs) => {
        if (err)
            console.log('Error in retrieving employee list :' + err);
    }).sort({ updatedAt: 'desc' }).lean(); // It is prevent the warning when trying to display records

    // agregar el tiempo de registro (ultima modificacion)
    if (questions) {
        for (var i in questions) { // recorre los jugadores encontrados
            // establece un string temporal que menciona el ultimo acceso del mensaje
            questions[i].timeAgo = helpers.timeago(Date.parse(questions[i].updatedAt));
        }
        res.render("questions/my-questions", {
            questions: questions
        });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener las preguntas' });
    }
});

// Mostrar vista de agregar nueva pregunta
router.get('/questions/add', isAuthenticated, (req, res) => {
    res.render('questions/new-question');
});

// Agregar nueva pregunta
router.post('/questions/new-question', isAuthenticated, async (req, res) => {
    let { _question, _option1, _option2, _option3, _option4, _category } = req.body;
    const errors = [];
    const category = _category;
    _question = _question.trim();
    _option1 = _option1.trim();
    _option2 = _option2.trim();
    _option3 = _option3.trim();
    _option4 = _option4.trim();
    if (_category == 'Elegir categoría')
        errors.push({ text: 'Selecciona una categoría.' });

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
        const options = [];
        const images = [];
        const question = _question;

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

        const saveImage = async () => {
            const ext = path.extname(req.file.originalname).toLowerCase();
            const imageTempPath = req.file.path; // ruta donde se encuentra el archivo

            if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
                const errors = [];
                console.log(req.file);

                // subir imagen a AWS
                var params = {
                    Bucket: 'eduquiz-s3-files',
                    Body: fs.createReadStream(imageTempPath),
                    Key: "images/questions/" + Date.now() + "_" + path.basename(imageTempPath + ext),
                    ACL: 'public-read'
                };

                s3.upload(params, async function (err, data) {
                    //handle error
                    if (err) {
                        console.log("Error", err);
                        req.flash('error_msg', 'Ha ocurrido un error al momento de subir la imagen.');
                        // Recargar misma pagina con los datos
                        res.render('questions/new-question', {
                            errors, _question, _option1, _option2, _option3, _option4, _category
                        });
                    }
                    //success
                    if (data) {
                        // guardar ruta de imagen en arreglo
                        images.push(data.Location);
                        console.log("Uploaded in:", data.Location);

                        const newQuestion = new Question({ question, images, category, options });
                        newQuestion.user = req.user.id;
                        console.log(newQuestion);
                        await newQuestion.save();

                        req.flash('success_msg', 'Se ha almacenado exitosamente tu pregunta.');
                        res.redirect('/questions/my-questions');
                    }
                });
            } else {
                //await fs.unlink(imageTempPath);
                req.flash('error_msg', 'Solo puedes subir archivos en formato .PNG .JPG.');
                // Recargar misma pagina con los datos
                res.render('questions/new-question', {
                    errors, _question, _option1, _option2, _option3, _option4, _category
                });
            }
        }
        // solo si se ha cargado una imagen desde el input file
        try {
            if (req.file.originalname !== undefined)
                saveImage();
        } catch (error) {
            console.log("PREGUNTA ENVIADA SIN SUBIR IMAGEN = " + error);

            const newQuestion = new Question({ question, images, category, options });
            newQuestion.user = req.user.id;
            console.log(newQuestion);
            await newQuestion.save();

            req.flash('success_msg', 'Se ha almacenado exitosamente tu pregunta.');
            res.redirect('/questions/my-questions');
        }
    }
});

// Mostrar vista con toda la informacion de una pregunta
router.get('/questions/view-question/:id', isAuthenticated, async (req, res) => {
    const question = await Question.findById(req.params.id, (err, docs) => {
        if (err)
            console.log('Ocurrio un error al buscar la pregunta (Update View): ' + err);
    }).lean(); // It is prevent the warning when trying to display records

    // agregar el tiempo de registro (ultima modificacion)
    if (question) {
        // establece un string temporal que menciona el ultimo acceso del mensaje
        question.timeAgo = helpers.timeago(Date.parse(question.updatedAt));
        res.render("questions/view-question", {
            questions: question
        });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener informacion de la pregunta' });
    }
});

// Actualizar informacion de una pregunta
router.put('/questions/update-question/:id', isAuthenticated, async (req, res) => {
    let { _question, _option1, _option2, _option3, _option4, _category } = req.body;
    const images = [];
    _question = _question.trim();
    _option1 = _option1.trim();
    _option2 = _option2.trim();
    _option3 = _option3.trim();
    _option4 = _option4.trim();
    let checkedValue = req.body['_statusOp2'];
    let op2Status = false;
    if (checkedValue != undefined) {
        op2Status = true;
    }

    /*const question = await Question.findById(req.params.id, (err, docs) => {
        if (err) {
            req.flash('error_msg', 'Error: No se encontro la pregunta, por favor intente de nuevo.');
            // Recargar misma pagina con los datos
            res.render('questions/view-question', {
                _question, _option1, _option2, _option3, _option4, _category
            });
            console.log('Error: No se encontro la pregunta: ' + err);
        }

    }).lean();*/

    const saveImage = async () => {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const imageTempPath = req.file.path; // ruta donde se encuentra el archivo

        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            const errors = [];
            console.log(req.file);

            // subir imagen a AWS
            var params = {
                Bucket: 'eduquiz-s3-files',
                Body: fs.createReadStream(imageTempPath),
                Key: "images/questions/" + Date.now() + "_" + path.basename(imageTempPath + ext),
                ACL: 'public-read'
            };

            s3.upload(params, async function (err, data) {
                //handle error
                if (err) {
                    console.log("Error", err);
                    req.flash('error_msg', 'Ha ocurrido un error al momento de subir la imagen al servidor.');
                    // Recargar misma pagina con los datos
                    res.render('questions/view-question', {
                        errors, _question, _option1, _option2, _option3, _option4, _category
                    });
                }
                //success
                if (data) {
                    // guardar ruta de imagen en arreglo
                    images.push(data.Location);
                    console.log("Uploaded in:", data.Location);

                    await Question.findByIdAndUpdate(req.params.id, {
                        question: _question,
                        options: [{ option: _option1, status: true },
                        { option: _option2, status: op2Status },
                        { option: _option3, status: false },
                        { option: _option4, status: false }],
                        images: images,
                        category: _category
                    });

                    req.flash('success_msg', 'Se ha actualizado la pregunta con exito.');
                    res.redirect('/questions/my-questions');
                }
            });
        } else {
            //await fs.unlink(imageTempPath);
            req.flash('error_msg', 'Solo puedes subir archivos en formato .PNG .JPG.');
            // Recargar misma pagina con los datos
            res.render('questions/view-question', {
                errors, _question, _option1, _option2, _option3, _option4, _category
            });
        }
    }
    // solo si se ha cargado una imagen desde el input file
    try {
        if (req.file.originalname !== undefined)
            saveImage();
    } catch (error) {
        console.log("PREGUNTA ACTUALIZADA SIN SUBIR IMAGEN = " + error);

        await Question.findByIdAndUpdate(req.params.id, {
            question: _question,
            options: [{ option: _option1, status: true },
            { option: _option2, status: op2Status },
            { option: _option3, status: false },
            { option: _option4, status: false }],
            category: _category
        });

        req.flash('success_msg', 'Se ha actualizado la pregunta con exito.');
        res.redirect('/questions/my-questions');
    }
});

// Eliminar pregunta
router.delete('/questions/remove-question/:id', isAuthenticated, async (req, res) => {
    const question = await Question.findById(req.params.id, (err, docs) => {
        if (err)
            console.log('Error durante la eliminacion de la pregunta:' + err);
    }).lean();

    if (question.images[0] !== undefined) {
        // De existir, elimina las imagenes de la pregunta ubicadas en el servidor
        //await fs.unlink(path.resolve('./public/upload/questions/' + question.images[0])); // elimina el archivo del servidor
    }

    await Question.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Se ha eliminado la pregunta correctamente.');
    res.redirect('/questions/my-questions');
});

module.exports = router;