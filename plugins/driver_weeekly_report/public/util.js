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
      text: 'Driver Weekly Report'
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
      data:[ 'New Driver', 'Active last 4 week', 'Active last 2 week']
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
        name:'New Driver',
        type:'line',
        areaStyle: {},
        data: data.totalNew
      },
      {
        name:'Active last 4 week',
        type:'line',
        areaStyle: {},
        data: data.active4week
      },
      {
        name:'Active last 2 week',
        type:'line',
        areaStyle: {},
        data: data.active2Week
      }
    ]
  };

  // use options to generate chart
  myChart.setOption(option);
}
