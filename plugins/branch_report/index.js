import BranchReportRoute from './server/routes/branch_report';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'branch_report',
    uiExports: {
      hacks: ['plugins/branch_report/branch_report'],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) {
      // eslint-disable-line no-unused-vars
      // Add server routes and initialize the plugin here
      BranchReportRoute(server);
    },
  });
}
