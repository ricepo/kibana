import _ from 'lodash';

/**
 * routes
 * @param {*} server
 */
export default function(server) {
  server.route({
    path: '/api/customer_coupon_cohort/query',
    method: 'POST',
    handler: async req => {
      const { query, interval } = req.payload;
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
                    size: 10000,
                    order: { _count: 'desc' },
                  },
                  aggs: {
                    coupon: {
                      terms: {
                        field: 'coupon._id',
                        order: {
                          _count: 'desc',
                        },
                        missing: '__missing__',
                        size: 10000,
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
