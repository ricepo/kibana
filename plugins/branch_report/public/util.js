import d3 from 'd3';
import moment from 'moment-timezone';
import { extendMoment }  from 'moment-range';
import _ from 'lodash';

const Moment       = extendMoment(moment);


/**
 * @params { string } regionName
 * @returns { number }
 */
export const getDriverRate = (regionName) => {

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
    'twin cities,mn': 0
  };

  /* return rate if present */
  if (region[regionName]) {

    return region[regionName];
  }

  return 0;
};

/**

 * @param {HTMLElement} element
 * @params { Object } data
 */
export function showTable(element, data) {

  const begin = moment();

  /* Get data */
  const { orders, jobs, shifts, shiftEvents, orderEvents, orderEventsEnRoute } = data;

  /* to calculate total */
  const total = {
    averageDeliveryTime:  [],
    orders:               [],
    hours:                [],
    distribution:         [],
    guaranteeAdjustments: [],
    driverPay:            [],
    payPerHour:           [],
    orderPerHour:         [],
    payPerOrder:          [],
    commissionPerOrder:   [],
    tipPerOrder:          [],
    onlineHours:          [],
    noCallnoShow:         [],
    incompleteShift:      [],
    lateDrop:             [],
    failRate:             [],
    cambridgeFailRate:    []
  };


  const totalSum = _.times(18, _.constant(0));

  const column = [
    'city', 'email', 'average Delivery Time', 'orders', 'Total Online Hours', 'Shift Online Hours', 'Total Distribution',
    'Guarantee Adjustments', 'Manual Adjustments', 'Total distribution  w/o adj', 'payPerHour', 'orderPerHour',  'payPerOrder',
    'commissionPerOrder', 'tipPerOrder', 'Assigned Shift Hours', 'noCall noShow',
    'incompleteShift', 'late Drop', 'fail Rate', 'cambridge FailRate'
  ];

  let result = [];


  _.forEach(orders, v => {

    const regionName = v.regionName;
    const driverEmail = v.email;
    const driverid    = v.driverid;
    const driverName = _.split(driverEmail, '@')[0];
    const lateDrop = _.get(shiftEvents[driverEmail], 'lateDrop', 0);
    const noCallnoShowDrop = _.get(shiftEvents[driverEmail], 'noCallnoShowDrop', 0);

    const d = [];

    d.push(_.split(regionName, ',')[0]);
    d.push(`${_.toUpper(driverName.slice(0, 3))}${driverName.slice(3)}`);

    const driverJobs = _.chain(jobs)
      .get(driverEmail)
      .sortBy(['start'])
      .value();
    const driverShifts = _.chain(shifts)
      .get(driverEmail)
      .sortBy(['start'])
      .value();
    const duration = _.isFinite((_.sumBy(driverJobs, 'duration') / 60)) ? (_.sumBy(driverJobs, 'duration') / 60) : 0;
    const orders = v.orders;
    const distribution = v.distributionSum / 100;
    const adjustments = v.adjustmentSum / 100;
    const averageDeliveryTime = v.deliveryTimeSum / orders;


    /* Average Delivery Time */
    totalSum[1] += _.isNaN(averageDeliveryTime) ? 0 : averageDeliveryTime;
    d.push(averageDeliveryTime.toFixed());

    /* Driver total orders */
    totalSum[2] += orders;
    d.push(orders);

    const { hours = 0, noCallnoShow = 0, incompleteShift = 0, shiftHours = 0 } = getInterval(driverJobs, driverShifts);

    /* Driver online Duration */
    totalSum[3] += duration;
    d.push(duration.toFixed(1));

    /* hours */
    totalSum[4] += hours / 60;
    d.push((hours / 60).toFixed(1));


    /* Driver distribution */
    totalSum[5] += distribution;
    d.push(`$${distribution.toFixed()}`);

    const guaranteePay = ((hours / 60) * getDriverRate(regionName) + v.adjustmentSum) / 100;
    const guaranteeAdjustments = (guaranteePay - distribution) > 0 ? (guaranteePay - distribution) : 0;


    /* guarantee adjustments */
    totalSum[6] += guaranteeAdjustments;
    d.push(`$${guaranteeAdjustments.toFixed(2)}`);

    /* Driver adjustments */
    totalSum[7] += adjustments;
    d.push(`$${adjustments.toFixed(2)}`);

    /* driver dist - adj */
    totalSum[8] += (distribution - guaranteeAdjustments -  adjustments);
    d.push(`$${(distribution - guaranteeAdjustments -  adjustments).toFixed()}`);

    /* averagePayPerHour */
    const payPerHour = ((distribution - guaranteeAdjustments -  adjustments) / (hours / 60));
    const finalPayPerHour = _.isFinite(payPerHour) ? payPerHour : 0;

    totalSum[9] += finalPayPerHour;

    d.push(`$${finalPayPerHour.toFixed(2)}`);

    /* order/hour */
    const orderPerHour = _.isFinite(orders / (hours / 60)) ? (orders / (hours / 60)) : 0;

    totalSum[10] += orderPerHour;
    d.push(orderPerHour.toFixed(2));

    /* pay/order */
    const payPerOrder = ((distribution - guaranteeAdjustments -  adjustments) / orders);

    totalSum[11] += (_.isFinite(payPerOrder) ? payPerOrder : 0);
    d.push(`$${payPerOrder.toFixed(2)}`);

    /* commission per order */
    const commissionPerOrder = (v.commissionSum / orders) / 100;

    totalSum[12] += (_.isFinite(commissionPerOrder) ? commissionPerOrder : 0);
    d.push(`$${commissionPerOrder.toFixed(2)}`);

    /* Tips/order */
    const tipPerOrder = _.isFinite(payPerOrder - commissionPerOrder) ? payPerOrder - commissionPerOrder : 0;

    totalSum[13] += tipPerOrder;
    d.push(`$${tipPerOrder.toFixed(2)}`);

    totalSum[14] += shiftHours / 60;
    d.push((shiftHours / 60).toFixed(1));


    /* No call No Show */
    const ncns = noCallnoShowDrop + noCallnoShow;

    totalSum[15] += ncns;
    d.push(ncns);

    /* incompleteShift */
    totalSum[16] += incompleteShift;
    d.push(incompleteShift);


    /* Late Drop */
    totalSum[17] += lateDrop;
    d.push(lateDrop);

    const pickupFailEvent = _.get(orderEvents[driverid], [ '0', 'ordersTotal' ]);
    const totalEvent = _.get(orderEventsEnRoute[driverid], [ '0', 'ordersTotal' ]);
    const failRate = (pickupFailEvent / totalEvent) * 100;
    const finalFailRate = _.isFinite(failRate) ? failRate : 0;

    /* Fail Rate */
    d.push(`${finalFailRate.toFixed(2)}%`);


    /* Check the driver with fail rate of cambridge */
    if (regionName === 'allston,ma') {

      const cambridgeRests = [
        'rest_SJeQ7gb3qa', '57f018078fb5010010401351', 'rest_Hy__vu2Fa', 'rest_kZkIVYwAa', 'rest_rkov-w3tN',
        'rest_SJaIDMkYH', 'rest_Bkgnl7O2YN', 'rest_Pdrw6F-O_'
      ];

      /* Get cambridge pickup fail rate */
      const cambridgepickupFail = _.chain(orderEvents[driverid])
        .filter(e => _.includes(cambridgeRests, _.get(e, 'restaurantId').toString()))
        .sumBy(v => v.orders)
        .value();

      /* total fail rate for cambridge */
      const cambridgetotalFail = _.chain(orderEventsEnRoute[driverid])
        .filter(e => _.includes(cambridgeRests, _.get(e, 'restaurantId').toString()))
        .sumBy(v => v.orders)
        .value();

      const cambridgeFailRate = ((cambridgepickupFail / cambridgetotalFail) * 100);
      const finalFailRate = _.isFinite(cambridgeFailRate) ? cambridgeFailRate : 0;

      d.push(`${finalFailRate.toFixed(2)}%`);

    }


    result.push(d);
  });



  result = _.sortBy(result, v => -v[3]);
  result.unshift(column);

  /* convert the result array into */
  const content = result.join('\n');

  const pullDataEnd = moment.now();

  console.log(`The time spent processing the data is${(pullDataEnd - begin) / 1000}s`);
  d3.select(element).selectAll('*').remove();

  /* Add download link */
  d3.select(element).append('a')
    .attr('href', `data:text/csv;charset=utf-8,${encodeURI(content)}`)
    .attr('download', 'result.csv')
    .text('Click here to download')
    .style('display', 'block')
    .style('padding', '10px');

  const table = d3.select(element).append('table')
    .style('border-collapse', 'collapse')
    .style('border', '2px black solid');


  // headers
  table.append('thead').append('tr')
    .selectAll('th')
    .data(result[0])
    .enter()
    .append('th')
    .text((d) => d)
    .style('border', '1px black solid')
    .style('padding', '5px')
    .style('background-color', 'lightgray')
    .style('font-weight', 'bold')
    .style('text-transform', 'uppercase');

  // data
  table.append('tbody')
    .selectAll('tr').data(result.slice(1))
    .enter()
    .append('tr')
    .selectAll('td')
    .data((d) => d)
    .enter()
    .append('td')
    .style('border', '1px black solid')
    .style('padding', '5px')
    .on('mouseover', function () {

      d3.select(this).style('background-color', 'powderblue');
    })
    .on('mouseout', function () {

      d3.select(this).style('background-color', 'white');
    })
    .text((d) => d)
    .style('font-size', '12px');

}


/**
 * Get interval
 */
function getInterval(jobs, shifts) {

  let driverActualHours = 0;
  let shiftHours = 0;
  let noCallnoShow = 0;
  let incompleteShift = 0;

  /* Get job interval of shifts */
  _.forEach(shifts, (s) => {

    let per = 0;

    /* Get total hours of shift */
    const total = moment(s.end).diff(moment(s.start), 'minutes');

    shiftHours += total;

    _.forEach(jobs, j => {

      /* Avoid all jobs who does not have end time */
      if(!j.end) {

        return;
      }

      /* Check if job and shift overlapped */
      if (j.start <= s.end && j.end >= s.start) {

        const start = Moment(j.start).isAfter(s.start) ? j.start : s.start;
        const end = Moment(j.end).isBefore(s.end) ? j.end : s.end;
        const jobTime = Moment(end).diff(Moment(start), 'minutes');

        driverActualHours += jobTime;

        per += ((jobTime / total).toFixed(2)) * 1;
      }

    });

    /* No call no show */
    if (per < 0.30) {
      noCallnoShow++;
    }

    /* incomplete shift */
    if (per < 0.80 && per >= 0.30) {
      incompleteShift++;
    }

  });

  return { hours: driverActualHours, noCallnoShow, incompleteShift, shiftHours };
}
