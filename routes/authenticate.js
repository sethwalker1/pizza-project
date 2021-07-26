const express = require('express')
const router = express.Router();

let login = require('../www/api/auth/login.js')
let login = require('../www/api/auth/register.js')

router.post('/login', login)
router.post('/login', register)

module.exports = router
