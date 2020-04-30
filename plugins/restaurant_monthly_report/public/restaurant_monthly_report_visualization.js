import { showChart } from './util';
import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import dateMath from '@elastic/datemath';
import { timefilter } from 'ui/timefilter';
import { Spinner } from 'spin.js';
import 'spin.js/spin.css';

const api = { query: '../api/restaurant_monthly_report/query' };


/* Options for the loading spinner */
const opts = {
  lines: 13, // The number of lines to draw
  length: 38, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  color: '#242222', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-default', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  position: 'absolute' // Element positioning
};



export class RestaurnatMonthlyReportVisualizationProvider {

  containerId = 'restaurant-monthly-report-container';
  margin = { top: 20, right: 20, bottom: 40, left: 50 };

  constructor(el, vis) {
    this.vis = vis;
    this.el = el;
    this.container = document.createElement('div');
    this.container.id = this.containerId;
    this.el.appendChild(this.container);
  }

  async render(visData, visParams, status) {

    if (!(status.time || status.data)) return;

    if (!this.container) return;

    this.container.innerHTML = '';

    const spinner = new Spinner(opts).spin(this.container);


    /* get timeRange */
    /* format dateTime by timezone such as "now/d"(datemath) */
    const from = dateMath.parse(timefilter.getTime().from).format();
    const to = dateMath.parse(timefilter.getTime().to, { roundUp: true }).format();

    /* get filters */
    const region = _.chain(this.vis.searchSource._fields.filter)
      .filter(v => !v.meta.disabled && v.meta.key === 'region.name')
      .map(x => {
        return {
          negate: x.meta.negate,
          params: x.meta.params
        };
      })
      .get('0')
      .value();

    /* get settings in orders */
    /* const settings = await axios('../api/restaurant_monthly_report/getMaxResults'); */

    /* get max_result_window */
    /* const size = _.get(settings.data, 'orders.settings.index.max_result_window') || 10000; */


    /* requset es(elasticsearch) */
    const esData = await getRestaurants();

    if (!esData.length) {

      spinner.stop();

      return;
    }

    /* Get all new restaurants */
    const restaurants = _.chain(esData)
      .filter(r => !r.suspended && moment(r.createdAt).isAfter(from) && moment(r.createdAt).isBefore(to))
      .map(r => {

        return { _id: r._id, createdAt: moment(r.createdAt).format('YY-MM') };
      })
      .value();
    const newRests = _.map(restaurants, '_id');
    const restCreated = _.chain(restaurants)
      .sortBy('createdAt')
      .groupBy('createdAt')
      .value();

    /* Do nothing if no new restCreated */
    if (!newRests.length) {
      spinner.stop();

      this.container.innerHTML = `There are no new drivers between ${moment(registeredFrom).format('YYYY-MM-DD')} and ${moment(registeredTo).format('YYYY-MM-DD')}`;

      return;
    }


    /* create params for restaurant */
    const params = {
      from,
      to,
      restaurants: newRests,
      region,
      aggs: {
        restaurants: {
          terms: {
            field: 'restaurant._id',
            size: 1000000,
            order: { _count: 'desc' }
          }
        }
      }
    };

    let ordersRests = await getDataFromEs(api.query, params);
    ordersRests = _.get(ordersRests, 'data.aggregations.restaurants.buckets');
    ordersRests = _.map(ordersRests, 'key');

    const data = {
      total: [],
      active: []
    };

    data.xAxis = _.keys(restCreated);
    data.total = _.map(restCreated, val => val.length);

    const ans = [];

    /* Get the active restaurant */
    _.forEach(restCreated, (val) => {

      const active = _.filter(val, r => _.includes(ordersRests, r._id));

      ans.push(active.length);
    });

    data.active = ans;

    const width = this.el.offsetWidth - this.margin.left - this.margin.right;
    const height = this.el.offsetHeight - this.margin.top - this.margin.bottom;
    const allWidth = this.el.offsetWidth;
    const allHeight = this.el.offsetHeight;
    const measures = { width, height, margin: this.margin, allWidth, allHeight };

    spinner.stop();
    showChart(measures, this.containerId, data);


  }

  destroy() {
    this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

};


/**
 * get data directly from es
 * @param {Object} (filters and timeRange from kibana)
 */
async function getDataFromEs(api, params) {
  return await axios({
    method: 'post',
    url: api,
    data: { ...params },
    headers: { 'kbn-version': '7.5.2' }
  });
}

/**
 * get search data directly from es
 * @param {Object} api
 * @param {Object} params (filters and timeRange from kibana)
 */
async function getRestaurants() {

  const a = await axios({
    method: 'get',
    url: '/v1/restaurants',
    baseURL: 'https://staging.isengard.ricepo.com',
    headers:{
      "Content-Type": "application/json",
      'Authorization': 'JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJhY2N0X0gxZnVjei1RNyIsImVtYWlsIjoiZGRAcmljZXBvLmNvbSIsInBob25lIjoiKzE0MDgyNTA0NzM5Iiwicm9sZXMiOlt7InNjb3BlIjpudWxsLCJuYW1lIjoicmljZXBvLm1hbmFnZXIifSx7InNjb3BlIjpudWxsLCJuYW1lIjoicmljZXBvLnN1cHBvcnQifSx7InNjb3BlIjoiNTYzNTJmY2MwZDI4OGQwN2YxZTAwMTg0IiwibmFtZSI6InJlZ2lvbi5zdXBwb3J0IiwiZGVzY3JpcHRpb24iOiJhbmNob3JhZ2UsYWsifSx7InNjb3BlIjoiNTYzNTJmY2MwZDI4OGQwN2YxZTAwMTg0IiwibmFtZSI6InJlZ2lvbi5kcml2ZXJNYW5hZ2VyIiwiZGVzY3JpcHRpb24iOiJhbmNob3JhZ2UsYWsifSx7InNjb3BlIjoiNTYzNTJmY2MwZDI4OGQwN2YxZTAwMTg0IiwibmFtZSI6InJlZ2lvbi5kcml2ZXIiLCJkZXNjcmlwdGlvbiI6ImFuY2hvcmFnZSxhayIsInRpbWV6b25lIjoiQW1lcmljYS9BbmNob3JhZ2UifSx7InNjb3BlIjpudWxsLCJuYW1lIjoicmljZXBvLmRlcHV0eSJ9LHsic2NvcGUiOm51bGwsIm5hbWUiOiJyaWNlcG8udGVjaCJ9XSwidHlwZSI6InN0YWZmIiwiaWF0IjoxNTUxNjU0Nzg0LCJleHAiOjYwNDgwMDkxMzcyMTIxMzEsInN1YiI6ImFjY3RfSDFmdWN6LVE3In0.hjLlWVhGnmY8yuR4mMLMJwGvKDPaxWtPuMxTyicOhPw'
    }
  });


  const res = a.data;

  return res;
}
