import FrequencyRoute from './server/routes/frequency_route';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'customers_purchase_frequency',
    uiExports: {
      hacks: [
        'plugins/customers_purchase_frequency/frequency_type'
      ],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) { // eslint-disable-line no-unused-vars
      // Add server routes and initialize the plugin here
      FrequencyRoute(server);
    }
  });
}
