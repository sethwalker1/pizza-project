const mysql = require("mysql")

class SQLParser {
    static localhost = true
    static production = true
    static isConnected = false
    static isConnecting = null
    static conn = null
    static connInfo = this.production ? {
        connectionLimit: 128,
        host    : '209.222.20.135',
        user    : 'pizza_project',
        password: 'F#rvYnmkcJ&yx837J2x$#XyZr$*#xPoZPcJg6G9X#EvPrb9fGQoJs8!FQo8iC&Rf',
        database: 'pizza_project',
        charset : 'latin1_swedish_ci'
    } : {
        connectionLimit: 128,
        host    : 'localhost',
        user    : 'root',
        password: '',
        database: 'pizza_project',
        charset : 'latin1_swedish_ci'
    }

    static async connect() {
        if (this.isConnected) return true
        if (this.isConnecting) return await this.isConnecting // promise

        let self = this
        this.isConnecting = new Promise(async(resolve, reject) => {
            self.conn = mysql.createPool(self.connInfo)

            self.isConnected = true
            self.isConnecting = null

            console.debug('SQL connection established')
            resolve(self)
        }).catch(err => {
            console.error(err)
            setTimeout(async () => await self.connect(), 10000)
        })
    }

    static close() {
        if (!this.isConnected) return
        this.conn.close()
        this.isConnected = false
    }

    static async query(query, params, callback, flags) {
        if (!this.isConnected) await this.connect()

        if (!this.production)
            console.debug({
                query: query.replace(/\s+/gi, ' ').trim(), // this is strictly for readability purposes,
                params,
            })

        return await new Promise(async(resolve, reject) => {
            let conn = await new Promise((resolve, reject) => {
                this.conn.getConnection((err, conn) => {
                    if (err) reject(err)
                    resolve(conn)
                })
            }).catch(reject)

            let r = await new Promise((resolve, reject) => {
                conn.query(query, params, (err, res) => {
                    conn.release()
                    if (err) reject(err)
                    resolve(res)
                })
            }).catch(err => {
                try { conn.release() } catch (e) {}
                reject(err)
            })

            let result = r // null
            if (!r || r.length === 0)
                result = null // multiple ? [] : null
            else if (typeof r.length === 'number' && r.length === 1)
                result = query.includes('LIMIT 1') ? r[0] : r // multiple ? r : typeof r.length === 'number' ? r[0] : r
            else result = r

            if (callback) return callback(result)
            resolve(result)
        }).catch(err => {
            query = err.sql = query.replace(/\s+/gi, ' ').trim()
            console.warn(`Error in query ${query} with params ${params ? params.toString() : ''}`)
            console.error(err)
        })
    }
}

module.exports = SQLParser
