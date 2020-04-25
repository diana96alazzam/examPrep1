'use strict'

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
const methodoverride = require('method-override');

const PORT = process.env.PORT || 4000;

const app = express();
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', errorHandler);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodoverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');

app.get('/', getPeople);
app.get('/add', getForm);
app.get('/people/:person_id', getPerson);
app.post('/add', addPerson);
app.put('/update/:person_id', updatePerson);
app.delete('/delete/:person_id', deletePerson);
app.use('*', notFoundHandler);

function getPeople(request, response) {
    const SQL = "SELECT * FROM newtable;";
    client.query(SQL).then((result) => {
        response.render('index', { people: result.rows });
    }).catch((err) => errorHandler(err, request, response));
}

function getForm(request, response) {
    const zodiacUrl = 'https://zodiacal.herokuapp.com/api'
    superagent.get(zodiacUrl).then((zodicRes) => {
        let zodList = zodicRes.body.map((sign) => {
            return new ZodicSign(sign);
        });

        let zodListNames = zodList.map((sign) => {
            return sign.name;
        })

        response.render('add_form', { zodListNames: zodListNames });
    }).catch((err) => errorHandler(err, request, response));
}

function getPerson(request, response) {
    const detailSQL = "SELECT * FROM newtable WHERE id=$1;";
    const detailVal = [request.params.person_id];
    client.query(detailSQL, detailVal).then((detailRes) => {
        response.render('detail', { personDetail: detailRes.rows[0] })
    })

}

function addPerson(request, response) {
    const { formName, formBirth, zodicNamesListForm } = request.body;

    const zodiacUrl = `https://zodiacal.herokuapp.com/${zodicNamesListForm}`;

    superagent.get(zodiacUrl).then((zodicRes) => {
        let good = zodicRes.body[0].good_traits;
        let bad = zodicRes.body[0].bad_traits;
        let person = new Person(formName, formBirth, zodicNamesListForm, good, bad);

        const sqlSearch = "SELECT * FROM newtable WHERE name=$1 AND age=$2 AND zodiac=$3;";
        const searchVal = [person.name, person.birthDate, person.sign];
        client.query(sqlSearch, searchVal).then((searchRes) => {
            if (searchRes.rows.length === 0) {
                const addSQL = "INSERT INTO newtable (name, age, zodiac, good_traits, bad_traits) VALUES ($1, $2, $3, $4, $5);";
                const addVal = [person.name, person.birthDate, person.sign, person.good_traits, person.bad_traits];
                client.query(addSQL, addVal).then((addResult) => {
                    response.redirect('/');
                }).catch((err) => errorHandler(err, request, response));
            } else {
                response.redirect('/');
            }
        }).catch((err) => errorHandler(err, request, response));

    })

}

function updatePerson(request, response) {
    console.log(request.params.person_id)
    const sqlUpdate = "UPDATE newtable SET name=$1, age=$2, zodiac=$3, good_traits=$4, bad_traits=$5 WHERE id=$6;";
    const updateVal = [request.body.name, request.body.date, request.body.sign, request.body.good, request.body.bad, request.params.person_id];
    client.query(sqlUpdate, updateVal).then(updateRes => {
        response.redirect(`/people/${request.params.person_id}`);
    }).catch((err) => errorHandler(err, request, response));
}

function deletePerson(request, response) {
    const sqlDelete = "DELETE FROM newtable WHERE id=$1;";
    const deleteVal = [request.params.person_id];
    client.query(sqlDelete, deleteVal).then(deleteRes => {
        response.redirect('/');
    }).catch((err) => errorHandler(err, request, response));
}


client.connect().then(() => {
    app.listen(PORT, console.log(`The app is running on port ${PORT}`));
}).catch((err) => errorHandler(err, request, response));


function ZodicSign(sign) {
    this.name = sign.name;
    this.bad_traits = sign.bad_traits;
    this.good_traits = sign.good_traits;
}

function Person(formName, formBirth, zodicNamesListForm, good, bad) {
    this.name = formName;
    this.birthDate = formBirth;
    this.sign = zodicNamesListForm;
    this.good_traits = good;
    this.bad_traits = bad;
}


function notFoundHandler(request, response) {
    response.status(404).send('Page Not Found!');
}

function errorHandler(error, request, response) {
    response.status(500).send(error);
}

