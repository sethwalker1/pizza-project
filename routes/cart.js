const express = require('express')
const router = express.Router();

router.post('/', async (req, res) => {
    console.log('/cart')
    const {
        body: { token },
        method,
    } = req

    console.log(token);
    let user = await sql.query(`
        SELECT id
        FROM users
        WHERE token = ?
        LIMIT 1`, [token]);
    if (!user) return res.json({ error: 'Invalid token. Try logging back in.' })
    user = user.id

    let order = await sql.query(`
        SELECT id FROM orders
        WHERE user_id = ? AND status = 0
        ORDER BY time DESC LIMIT 1`,
        [user])
    console.log(order);
    if (!order) return res.json({ data: [] })
    order = order.id

    console.log(order);
    let items = await sql.query(`
        SELECT items.id as item_id, items.product_id, items.quantity, products.name, products.cost as price FROM orders
        INNER JOIN order_items as items
            ON orders.id = items.order_id
        JOIN products
            ON items.product_id = products.id
        WHERE orders.id = ?
        ORDER BY time DESC`,
        [order])
    if (!items) return res.json({ data: [] })
    
    let result = {};
    items.map(item => {
        let { name, price, quantity } = item;
        return result[item.item_id] = { name, price, quantity };
    });

    let toppings = await sql.query(`
        SELECT orders.order_item, toppings.name, toppings.price FROM order_modifications as orders
        JOIN toppings
            ON orders.topping_id = toppings.id
        WHERE order_id = ?`, [order]);
    console.log(toppings);
    if (toppings) {
        for (let topping of toppings) {
            if (!result[topping.order_item].toppings)
            result[topping.order_item].toppings = [];
            let { name, price } = topping;
            result[topping.order_item].toppings.push({ name, price });
        }
    }
    
    console.log(result);
    res.json({ data: Object.values(result) });
});

router.post('/add', async (req, res) => {
    const {
        body: { token, product, quantity, toppings },
        method,
    } = req

    let user = await sql.query(`
        SELECT id
        FROM users
        WHERE token = ?
        LIMIT 1`, [token]);
    if (!user) return res.json({ error: 'Invalid token. Try logging back in.' })
    user = user.id

    let order = await sql.query(`
        SELECT id FROM orders
        WHERE user_id = ? AND status = 0
        ORDER BY time DESC LIMIT 1`,
        [user])

    if (!order) {
        let r = await sql.query(`
            INSERT INTO orders (user_id, time, status)
            VALUES (?, ?, 0)`, [user, ~~(Date.now() / 1000)])
        if (r && r.affectedRows)
            order = r.insertId
        else return res.json({ error: 'Internal Error: Please try again.' })
    } else order = order.id
    
    let r = await sql.query(`
        INSERT INTO order_items (order_id, product_id, quantity)
        VALUES(?, ?, ?)`, [
            order, product, quantity
        ]);
    if (!r) return res.json({ error: 'Internal Error: Please try again.' });

    if (toppings && toppings.length) {
        toppings.map((item, i) => {
        });

        let sel = ''
        let arr = []
        for (let i in toppings) {
            let topping = toppings[i]
            toppings[i] = parseInt(topping);
            if (isNaN(topping)) {
                toppings.splice(i, 1)
                continue
            }

            sel += `(${order}, ${r.insertId}, ?),`
        }
        sel = sel.slice(0, -1);

        try { await sql.query(`
            INSERT INTO order_modifications(order_id, order_item, topping_id)
            VALUES ${sel}`, toppings)
        } catch (e) { }
    }

    res.status(200).end()
})

router.post('/modify', async (req, res) => {
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
        VALUES (?, ?, ?, NOW(), 0)`, [
            email,
            encrypted_password,
            token
        ])

    if (r2 && r2.affectedRows)
        return res.send(token)

    res.status(500).end()
})

module.exports = router
