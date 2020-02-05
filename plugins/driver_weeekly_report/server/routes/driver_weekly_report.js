
import _ from 'lodash';

/**
 * routes
 * @param {*} server
 */
export default function (server) {

  server.route({
    path: '/api/driver_weeekly_report/query',
    method: 'POST',
    handler: async (req) => {

      const { from, to, region } = req.payload;
      const searchRequest = {
        index: 'orders',
        size: 0,
        body: {
          _source: { include: [] },
          query: {
            bool: {
              filter: [
                { term: { status: 'confirmed' } },
                { term: { 'delivery.provider': 'ricepo' } },
                { range: { createdAt: { gt: from, lte: to } } }
              ],
              must_not: [{ term: { 'restaurant.fake': true } }]
            }
          },
          aggs: {
            date: {
              date_histogram: {
                field:         'createdAt',
                interval:      '1w',
                time_zone:     'America/Los_Angeles',
                min_doc_count: 1
              },
              aggs: {
                driver: {
                  terms: {
                    field: 'delivery.courier._id',
                    size:    1000000,
                    order: { _count: 'desc' }
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
          searchRequest.body.query.bool.must_not.push({ terms: { 'region.name': region.params } });
        } else {
          searchRequest.body.query.bool.filter.push({ terms: { 'region.name': region.params } });
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
}
