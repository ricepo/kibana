import _ from 'lodash';

export default function(server) {
  server.route({
    path: '/api/active-customers/query',
    method: 'POST',
    handler: async req => {
      const { query } = req.payload;
      const searchRequest = {
        index: 'orders',
        size: 0,
        body: {
          _source: {
            include: [],
          },
          query,
          aggs: {
            createdAt: {
              date_histogram: {
                field: 'createdAt',
                interval: '1d',
                time_zone: 'America/Los_Angeles',
                min_doc_count: 1,
              },
              aggs: {
                customers: {
                  terms: {
                    field: 'customer._id',
                    size: 1000000,
                    order: {
                      _count: 'desc',
                    },
                  },
                },
              },
            },
          },
        },
      };

      /* this is the way to get data from elasticsearch directly */
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = await callWithRequest(req, 'search', searchRequest);

      /* just like GET orders/_count   */
      // const response = await callWithRequest(req,'count');
      return response;
    },
  });

  /* get index settings from es */
  server.route({
    path: '/api/active-customers/getMaxResults',
    method: 'GET',
    handler: async req => {
      const searchRequest = {
        index: 'orders',
      };

      /* this is the way to get data from elasticsearch directly */
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = await callWithRequest(req, 'indices.getSettings', searchRequest);
      return response;
    },
  });
}
