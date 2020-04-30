import driverWeeklyReportRoute from './server/routes/driver_weekly_report';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'driver_weeekly_report',
    uiExports: {
      hacks: ['plugins/driver_weeekly_report/driver_weekly_report'],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) {
      // eslint-disable-line no-unused-vars
      // Add server routes and initialize the plugin here
      driverWeeklyReportRoute(server);
    },
  });
}
