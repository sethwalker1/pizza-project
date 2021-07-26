const bcrypt = require('bcryptjs')
const sql = require('../../../sql')

module.exports = async (req, res) => {
    const {
        body: { email, password },
        method,
    } = req

    switch (method) {
        case "POST":
            let r = await sql.query(`
                SELECT password
                FROM users
                WHERE email = ?
                LIMIT 1`,
                [email])

            if (!r) return res.json({ error: 'An account with that email does not exist!' })
            if (await bcrypt.compare(password, r.password))
                return res.send(Buffer.from(email).toString('base64'))

            res.json({ error: 'Incorrect password!' })
            break
        default:
            res.setHeader('Allow', ['POST'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}
