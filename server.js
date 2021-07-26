const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

global.sql = require('./sql');
(async () => {
    await sql.connect()
})().catch(console.error)

const app = express()
const port = 8080

app.use(cors())
   .use(bodyParser.urlencoded({ extended: true }))
   .use('/auth', require('./routes/authenticate'))
   .use('/cart', require('./routes/cart'))

app.listen(port, () => {
    console.info(`Listening on port ${port}`)
})
