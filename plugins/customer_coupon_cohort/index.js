import cohortRoute from './server/routes/customer_coupon_cohort';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'customer_coupon_cohort',
    uiExports: {
      hacks: ['plugins/customer_coupon_cohort/cohort_type'],
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
