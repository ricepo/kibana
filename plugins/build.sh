# pleas first cd into `kibana-extra` 
rm -rf ./*/build && \
cd active_customers/ && yarn build && \
cd ../branch_report/ && yarn build && \
cd ../cohort/ && yarn build && \
cd ../customer_coupon_cohort/ && yarn build && \
cd ../customers_purchase_frequency/ && yarn build && \
cd ../driver_weeekly_report/ && yarn build && \
cd ../l_30/ && yarn build && \
cd ../new_drivers_cohort/ && yarn build && \
cd ../power_user_curv/ && yarn build && \
cd ../restaurant_monthly_report/ && yarn build && \
cd ../new_branch_report/ && yarn build && \
cd ../active_customers_cohort/ && yarn build && \
cd ../active_drivers_cohort/ && yarn build && \
cd ../customer_visit_cohort/ && yarn build && \
cd .. && docker build -t kibana .