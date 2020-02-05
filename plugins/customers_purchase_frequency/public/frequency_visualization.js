import {
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
  query: '../api/customers_purchase_frequency/query',
}

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


export class CustomerFrequencyVisualizationProvider {

  containerClassName = 'customer-frequency-container';

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
      .map(x => {
        return {
          negate: x.meta.negate,
          params: x.meta.params
        }
      })
      .get('0')
      .value();

    const params = {
      from,
      to,
      region
    };
    const begin = moment();
    /* requset es(elasticsearch) */
    let esData = await getDataFromEs(api.query, params)
    const pullDataEnd = moment.now();
    console.log(`获取数据共花费${(pullDataEnd - begin) / 1000}s`)
    esData = _.get(esData,'data.aggregations.regionName.buckets')

    if(!esData.length){
      spinner.stop();
      return
    }
    /* process the data */

    let data = [];
    let total = {
      name: 'total',
      customers:0,
      orders:0,
      gte10Cusomers:0,
      gte10Orders:0,
      gte5lt10Cusomers:0,
      gte5lt10Orders:0,
      gte3lt5Cusomers:0,
      gte3lt5Orders:0,
      lt3Customers:0,
      lt3Orders:0,
    }

    /* calculate data */
    _.forEach(esData,v => {

      total.customers += v.customerOrders.buckets.length;
      total.orders += v.doc_count;
      let obj = {
        customers:v.customerOrders.buckets.length,
        orders:v.doc_count,
        gte10Cusomers:0,
        gte10Orders:0,
        gte5lt10Cusomers:0,
        gte5lt10Orders:0,
        gte3lt5Cusomers:0,
        gte3lt5Orders:0,
        lt3Customers:0,
        lt3Orders:0,
        name: v.key
      }

      _.forEach(v.customerOrders.buckets,x => {
        const len = x.doc_count
        /* process frequency data */
        if(len >= 10){
          obj.gte10Cusomers += 1;
          obj.gte10Orders += len;
          total.gte10Cusomers += 1;
          total.gte10Orders += len;
        }else if(len >= 5 && len < 10){
          obj.gte5lt10Cusomers += 1;
          obj.gte5lt10Orders += len;
          total.gte5lt10Cusomers += 1;
          total.gte5lt10Orders += len;
        }else if(len >= 3 && len < 5){
          obj.gte3lt5Cusomers += 1;
          obj.gte3lt5Orders += len;
          total.gte3lt5Cusomers += 1;
          total.gte3lt5Orders += len;
        }else if(len < 3){
          obj.lt3Customers += 1;
          obj.lt3Orders += len;
          total.lt3Customers += 1;
          total.lt3Orders += len;
        }
      })
      data.push(obj);
    })
    data = _.orderBy(data,['orders','customers'],['desc','desc'])
    data.push(total);

    /* calculate  frequency*/
    _.forEach(data,v => {
      v.frequency = v.orders === 0 ? 0 : formatNumber(v.orders / v.customers);

      v.gte10CusomersPercentage = formatNumber(v.gte10Cusomers * 100 / v.customers) + '%'
      v.gte10OrdersPercentage = formatNumber(v.gte10Orders * 100 / v.orders) + '%'
      v.gte10Frequency = v.gte10Orders === 0 ? 0 : formatNumber(v.gte10Orders / v.gte10Cusomers);

      v.gte5lt10CusomersPercentage = formatNumber(v.gte5lt10Cusomers * 100 / v.customers) + '%'
      v.gte5lt10OrdersPercentage = formatNumber(v.gte5lt10Orders * 100 / v.orders) + '%'
      v.gte5lt10Frequency = v.gte5lt10Orders === 0 ? 0 : formatNumber(v.gte5lt10Orders / v.gte5lt10Cusomers);

      v.gte3lt5CusomersPercentage = formatNumber(v.gte3lt5Cusomers * 100 / v.customers) + '%'
      v.gte3lt5OrdersPercentage = formatNumber(v.gte3lt5Orders * 100 / v.orders) + '%'
      v.gte3lt5Frequency = v.gte3lt5Orders === 0 ? 0 : formatNumber(v.gte3lt5Orders / v.gte3lt5Cusomers);

      v.lt3CustomersPercentage = formatNumber(v.lt3Customers * 100 / v.customers) + '%'
      v.lt3OrdersPercentage = formatNumber(v.lt3Orders * 100 / v.orders) + '%'
      v.lt3Frequency = v.lt3Orders === 0 ? 0 : formatNumber(v.lt3Orders / v.lt3Customers);

    })
    spinner.stop();
    const end = moment.now();
    console.log(`处理数据共花费${(end - pullDataEnd) / 1000}s`)
    console.log(`一共花费${(end - begin) / 1000}s`)
    showTable(this.container, data);
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
async function getDataFromEs(api,params){
  return await axios({
    method: 'post',
    url: api,
    data: {
      ...params
    },
    headers:{
      'kbn-version': '7.5.2'
    }
  });
}
/**
 * formatNumber
 * @param {*} value
 * @param {*} precision
 */
function formatNumber(value, precision){
  precision = precision === undefined ? 2 : Number(precision);
  precision = Math.pow(10, precision);
  let tmpPrecision = Math.pow(10, 8);
  value = Math.round(value * tmpPrecision * precision) / tmpPrecision;
  return Math.round(value) / precision;
}
