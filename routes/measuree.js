async function routes (fastify, options) {
  fastify.addHook('preHandler', fastify.auth([fastify.verifyJWTandLevel]))

  //GET-ALL====================================================================
  fastify.get('/measuree', async (request, reply) => {
    const client = await fastify.pg.connect()
    const searchQuery = request.query['q'] || ''

    try {
      const { rows } = await client.query(
        `
        with m as (
          select
          ROW_NUMBER() over (partition by me1.id) as latest,
          mt1.*
          from kopi_bubuk.measuree me1
          join kopi_bubuk.measurement mt1
          on me1.id = mt1.measuree_id
        ),
          get_last_visit as (
          select 
            m.date_of_visit,
            m.status,
            m.sex,
            m.date_of_birth,
            m.is_approximate_date,
            m.is_unknown_date,
            m.weight,
            m.height,
            m.recumbent_weight,
            m.recumbent_height,
            m.oedema,
            m.head_circumference,
            m.muac,
            m.triceps_skinfold,
            m.subscapular_skinfold,
            m.measuree_id,
            m.facility_id
          FROM kopi_bubuk.measuree me
          join m
          ON me.id = m.measuree_id
          where m.latest = 1
        )
        select m.*, to_json(g) as last_measurement
        from kopi_bubuk.measuree m 
        full join get_last_visit g
        on m.id = g.measuree_id
        where UPPER(name) like UPPER('%' || $1 || '%')        
        `, [searchQuery]
      )

      return rows
    } finally {
      client.release()
    }
  })

  //GET-PERSONAL====================================================================
  fastify.get('/measuree-personal', async (request, reply) => {
    const client = await fastify.pg.connect()
    const searchQuery = request.query['q'] || ''

    try {
      const { rows } = await client.query(
        `
        with m as (
          select
          ROW_NUMBER() over (partition by me1.id) as latest,
          mt1.*
          from kopi_bubuk.measuree me1
          join kopi_bubuk.measurement mt1
          on me1.id = mt1.measuree_id
          WHERE mt1.measurer_id=$2
        ),
          get_last_visit as (
          select 
            m.date_of_visit,
            m.status,
            m.sex,
            m.date_of_birth,
            m.is_approximate_date,
            m.is_unknown_date,
            m.weight,
            m.height,
            m.recumbent_weight,
            m.recumbent_height,
            m.oedema,
            m.head_circumference,
            m.muac,
            m.triceps_skinfold,
            m.subscapular_skinfold,
            m.measuree_id,
            m.facility_id
          FROM kopi_bubuk.measuree me
          join m
          ON me.id = m.measuree_id
          where m.latest = 1
        )
        select m.*, to_json(g) as last_measurement
        from kopi_bubuk.measuree m 
        join get_last_visit g
        on m.id = g.measuree_id
        where UPPER(name) like UPPER('%' || $1 || '%')        
        `, [searchQuery, request?.user?.measurer_id]
      )

      return rows
    } finally {
      client.release()
    }
  })

  //GET-ONE from id============================================================
  fastify.get('/measuree/:id', async (request, reply) => {
    const client = await fastify.pg.connect()
    try {
      const { rows } = await client.query(
        `
        with m as (
          select mt1.*
          from kopi_bubuk.measuree me1
          join kopi_bubuk.measurement mt1
          on me1.id = mt1.measuree_id 
          order by mt1.date_of_visit DESC
        )
        select 
          me.*, json_agg(m) AS measurements
        FROM kopi_bubuk.measuree me
        full join m
        ON me.id = m.measuree_id
        where me.id = $1
        group by me.id
        
        `, [request.params.id]
      )

      const row = rows[0] || {}
      return row
    } finally {
      client.release()
    }
  })

  //CREATE====================================================================
  fastify.post('/measuree', async (request, reply) => {
    const client = await fastify.pg.connect()
    try {
      const value = await client.query(
        `
          INSERT INTO kopi_bubuk.measuree (
            name, address, date_of_birth, sex
          )
          VALUES($1, $2, $3, $4)
          RETURNING *;
        `, [
          request.body['name'],
          request.body['address'],
          request.body['date_of_birth'],
          request.body['sex'],
        ]
      )

      return {
        status: 'success',
        data: value.rows[0]
      }
    } finally {
      client.release()
    }
  })

  //UPDATE=================================================================
  fastify.put('/measuree/:id', async (request, reply) => {
    const client = await fastify.pg.connect()
    try {
      const value = await client.query(
        `
          UPDATE kopi_bubuk.measuree 
          SET
            name=COALESCE($2, name),
            address=COALESCE($3, address),
            date_of_birth=COALESCE($4, date_of_birth),
            sex=COALESCE($5, sex)
          WHERE id=$1
          RETURNING *;
        `, [
          request.params['id'],
          request.body['name'],
          request.body['address'],
          request.body['date_of_birth'],
          request.body['sex'],
        ]
      )

      return {
        status: 'success',
        data: value.rows[0]
      }
    } finally {
      client.release()
    }
  })

  //DELETE=======================================================================
  fastify.delete('/measuree/:id', async (request, reply) => {
    const client = await fastify.pg.connect()
    try {
      const value = await client.query(
        `
          DELETE FROM kopi_bubuk.measuree
          WHERE id=$1
          RETURNING *;
        `, [request.params.id]
      )

      return {
        status: 'success',
        data: value.rows[0]
      }
    } finally {
      client.release()
    }
  })
}

export default routes