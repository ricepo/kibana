import _ from 'lodash';

export default function (server) {

  server.route({
    path: '/api/customers_purchase_frequency/query',
    method: "POST",
    handler: async (req)=>{

      const {from,to,region} = req.payload
      const searchRequest = {
        index:"orders",
        size:0,
        body:{
          _source: {
            include: []
          },
          query:{
            bool:{
              filter:[
                { "term":  { "status": "confirmed" }},  
                { "terms":  { "ua.app": ['ricepo', 'june', 'mini'] }},  
                { "range": { "createdAt": { "gt": from,"lte":to }}}, 
              ],
              must_not:[
                {"term":  { "restaurant.fake": true }},
              ]
            }
          },
          "aggs": {
            "regionName": {
              "terms": {
                "field": "region.name",
                "size": 100,
                "order": {
                  "_count": "desc"
                }
              },
              "aggs": {
                "customerOrders": {
                  "terms": {
                    "field": "customer._id",
                    "size": 1000000,
                    "order": {
                      "_count": "desc"
                    }
                  }
                }
              }
            }
          }
        }
      };

      if(region){
        if(!_.isArray(region.params)){
          region.params = region.params.query.split()
        } 
        if(region.negate){
          searchRequest.body.query.bool.must_not.push({ "terms":  { "region.name": region.params }})
        }else{
          searchRequest.body.query.bool.filter.push({ "terms":  { "region.name": region.params }})
        }
      }

      /* this is the way to get data from elasticsearch directly */
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const response = await callWithRequest(req,'search',searchRequest);

      return response;
    }
  });
}
