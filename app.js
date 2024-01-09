const express = require('express')
require('./src/DB/conn')

const AuthRouter = require('./src/Routers/Auth')
const app = express()
const port = process.env.PORT || 3000;

app.use('/src/Images', express.static(__dirname + '/src/Images'));


app.use(express.json())
app.use(AuthRouter)

app.listen(port, () => {
    console.log("Connection stated at post no : ", port);
})
