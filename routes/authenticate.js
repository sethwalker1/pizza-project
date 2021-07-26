const bcrypt = require('bcryptjs')
const express = require('express')
const router = express.Router();

router.post('/login', async (req, res) => {
    const {
        body: { email, password },
        method,
    } = req

    let r = await sql.query(`
        SELECT password
        FROM users
        WHERE email = ?
        LIMIT 1`,
        [email])

    if (!r) return res.json({ error: 'An account with that email does not exist!' })
    if (await bcrypt.compare(password, r.password)) {
        let token = Buffer.from(email).toString('base64')
        await sql.query(`UPDATE users SET token = ?`, [token])
        return res.send(token)
    }

    res.json({ error: 'Incorrect password!' })
})

router.post('/register', async (req, res) => {
    const {
        body: { name, email, password },
        method,
    } = req

    let r = await sql.query(`
        SELECT *
        FROM users
        WHERE email = ?
        LIMIT 1`,
        [email])

    if (r) return res.json({ error: 'A user already exists with the specified email ID!' })

    const salt = await bcrypt.genSalt(10)
    const encrypted_password = await bcrypt.hash(password, salt)
    const token = Buffer.from(email).toString('base64')
    let r2 = await sql.query(`
        INSERT INTO users (email, password, token, time, access)
        VALUES (?, ?, ?, ?, 0)`, [
            email,
            encrypted_password,
            token,
            ~~(Date.now() / 1000)
        ])

    if (r2 && r2.affectedRows)
        return res.send(token)

    res.status(500).end()
})

module.exports = router
