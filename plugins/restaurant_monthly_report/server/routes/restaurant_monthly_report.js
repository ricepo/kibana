import _ from 'lodash';

/**
 * routes
 * @param {*} server
 */
export default function(server) {
  server.route({
    path: '/api/restaurant_monthly_report/query',
    method: 'POST',
    handler: async req => {
      const { aggs, query } = req.payload;

      const searchRequest = {
        index: 'orders',
        size: 0,
        body: {
          _source: {
            include: [],
          },
          query,
          aggs,
        },
      };

      /* this is the way to get data from elasticsearch directly */
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = await callWithRequest(req, 'search', searchRequest);

      return response;
    },
  });
}
