import { pool } from './connection.js'
import http from 'http'

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  const parts = url.pathname.split('/')

  const resource = parts[1]
  const id = parts[2]
  const action = parts[3]

  if (resource === 'producto' && req.method === 'GET' && !id) {
    try {
      const page = parseInt(url.searchParams.get('page')) || 1
      const limit = parseInt(url.searchParams.get('limit')) || 5

      const offset = (page - 1) * limit

      const result = await pool.query('SELECT * FROM producto ORDER BY id_producto LIMIT $1 OFFSET $2', [limit, offset])

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          status: 'OK',
          data: result.rows,
          pagination: {
            page,
            limit
          }
        })
      )
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          error: err.message
        })
      )
    }
  } else if (resource === 'producto' && req.method === 'GET' && id && !action) {
    try {
      const result = await pool.query('SELECT * FROM producto WHERE id_producto = $1', [id])

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          message: `Seleccion con el id:${id} logrado con exito!`,
          producto: result.rows
        })
      )
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  } else if (url.pathname === '/producto' && req.method === 'POST') {
    let body = ''

    req.on('data', (chunk) => (body += chunk))

    req.on('end', async () => {
      try {
        const producto = JSON.parse(body)

        const query = await pool.query(
          'INSERT INTO producto(nombre_producto, precio_producto, stock_producto) VALUES ($1, $2, $3) RETURNING *',
          [producto.name, producto.precio, producto.stock]
        )

        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify(
            {
              message: 'Producto creado',
              producto: query.rows[0]
            },
            null,
            2
          )
        )
      } catch (err) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
  } else if (url.pathname.startsWith('/producto/') && req.method === 'PATCH') {
    const id = url.pathname.split('/')[2]

    let body = ''

    req.on('data', (chunk) => (body += chunk))

    req.on('end', async () => {
      const data = JSON.parse(body)

      try {
        const query = await pool.query(
          'UPDATE producto SET nombre_producto = $1, precio_producto = $2, stock_producto = $3 WHERE id_producto = $4 RETURNING *',
          [data.name, data.precio, data.stock, id]
        )

        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify(
            {
              message: 'Producto actualizado con exito!',
              producto: query.rows[0]
            },
            null,
            2
          )
        )
      } catch (err) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
  } else if (url.pathname.startsWith('/producto/') && req.method === 'DELETE') {
    const id = url.pathname.split('/')[2]
    try {
      const query = await pool.query('DELETE FROM producto WHERE id_producto = $1 RETURNING *', [id])

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          message: 'Producto Eliminado con exito!',
          producto: query.rows[0]
        })
      )
    } catch (err) {
      res.writeHead(500)
      res.end(JSON.stringify({ error: err.message }))
    }
  } else {
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Pagina no encontrada' }))
  }
})

server.listen(3000, () => {
  console.log('Servidor corriendo: http://localhost:3000')
})
