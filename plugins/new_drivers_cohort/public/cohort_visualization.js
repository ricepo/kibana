import {
  getValueFunction,
  showTable
} from './utils';
import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import { Spinner } from 'spin.js';
import 'spin.js/spin.css';
import dateMath from '@elastic/datemath';
import { timefilter } from 'ui/timefilter';

const api = {
  query:          '../api/new_drivers_cohort/query',
  getDrivers:     '../api/new_drivers_cohort/getDrivers'
};

/* Options for the loading spinner */
const opts = {
  lines:     13, // The number of lines to draw
  length:    38, // The length of each line
  width:     17, // The line thickness
  radius:    45, // The radius of the inner circle
  scale:     1, // Scales overall size of the spinner
  corners:   1, // Corner roundness (0..1)
  color:     '#242222', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed:     1, // Rounds per second
  rotate:    0, // The rotation offset
  animation: 'spinner-line-fade-default', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex:    2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top:       '50%', // Top position relative to parent
  left:      '50%', // Left position relative to parent
  shadow:    '0 0 1px transparent', // Box-shadow for the lines
  position:  'absolute' // Element positioning
};


export class NewDriversCohortVisualizationProvider{

  containerClassName = 'newDriverCohort-container';

  constructor(el, vis) {
    this.vis = vis;
    this.el = el;
    this.container = document.createElement('div');
    this.container.className = this.containerClassName;
    this.el.appendChild(this.container);
  }

  async render(visData, visParams, status) {

    if (!(status.time || status.data || status.params)) return;

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
      .map(x => ({
        negate: x.meta.negate,
        params: x.meta.params
      }))
      .get('0')
      .value();

    const params = {
      from,
      to,
      region
    };

    /**
     * get new drivers
     * has accont.milestone.order1
     */

    const begin = moment.now();

    /**
     * find all drivers and regardless of suspended
     */
    let accounts = await getDataFromEs(api.getDrivers, {
      from,
      to,
      region,
      aggs: {
        id: {
          terms: {
            field: '_id',
            order: { _count: 'desc' },
            size:  10000
          },
          aggs: {
            order1: {
              terms: {
                field: 'milestone.order1',
                order: { _count: 'desc' },
                size:  10000
              }
            }
          }
        }
      }
    });
    accounts = _.get(accounts, 'data.aggregations.id.buckets');
    
    const newCreatedDrivers = _.chain(accounts)
      .map(v => ({
        id: v.key,
        order1: v.order1.buckets[0].key_as_string,
      }))
      .value();

    const newCreatedDriverId = _.map(newCreatedDrivers, 'id');
    if (!newCreatedDriverId.length) {
      spinner.stop();
      this.container.innerHTML = `no data`;

      return;
    }

    /* get drivers orders */
    const params1 = {
      from,
      to,
      drivers: newCreatedDriverId,
      region,
      aggs: {
        drivers: {
          terms: {
            field: 'delivery.courier._id',
            size:    1000000,
            order:   { _count: 'desc' }
          }
        }
      }
    };

    let ordersDrivers = await getDataFromEs(api.query, params1);
    ordersDrivers = _.get(ordersDrivers, 'data.aggregations.drivers.buckets');
    ordersDrivers = _.map(ordersDrivers, 'key');

    if (!ordersDrivers.length) {
      this.container.innerHTML = `no data`;
      return;
    }


    /* get interval */
    let interval = null;
    let period = null;
    let formatUnit = null;
    switch (visParams.period) {
      case 'daily':
        period = 'daily'
        interval = '1d'
        formatUnit = 'day'
        break;
      case 'weekly':
        period = 'weekly'
        interval = '1w'
        formatUnit = 'isoWeek'
        break;
      case 'monthly':
        period = 'monthly'
        interval = '1M'
        formatUnit = 'month'
        break;
      default:
        period = 'weekly'
        interval = '1w'
        formatUnit = 'isoWeek'
        break;
    }

    params.drivers = ordersDrivers;
    params.aggs = {
      createdAt: {
        date_histogram: {
          field:         'createdAt',
          interval:      interval,
          time_zone:     'America/Los_Angeles',
          min_doc_count: 1
        },
        aggs: {
          driverId: {
            terms: {
              field: 'delivery.courier._id',
              size:  1000000,
              order:   { _count: 'desc' }
            }
          }
        }
      }
    };

    /* requset es(elasticsearch) */
    let esData = await getDataFromEs(api.query, params);
    esData = _.get(esData, 'data.aggregations.createdAt.buckets');
      
    const pullDataEnd = moment.now();

    console.log(`获取数据共花费${(pullDataEnd - begin) / 1000}s`);

    
    if (!esData.length) {
      spinner.stop();
      return;
    }
    const newCreatedDriverObj = _.keyBy(newCreatedDrivers, 'id');

    /* format the data from es */
    esData = _.chain(esData)
      .map(v => _.map(v.driverId.buckets, x => ({
        daily:   moment(v.key_as_string).format('YYYY/MM/DD'),
        weekly:  `${moment(v.key_as_string).format('YYYY')}/${moment(v.key_as_string).isoWeeks()}`,
        monthly: moment(v.key_as_string).format('YYYY/MM'),
        _id:     x.key,
        order1: newCreatedDriverObj[x.key].order1,
        first:  moment(newCreatedDriverObj[x.key].order1).isBetween(moment(v.key_as_string).startOf(formatUnit),moment(v.key_as_string).endOf(formatUnit)),
        ts: v.key_as_string
      })))
      .flatten()
      .groupBy(v => v[period])
      .values()
      .value();
    
    /* format the data to generate table */
    const data = [];

    _.forEach(esData, (d, day) => {

      const newDrivers = _.unionBy(_.filter(d, 'first'), '_id');
      const active = _(esData)
        .slice(day + 1) // Get the customer from date after init date
        .map(x => _.uniq(_.intersectionBy(newDrivers, x, '_id')).length)
        .value();

      /* set value which is the last in Array */
      if (!active.length) {
        data.push({
          date:   d[0].daily,
          total:  newDrivers.length,
          period: 1,
          value:  0
        });
      }

      _.forEach(active, (v, k) => {
        data.push({
          date:   d[0].daily,
          total:  newDrivers.length,
          period: k + 1,
          value:  v
        });
      });
    });

    spinner.stop();

    const end = moment.now();

    console.log(`处理数据共花费${(end - pullDataEnd) / 1000}s`);
    console.log(`一共花费${(end - begin) / 1000}s`);

    const valueFn = getValueFunction(this.vis.params);

    showTable(this.vis.params.mapColors, 'd', this.container, data, valueFn);
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
    method:  'post',
    url:     api,
    data:    { ...params },
    headers: { 'kbn-version': '7.5.2' }
  });
}


/**
 * get search data directly from es
 * @param {Object} api
 * @param {Object} params (filters and timeRange from kibana)
 */
async function getAccounts({params}) {

  const a = await axios({
    method:  'get',
    url:     '/v1/accounts',
    baseURL: 'https://staging.isengard.ricepo.com',
    params,
    headers: {
      'Content-Type':  'application/json',
      Authorization:  'JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJhY2N0X0gxZnVjei1RNyIsImVtYWlsIjoiZGRAcmljZXBvLmNvbSIsInBob25lIjoiKzE0MDgyNTA0NzM5Iiwicm9sZXMiOlt7InNjb3BlIjpudWxsLCJuYW1lIjoicmljZXBvLm1hbmFnZXIifSx7InNjb3BlIjpudWxsLCJuYW1lIjoicmljZXBvLnN1cHBvcnQifSx7InNjb3BlIjoiNTYzNTJmY2MwZDI4OGQwN2YxZTAwMTg0IiwibmFtZSI6InJlZ2lvbi5zdXBwb3J0IiwiZGVzY3JpcHRpb24iOiJhbmNob3JhZ2UsYWsifSx7InNjb3BlIjoiNTYzNTJmY2MwZDI4OGQwN2YxZTAwMTg0IiwibmFtZSI6InJlZ2lvbi5kcml2ZXJNYW5hZ2VyIiwiZGVzY3JpcHRpb24iOiJhbmNob3JhZ2UsYWsifSx7InNjb3BlIjoiNTYzNTJmY2MwZDI4OGQwN2YxZTAwMTg0IiwibmFtZSI6InJlZ2lvbi5kcml2ZXIiLCJkZXNjcmlwdGlvbiI6ImFuY2hvcmFnZSxhayIsInRpbWV6b25lIjoiQW1lcmljYS9BbmNob3JhZ2UifSx7InNjb3BlIjpudWxsLCJuYW1lIjoicmljZXBvLmRlcHV0eSJ9LHsic2NvcGUiOm51bGwsIm5hbWUiOiJyaWNlcG8udGVjaCJ9XSwidHlwZSI6InN0YWZmIiwiaWF0IjoxNTUxNjU0Nzg0LCJleHAiOjYwNDgwMDkxMzcyMTIxMzEsInN1YiI6ImFjY3RfSDFmdWN6LVE3In0.hjLlWVhGnmY8yuR4mMLMJwGvKDPaxWtPuMxTyicOhPw'
    }
  });

  const data = a.data;

  return data;
}
