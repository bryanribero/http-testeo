import { pool } from './connection.js'
import http from 'http'

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/producto' && req.method === 'GET') {
    try {
      const rawinclude = url.searchParams.get('include')
      const include = rawinclude ? rawinclude.split(',') : []
      const allowedInclude = ['comerciante']

      const invalidInclude = include.filter((e) => !allowedInclude.includes(e))

      if (invalidInclude.length > 0) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            error: `Include(s) no permitido(s): ${invalidInclude.join(', ')}`
          })
        )
        return
      }

      const filterInclude = include.filter((e) => allowedInclude.includes(e))

      const allowedFilter = {
        id_producto: undefined,
        id_comerciante: undefined
      }

      const filters = []
      const values = []

      for (const key in allowedFilter) {
        const val = url.searchParams.get(key)

        if (!val) continue

        values.push(parseInt(val))
        filters.push(`producto.${key} = $${values.length}`)
      }

      let sql = 'SELECT producto.*'
      let join = ''

      if (filterInclude.includes('comerciante')) {
        sql += ', comerciante.nombre_comerciante AS nombre_comerciante'
        join += ' INNER JOIN comerciante ON producto.id_comerciante = comerciante.id_comerciante'
      }

      if (filters.length) {
        sql += ' FROM producto' + join + ' WHERE ' + filters.join(' AND ') + ' ORDER BY producto.id_producto ASC'
      } else {
        sql += ' FROM producto' + join + ' ORDER BY producto.id_producto ASC'
      }

      const result = await pool.query(sql, values)

      if (result.rows.length === 0) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            error: `La(s) Id indicada(s) no existe(n)`
          })
        )
        return
      }

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          message: 'Poductos y su comerciante',
          producto: result.rows
        })
      )
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  }
})

server.listen(3000, () => {
  console.log('Server corriendo')
})
