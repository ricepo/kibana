import cohortRoute from './server/routes/cohort';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'cohort',
    uiExports: {
      hacks: ['plugins/cohort/cohort_type'],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) {
      // eslint-disable-line no-unused-vars

      // Add server routes and initialize the plugin here
      cohortRoute(server);
    },
  });
}
