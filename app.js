const express = require('express')
require('./src/DB/conn')
const admin = require('firebase-admin');
// const serviceAccount = require('../serviceAccountKey.json'); // Replace with the path to your service account key

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://jobguru-972cd-default-rtdb.firebaseio.com', // Replace with your Firebase project URL
// });
const AuthRouter = require('./src/Routers/Auth')
const app = express()
const port = process.env.PORT || 3000;
const path = require('path');

app.use('/src/Images', express.static(__dirname + '/src/Images'));


app.use(express.json())
app.use(AuthRouter)

app.listen(port, () => {
    console.log("Connection stated at post no : ", port);
})
