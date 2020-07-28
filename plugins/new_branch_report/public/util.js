import d3 from 'd3';
import moment from 'moment-timezone';
import { extendMoment } from 'moment-range';
import _ from 'lodash';

import { regionData } from './region';

const Moment = extendMoment(moment);

const summaryKeys = [
  'orders',
  'hours',
  'actualHour',
  'driverPay',
  'adjustmentPay',
  'orderPerHour',
  'driverCommission',
  'driverTip',
  'averageDeliveryTime',
  'averagePayPerHour',
  'averageCommissionPayPerHour',
  'averagePayPerOrder',
  'failRate',
  'pickupFailEvent',
  'totalEvent',
  'noCallnoShow',
  'incompleteShift'
]

/**
 * @params { string } regionName
 * @returns { number }
 */
export const getDriverRate = regionName => {
  /* Return 0 if no region id */
  if (!regionName) {
    return 0;
  }

  /* config of region for driver rate */
  const region = {
    'philadelphia,pa': 0,
    'tempe,az': 0,
    'seattle,wa': 0,
    'chicago,il': 0,
    'lansing,mi': 0,
    'twin cities,mn': 0,
  };

  /* return rate if present */
  if (region[regionName]) {
    return region[regionName];
  }

  return 0;
};

/**
 *
 * @param {*} element
 * @param {*} data
 */
function getSumofData(data) {

  /* create final summary object */
  const ans = _.reduce(data , (result, shift) => {

    const summary = _.get(shift, 'driver.summary', {});

      /* Get sum of data  */
    _.map(summaryKeys, k => {

      const val = _.get(summary, k, 0);
      result[k] = _.get(result, k, 0) + (_.isNaN(val) ? 0 : val);
    });

    return result;
  }, {});

  /* Get average of delivery time */
  ans.averageDeliveryTime = _.get(ans, 'averageDeliveryTime', 0) / data.length;
  ans.jobHours = _.get(data, '[0].driver.summary.jobHours', 0);

  return ans;

}

/**

 * @param {HTMLElement} element
 * @params { Object } data
 */
export function showTable(element, data) {
  const begin = moment();

  /* Get data */
  const { driverShifts,
    unassignDriverShifts, totalJobs, ordersData } = data;

  let totalHours = 0;
  let totalOrders = 0;
  let totalDistribution = 0;

  /* to calculate total */
  const total = {
    averageDeliveryTime: [],
    orders: [],
    hours: [],
    onlineHours: [],
    actualHours: [],
    shiftHours:   [],
    distribution: [],
    guaranteeAdjustments: [],
    manualAdj: [],
    driverPay: [],
    payPerHour: [],
    orderPerHour: [],
    payPerOrder: [],
    commissionPerOrder: [],
    tipPerOrder: [],
    onlineHours: [],
    noCallnoShow: [],
    incompleteShift: [],
    lateDrop: [],
    failRate: [],
    cambridgeFailRate: [],
  };

  const totalSum = [...Array(20)].map(elem => new Array());

  console.log(totalSum);

  const column = [
    'city',
    'email',
    'average Delivery Time',
    'orders',
    'Total Online Hours',
    'Shift Online Hours',
    'Total Actual Hours',
    'Total Distribution',
    'Guarantee Adjustments',
    'Manual Adjustments',
    'Total distribution  w/o adj',
    'payPerHour',
    'orderPerHour',
    'payPerOrder',
    'commissionPerOrder',
    'tipPerOrder',
    'Assigned Shift Hours',
    'noCall noShow',
    'incompleteShift',
    'late Drop',
    'fail Rate'
  ];

  let result = [];

  _.forEach(driverShifts, (v, k) => {

    const summary = getSumofData(v);

    /* Get the region name from region object */
    const regionID = _.find(regionData, { id: _.get(v, '[0].region._id', '') });
    const regionName = _.get(regionID, 'name', 'unknown');
    const driverEmail = k;
    // const driverid = v.driverid;
    const driverName = _.split(driverEmail, '@')[0];

    const d = [];

    d.push(_.split(regionName, ',')[0]);
    d.push(`${_.toUpper(driverName.slice(0, 3))}${driverName.slice(3)}`);

    /* Get driver orders and only get uniq orders */
    const driverData = _.find(ordersData, { email: k });

    const orders = _.get(driverData, 'orders', 0);

    const distribution = _.get(driverData, 'distributionSum', 0) / 100;
    const adjustments = _.get(driverData, 'adjustmentSum', 0) / 100;
    const averageDeliveryTime = _.get(summary, 'averageDeliveryTime', 0);

    /* Average Delivery Time */
    totalSum[2].push(_.isNaN(averageDeliveryTime) ? 0 : averageDeliveryTime);
    d.push(averageDeliveryTime.toFixed());

    /* Driver total orders */
    totalSum[3].push(orders);
    d.push(orders);


    /* Driver online Duration */
    const onlineHours = _.get(totalJobs, k) || _.get(summary, 'hours', 0); //used fallback logic
    totalSum[4].push(onlineHours);
    d.push(onlineHours.toFixed(1));

    /* hours */
    const hours = _.get(summary, 'hours', 0);
    totalSum[5].push(hours);
    d.push(hours.toFixed(1));

    /* Drivers Actual Hours */
    const actualHours = _.get(summary, 'actualHour', 0);
    totalSum[6].push(actualHours);
    d.push(actualHours.toFixed(1));

    /* Driver distribution */
    totalSum[7].push(distribution);
    d.push(`$${distribution.toFixed()}`);

    const guaranteePay = (((hours) * getDriverRate(regionName)) / 100) + _.get(summary, 'adjustmentPay', 0);
    const guaranteeAdjustments = guaranteePay - distribution > 0 ? guaranteePay - distribution : 0;

    /* guarantee adjustments */
    totalSum[8].push(guaranteeAdjustments);
    d.push(`$${guaranteeAdjustments.toFixed(2)}`);

    /* Driver adjustments */
    totalSum[9].push(adjustments);
    d.push(`$${adjustments.toFixed(2)}`);

    /* driver dist - adj */
    totalSum[10].push(distribution - guaranteeAdjustments - adjustments);
    d.push(`$${(distribution - guaranteeAdjustments - adjustments).toFixed()}`);

    /* averagePayPerHour */
    const payPerHour = (distribution - guaranteeAdjustments - adjustments) / (hours);
    const finalPayPerHour = _.isFinite(payPerHour) ? payPerHour : 0;

    /* Get mean */
    totalSum[11].push(finalPayPerHour);

    d.push(`$${finalPayPerHour.toFixed(2)}`);

    /* Save total Order / Hour  */
    totalOrders += orders;
    totalHours += hours;
    totalDistribution += (distribution - guaranteeAdjustments - adjustments);

    /* order/hour */
    const orderPerHour = _.isFinite(orders / (hours)) ? orders / (hours) : 0;

    totalSum[12].push(orderPerHour);
    d.push(orderPerHour.toFixed(2));

    /* pay/order */
    const payPerOrder = (distribution - guaranteeAdjustments - adjustments) / orders;

    totalSum[13].push(_.isFinite(payPerOrder) ? payPerOrder : 0);
    d.push(`$${payPerOrder.toFixed(2)}`);

    /* commission per order */
    const commission = _.get(driverData, 'commissionSum', 0) / 100;

    const commissionPerOrder = commission / orders;

    totalSum[14].push(_.isFinite(commissionPerOrder) ? commissionPerOrder : 0);

    d.push(`$${commissionPerOrder.toFixed(2)}`);

    /* Tips/order */
    const tipPerOrder = _.isFinite(payPerOrder - commissionPerOrder)
      ? payPerOrder - commissionPerOrder
      : 0;

    /* Get mean */
    totalSum[15].push(tipPerOrder);
    d.push(`$${tipPerOrder.toFixed(2)}`);

    const shiftHours = _.sumBy(v, 'duration') / 60;
    totalSum[16].push(shiftHours);
    d.push((shiftHours).toFixed(1));

    /* No call No Show */
    const ncns = _.get(summary, 'noCallnoShow', 0);

    totalSum[17].push(ncns);
    d.push(ncns);

    /* incompleteShift */
    const incompleteShift = _.get(summary, 'incompleteShift', 0);
    totalSum[18].push(incompleteShift);
    d.push(incompleteShift);

    /* Late Drop */
    const lateDrop = _.chain(unassignDriverShifts)
      .get(k, [])
      .filter(v => _.get(v, 'driver.lateDrop', 0) > 0)
      .value();
    totalSum[19].push(lateDrop.length);
    d.push(lateDrop.length);

    const pickupFailEvent = _.get(summary, 'pickupFailEvent', 0);
    const totalEvent = _.get(summary, 'totalEvent', 0);
    const failRate = (pickupFailEvent / totalEvent) * 100;
    const finalFailRate = _.isFinite(failRate) ? failRate : 0;

    /* Fail Rate */
    d.push(`${finalFailRate.toFixed(2)}%`);

    result.push(d);
  });

  result = _.sortBy(result, v => -v[3]);
  result.unshift(column);

  const dollarIndex = [7, 8, 9, 10, 11, 13, 14, 15];
  const ans = _.map(totalSum, (v, i) => {

    let result = null;

    if (i === 0 || i === 1) {
      return '';
    }

    /* Get the final order per hour */
    if (i === 12) {

      const finalorderPerHour = _.isNaN(totalOrders / totalHours) ? 0 : (totalOrders / totalHours).toFixed(1)
      return finalorderPerHour;
    }

    /* Get the total distribution / total hour */
    if (i === 11) {

      const averagePayPerHour = _.isNaN(totalDistribution / totalHours) ? 0 : (totalDistribution / totalHours).toFixed(1);
      return averagePayPerHour;
    }

    /* Get mean of some values  */
    if (_.includes([2, 11, 12, 13, 14, 15], i)) {

      result = _.mean(v).toFixed(2);
    } else {
      result = _.sum(v).toFixed(2);
    }

    /* Add dollar sign for some values */
    return _.includes(dollarIndex, i) ? `$${result}` : `${result}`;

  })
  result.push(ans);

  /* convert the result array into */
  const content = result.join('\n');

  const pullDataEnd = moment.now();

  console.log(`The time spent processing the data is${(pullDataEnd - begin) / 1000}s`);
  d3.select(element)
    .selectAll('*')
    .remove();

  /* Add download link */
  d3.select(element)
    .append('a')
    .attr('href', `data:text/csv;charset=utf-8,${encodeURI(content)}`)
    .attr('download', 'result.csv')
    .text('Click here to download')
    .style('display', 'block')
    .style('padding', '10px');

  const table = d3
    .select(element)
    .append('table')
    .style('border-collapse', 'collapse')
    .style('border', '2px black solid');

  // headers
  table
    .append('thead')
    .append('tr')
    .selectAll('th')
    .data(result[0])
    .enter()
    .append('th')
    .text(d => d)
    .style('border', '1px black solid')
    .style('padding', '5px')
    .style('background-color', 'lightgray')
    .style('font-weight', 'bold')
    .style('text-transform', 'uppercase');

  // data
  table
    .append('tbody')
    .selectAll('tr')
    .data(result.slice(1))
    .enter()
    .append('tr')
    .selectAll('td')
    .data(d => d)
    .enter()
    .append('td')
    .style('border', '1px black solid')
    .style('padding', '5px')
    .on('mouseover', function() {
      d3.select(this).style('background-color', 'powderblue');
    })
    .on('mouseout', function() {
      d3.select(this).style('background-color', 'white');
    })
    .text(d => d)
    .style('font-size', '12px');
}
