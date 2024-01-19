const express = require('express')
require('./src/DB/conn')
require('dotenv').config();

const AuthRouter = require('./src/Routers/Auth')
const postRouter = require('./src/Routers/Post')
const app = express()
const port = process.env.PORT ;

app.use('/src/Images', express.static(__dirname + '/src/Images'));
app.use(express.json())
app.use(AuthRouter)
app.use(postRouter)

app.listen(port, () => {
    console.log("Connection stated at post no : ", port);
})
