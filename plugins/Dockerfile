FROM docker.elastic.co/kibana/kibana:7.5.2

RUN mkdir kibana-extra

COPY active_customers/build/active_customers-0.0.0.zip kibana-extra/
COPY cohort/build/cohort-0.0.0.zip kibana-extra/
COPY l_30/build/l_30-0.0.0.zip kibana-extra/
COPY power_user_curv/build/power_user_curv-0.0.0.zip kibana-extra/
COPY branch_report/build/branch_report-0.0.0.zip kibana-extra/
COPY customers_purchase_frequency/build/customers_purchase_frequency-0.0.0.zip kibana-extra/
COPY driver_weeekly_report/build/driver_weeekly_report-0.0.0.zip kibana-extra/
COPY new_drivers_cohort/build/new_drivers_cohort-0.0.0.zip kibana-extra/
COPY restaurant_monthly_report/build/restaurant_monthly_report-0.0.0.zip kibana-extra/

RUN kibana-plugin install file:///usr/share/kibana/kibana-extra/active_customers-0.0.0.zip
RUN kibana-plugin install file:///usr/share/kibana/kibana-extra/cohort-0.0.0.zip
RUN kibana-plugin install file:///usr/share/kibana/kibana-extra/l_30-0.0.0.zip
RUN kibana-plugin install file:///usr/share/kibana/kibana-extra/power_user_curv-0.0.0.zip
RUN kibana-plugin install file:///usr/share/kibana/kibana-extra/branch_report-0.0.0.zip
RUN kibana-plugin install file:///usr/share/kibana/kibana-extra/customers_purchase_frequency-0.0.0.zip
RUN kibana-plugin install file:///usr/share/kibana/kibana-extra/driver_weeekly_report-0.0.0.zip
RUN kibana-plugin install file:///usr/share/kibana/kibana-extra/new_drivers_cohort-0.0.0.zip
RUN kibana-plugin install file:///usr/share/kibana/kibana-extra/restaurant_monthly_report-0.0.0.zip


