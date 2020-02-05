import _ from 'lodash';

/**
 * routes
 * @param {*} server
 */
export default function(server) {

  server.route({
    path:    '/api/new_drivers_cohort/query',
    method:  'POST',
    handler: async(req) => {

      const { from, to, region, aggs, drivers } = req.payload;
      const searchRequest = {
        index: 'orders',
        size:  0,
        body:  {
          _source: {
            include: []
          },
          query: {
            bool: {
              filter: [
                { term:  { 'delivery.provider': 'ricepo' } },
                { terms:  { 'delivery.courier._id': drivers } },
                { range: { createdAt: { gt: from, lte: to } } }
              ],
              must_not: [{ term:  { 'restaurant.fake': true } }]
            }
          },
          aggs
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

      return response;
    }
  });

}
