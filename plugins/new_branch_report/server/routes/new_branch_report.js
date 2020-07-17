
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
        if (batch.params && !_.isArray(batch.params)) {
          batch.params = batch.params.query.split();
        }


        if (batch.negate && batch.type === 'exists') {
          searchRequest.body.query.bool.must_not.push({ exists:  { field: 'batch' } });
        } else if(!batch.negate && batch.type === 'exists') {
          searchRequest.body.query.bool.filter.push({ exists:  { field: 'batch' } });
        } else if(batch.negate && batch.params) {
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
      const { from, to, region, batch } = req.payload;
      const searchRequest = {
        index: 'orders',
        size: 0,
        body: {
          _source: { include: [] },
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
          aggs: {
            email: {
              terms: {
                field: 'delivery.courier.email',
                size: 100000,
                order: { _count: 'desc' },
              },
              aggs: {
                driverid: {
                  terms: {
                    field: 'delivery.courier._id',
                    size: 100000,
                    order: { _count: 'desc' },
                  },
                  aggs: {
                    regionName: {
                      terms: {
                        field: 'region.name',
                        size: 100000,
                        order: { _count: 'desc' },
                      },
                      aggs: {
                        deliveryTimeSum: { sum: { field: 'delivery.time' } },
                        tipSum: { sum: { field: 'fees.tip.amount' } },
                        commissionSum: { sum: { field: 'commission.driver' } },
                        adjustmentSum: { sum: { field: 'adjustments.driver' } },
                        distributionSum: { sum: { field: 'distribution.driver' } },
                        uniqOrders:       {
                          "cardinality": {
                            "script": {
                              "source": "if (doc['bundle.combineId.keyword'].size() !== 0){\n    return doc['bundle.combineId.keyword'].value;\n}\n\nreturn doc['_id'].value;",
                              "lang": "painless"
                            }

                        }
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
        if (batch.params && !_.isArray(batch.params)) {
          batch.params = batch.params.query.split();
        }


        if (batch.negate && batch.type === 'exists') {
          searchRequest.body.query.bool.must_not.push({ exists:  { field: 'restaurant.delivery.batch.keyword' } });
        } else if(!batch.negate && batch.type === 'exists') {
          searchRequest.body.query.bool.filter.push({ exists:  { field: 'restaurant.delivery.batch.keyword' } });
        } else if(batch.negate && batch.params) {
          searchRequest.body.query.bool.must_not.push({ terms:  { 'restaurant.delivery.batch': batch.params } });
        } else {
          searchRequest.body.query.bool.filter.push({ terms:  { 'restaurant.delivery.batch': batch.params } });
        }
      }



      /* this is the way to get data from elasticsearch directly */
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = callWithRequest(req, 'search', searchRequest);

      /* just like GET orders/_count
      const response = await callWithRequest(req,'count'); */
      return response;
    },
  });


}
