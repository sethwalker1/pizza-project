const express = require('express')
const router = express.Router();

router.post('/fetch', async (req, res) => {
    const {
        body: { token },
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
    if (!order) return res.json({ data: [] })
    order = order.id

    let items = await sql.query(`
        SELECT items.id, items.product_id, items.quantity, products.name, products.cost as price FROM orders
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
        let { id, name, price, quantity } = item;
        return result[id] = { id, name, price, quantity };
    });

    let toppings = await sql.query(`
        SELECT orders.order_item, toppings.name, toppings.price FROM order_modifications as orders
        JOIN toppings
            ON orders.topping_id = toppings.id
        WHERE order_id = ?`, [order]);

    if (toppings) {
        for (let topping of toppings) {
            if (!result[topping.order_item].toppings)
            result[topping.order_item].toppings = [];
            let { name, price } = topping;
            result[topping.order_item].toppings.push({ name, price });
        }
    }
    
    res.json({ data: Object.values(result) });
});

router.post('/fetchall', async (req, res) => {
    const {
        body: { token },
        method,
    } = req

    let user = await sql.query(`
        SELECT id
        FROM users
        WHERE token = ?
        LIMIT 1`, [token]);
    if (!user) return res.json({ error: 'Invalid token. Try logging back in.' })
    user = user.id

    let orders = await sql.query(`
        SELECT id, time FROM orders
        WHERE user_id = ? AND status = 1
        ORDER BY time DESC`,
        [user])
    if (!orders || !orders.length) return res.json({ data: [] })

    let result = {};
    for (let order of orders) {
        let { time } = order;
        order = order.id;
        result[order] = { id: order, time, items: []};
    
        let items = await sql.query(`
            SELECT items.id, items.product_id, items.quantity, products.name, products.cost as price FROM orders
            INNER JOIN order_items as items
                ON orders.id = items.order_id
            JOIN products
                ON items.product_id = products.id
            WHERE orders.id = ?
            ORDER BY time DESC`,
            [order])
        if (!items) return res.json({ data: [] })

        let temp = {};
        items.map(item => {
            let { id, name, price, quantity } = item;
            return temp[id] = { id, name, price, quantity };
        });
    
        let toppings = await sql.query(`
            SELECT orders.order_item, toppings.name, toppings.price FROM order_modifications as orders
            JOIN toppings
                ON orders.topping_id = toppings.id
            WHERE order_id = ?`, [order]);
    
        if (toppings) {
            for (let topping of toppings) {
                if (!temp[topping.order_item].toppings)
                temp[topping.order_item].toppings = [];
                let { name, price } = topping;
                temp[topping.order_item].toppings.push({ name, price });
            }
        }

        result[order].items = Object.values(temp);
    }

    res.json({ data: Object.values(result) });
});

router.post('/receipt', async (req, res) => {
    const {
        body: { token },
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
        SELECT id, time FROM orders
        WHERE user_id = ? AND status = 1
        ORDER BY time DESC LIMIT 1`,
        [user])
    if (!order) return res.json({ data: [] })
    let { time } = order;
    order = order.id

    let items = await sql.query(`
        SELECT items.id, items.product_id, items.quantity, products.name, products.cost as price FROM orders
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
        let { id, name, price, quantity } = item;
        return result[id] = { id, name, price, quantity };
    });

    let toppings = await sql.query(`
        SELECT orders.order_item, toppings.name, toppings.price FROM order_modifications as orders
        JOIN toppings
            ON orders.topping_id = toppings.id
        WHERE order_id = ?`, [order]);

    if (toppings) {
        for (let topping of toppings) {
            if (!result[topping.order_item].toppings)
            result[topping.order_item].toppings = [];
            let { name, price } = topping;
            result[topping.order_item].toppings.push({ name, price });
        }
    }

    res.json({ data: { id: order, time, items: Object.values(result) }});
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

router.post('/remove', async (req, res) => {
    const {
        body: { token, id },
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
    if (!order) return res.json({ data: [] })
    order = order.id

    await sql.query(`
        DELETE FROM order_modifications
        WHERE order_item = ?`, [id]);

    await sql.query(`
        DELETE FROM order_items
        WHERE id = ?`, [id]);

    res.status(200).end();
})

router.post('/checkout', async (req, res) => {
    const {
        body: { token, type },
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
    if (!order) return res.json({ data: [] })
    order = order.id

    let r = await sql.query(`
        UPDATE orders
        SET status = 1,
            type = ?,
            time = ?
        WHERE id = ?`, [type, ~~(Date.now() / 1000), order]);

    res.status(200).end();
});

module.exports = router
