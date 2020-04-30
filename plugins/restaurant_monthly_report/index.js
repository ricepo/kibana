import RestaurnatMonthlyReportRoute from './server/routes/restaurant_monthly_report';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'restaurant_monthly_report',
    uiExports: {
      hacks: ['plugins/restaurant_monthly_report/restaurant_monthly_report'],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) {
      // eslint-disable-line no-unused-vars
      // Add server routes and initialize the plugin here
      RestaurnatMonthlyReportRoute(server);
    },
  });
}
