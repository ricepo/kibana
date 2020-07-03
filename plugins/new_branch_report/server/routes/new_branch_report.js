
import _ from 'lodash';
import { regionData } from '../../public/region';

/**
 * routes
 */
export default function(server) {

  server.route({
    path: '/api/new_branch_report/shifts',
    method: 'POST',
    handler(req) {
      const {from,to, region, batch} = req.payload
      const searchRequest = {
        index:"shifts",// you can also change index to another
        size:10000,// must need,in elasticsearch ,from + size can not be more than the index.max_result_window index setting which defaults to 10,000.
        body:{
          query:{
            bool:{
              filter:[
                { "range": { "start": { "gt": from,"lte":to }}},
              ],
              must_not: []
            },
          },
          sort: [{ "start": "asc" }] // must need,We take the time of the last item of the query result as the from of the next query
        }
      };

      /* Add region filter if present  */
      if (region) {

        if (!_.isArray(region.params)) {
          region.params = region.params.query.split();
        }

        /* parse the region id from given name */
        region.params = _.map(region.params, p => {

          const r = _.find(regionData, { name: p });

          return r.id;
        });

        if (region.negate) {
          searchRequest.body.query.bool.must_not.push({ terms:  { 'region._id': region.params } });
        } else {
          searchRequest.body.query.bool.filter.push({ terms:  { 'region._id': region.params } });
        }
      }

      /* Add batch filter  */
      if (batch) {
        if (!_.isArray(batch.params)) {
          batch.params = batch.params.query.split();
        }

        if (batch.negate) {
          searchRequest.body.query.bool.must_not.push({ terms:  { 'batch': batch.params } });
        } else {
          searchRequest.body.query.bool.filter.push({ terms:  { 'batch': batch.params } });
        }
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      // this is count
      const response = callWithRequest(req,'search',searchRequest);
      return response;
    }
  });


  server.route({
    path: '/api/new_branch_report/orders',
    method: 'POST',
    handler(req) {
      const {from,to, region, batch} = req.payload
      const searchRequest = {
        index:"orders",// you can also change index to another
        size:10000,// must need,in elasticsearch ,from + size can not be more than the index.max_result_window index setting which defaults to 10,000.
        body:{
          query:{
            bool:{
              must : {
                "term" : { "status" : "confirmed" }
              },
              filter:[
                {
                  "bool": {
                    "should": [
                      { "range": { "createdAt": { "gt": from,"lte":to }}},
                      { "range": { "restaurant.delivery.window.start": { "gt": from,"lte":to }}}
                    ],
                    "minimum_should_match": 1
                  }
                },
              ],
              must_not: [
                {
                  "exists": {
                    "field": "bundle.splitId"
                  }
                }
              ]
            },
          },
          sort: [{ "createdAt": "asc" }] // must need,We take the time of the last item of the query result as the from of the next query
        }
      };

      /* Add region filter if present  */
      if (region) {

        if (!_.isArray(region.params)) {
          region.params = region.params.query.split();
        }

        /* parse the region id from given name */
        region.params = _.map(region.params, p => {

          const r = _.find(regionData, { name: p });

          return r.id;
        });

        if (region.negate) {
          searchRequest.body.query.bool.must_not.push({ terms:  { 'region._id': region.params } });
        } else {
          searchRequest.body.query.bool.filter.push({ terms:  { 'region._id': region.params } });
        }
      }

      /* Add batch filter  */
      if (batch) {
        if (!_.isArray(batch.params)) {
          batch.params = batch.params.query.split();
        }

        if (batch.negate) {
          searchRequest.body.query.bool.must_not.push({ terms:  { 'restaurant.delivery.batch': batch.params } });
        } else {
          searchRequest.body.query.bool.filter.push({ terms:  { 'restaurant.delivery.batch': batch.params } });
        }
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      // this is count
      const response = callWithRequest(req,'search',searchRequest);
      return response;
    }
  });

}
