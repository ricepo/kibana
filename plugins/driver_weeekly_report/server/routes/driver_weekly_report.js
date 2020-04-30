
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

      const { query } = req.payload;
      const searchRequest = {
        index: 'orders',
        size: 0,
        body: {
          _source: { include: [] },
          query,
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

      /* this is the way to get data from elasticsearch directly */
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = await callWithRequest(req, 'search', searchRequest);

      /* just like GET orders/_count
      const response = await callWithRequest(req,'count'); */
      return response;
    }
  });
}
