import _ from 'lodash';

/**
 * routes
 * @param {*} server
 */
export default function(server) {

  server.route({
    path:    '/api/customer_coupon_cohort/query',
    method:  'POST',
    handler: async(req) => {

      const { from, to, region, interval } = req.payload;
      const searchRequest = {
        index: 'orders',
        size:  0,
        body:  {
          _source: { include: [] },
          query:   {
            bool: {
              filter: [
                { term:  { status: 'confirmed' } },
                { range: { createdAt: { gt: from, lte: to } } }
              ],
              must_not: [{ term:  { 'restaurant.fake': true } }]
            }
          },
          aggs: {
            date: {
              date_histogram: {
                field:         'createdAt',
                interval:      interval,
                time_zone:     'America/Los_Angeles',
                min_doc_count: 1
              },
              aggs: {
                customer: {
                  terms: {
                    field: 'customer._id',
                    size:    10000,
                    order: { _count: 'desc' }
                  },
                  aggs: {
                    coupon: {
                      terms: {
                        field: "coupon._id",
                        order: {
                          _count: "desc"
                        },
                        missing: "__missing__",
                        size: 10000
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      if (region) {
        if (!_.isArray(region.params)) {
          region.params = region.params.query.split();
        }

        if (region.negate) {
          searchRequest.body.query.bool.must_not.push({ terms:  { 'region.name': region.params } });
        } else {
          searchRequest.body.query.bool.filter.push({ terms:  { 'region.name': region.params } });
        }
      }

      /* this is the way to get data from elasticsearch directly */
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = await callWithRequest(req, 'search', searchRequest);

      /* just like GET orders/_count
      const response = await callWithRequest(req,'count'); */
      return response;
    }
  });

  /* get index settings from es */
  server.route({
    path:    '/api/customer_coupon_cohort/getMaxResults',
    method:  'GET',
    handler: async(req) => {

      const searchRequest = { index: 'orders' };

      /* this is the way to get data from elasticsearch directly */
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = await callWithRequest(req, 'indices.getSettings', searchRequest);

      return response;
    }
  });
}
