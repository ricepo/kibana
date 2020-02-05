import echarts from 'echarts';

export function showChart(measures,elementId,data){
  const div = document.getElementById(elementId)
  echarts.dispose(div)
  const myChart = echarts.init(div,undefined,{
    width: measures.allWidth,
    height: measures.allHeight,
  });
  // set options for chart
  const option = {
    title: {
      text: 'Restaurant Monthly Report'
    },
    tooltip : {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
            backgroundColor: '#6a7985'
        }
      }
    },
    legend: {
      data:[ 'Total', 'Active' ]
    },
    toolbox: {
      feature: {
          saveAsImage: {}
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis : {
      data: data.xAxis
    },
    yAxis : [
      {
        type : 'value'
      }
    ],
    series : [
      {
        name:'Total',
        type:'line',
        areaStyle: {},
        data: data.total
      },
      {
        name:'Active',
        type:'line',
        areaStyle: {},
        data: data.active
      }
    ]
  };

  // use options to generate chart
  myChart.setOption(option);
}
