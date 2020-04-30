import _ from 'lodash';

export default function(server) {
  server.route({
    path: '/api/customers_purchase_frequency/query',
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
            regionName: {
              terms: {
                field: 'region.name',
                size: 100,
                order: {
                  _count: 'desc',
                },
              },
              aggs: {
                customerOrders: {
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

      return response;
    },
  });
}
