import d3 from 'd3';
import moment from 'moment-timezone';



/**
 * @param {HTMLElement} element
 * @param {array} data
 */
export function showTable(element, data) {

  const column = [
    'Region',
    'Customers','Orders','Frequency',
    '10 <= Customers','%','Orders','%','Frequency',
    '5 <= Customers < 10','%','Orders','%','Frequency',
    '3 <= Customers < 5','%','Orders','%','Frequency',
    'Customers < 3','%','Orders','%','Frequency',
  ];
  const result = [];
  result.push(column)
  _.forEach(data,v => {
    const arr = [
      v.name,v.customers,v.orders,v.frequency,
      v.gte10Cusomers,v.gte10CusomersPercentage,v.gte10Orders,v.gte10OrdersPercentage,v.gte10Frequency,
      v.gte5lt10Cusomers,v.gte5lt10CusomersPercentage,v.gte5lt10Orders,v.gte5lt10OrdersPercentage,v.gte5lt10Frequency,
      v.gte3lt5Cusomers,v.gte3lt5CusomersPercentage,v.gte3lt5Orders,v.gte3lt5OrdersPercentage,v.gte3lt5Frequency,
      v.lt3Customers,v.lt3CustomersPercentage,v.lt3Orders,v.lt3OrdersPercentage,v.lt3Frequency,
    ];
    result.push(arr)
  })
  d3.select(element).selectAll("*").remove(); 
  const table = d3.select(element).append('table')
                .style("border-collapse", "collapse")
                .style("border", "2px black solid");
  // headers
  table.append("thead").append("tr")
    .selectAll("th")
    .data(result[0])
    .enter().append("th")
    .text(function(d) { return d; })
    .style("border", "1px black solid")
    .style("padding", "5px")
    .style("background-color", "lightgray")
    .style("font-weight", "bold")
    .style("vertical-align", "middle")
    .style("text-align", "center")
    .style("text-transform", "uppercase");

  // data
  table.append("tbody")
    .selectAll("tr").data(result.slice(1))
    .enter().append("tr")
    .selectAll("td")
    .data(function(d){return d;})
    .enter().append("td")
    .style("border", "1px black solid")
    .style("padding", "5px")
    .style("vertical-align", "middle")
    .style("text-align", "center")
    .on("mouseover", function(){
    d3.select(this).style("background-color", "powderblue");
  })
    .on("mouseout", function(){
    d3.select(this).style("background-color", "white");
  })
    .text(function(d){return d;})
    .style("font-size", "12px");
}
/**
 * format dateTime by timezone
 * @param {String|date} dateTime 
 * @param {String} timezone 
 * @param {String} format 
 */
export function formatDateTime(dateTime,timezone = "America/New_York",format){
  return moment(datemath.parse(dateTime)).tz(timezone).format(format)
}