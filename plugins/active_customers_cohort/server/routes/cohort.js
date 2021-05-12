import _ from 'lodash';

/**
 * routes
 * @param {*} server
 */
export default function(server) {
  server.route({
    path: '/api/active_customers_cohort/query/customers',
    method: 'POST',
    handler: async req => {
      const { interval, query } = req.payload;
      const searchRequest = {
        index: 'orders',
        size: 0,
        body: {
          _source: { include: [] },
          query,
          aggs: {
            date: {
              date_histogram: {
                field: 'createdAt',
                interval: interval,
                time_zone: 'America/Los_Angeles',
                min_doc_count: 1,
              },
              aggs: {
                customer: {
                  terms: {
                    field: 'customer._id',
                    size: 1000000,
                    order: { _count: 'desc' },
                  },
                  aggs: {
                    orderCount: {
                      min: {
                        field: 'customer.orderCount',
                      },
                    },
                    total: {
                      sum: {
                        field: 'total'
                      },
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

      /* just like GET orders/_count
      const response = await callWithRequest(req,'count'); */
      return response;
    },
  });
}
