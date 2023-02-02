/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const delay = 100;

export const PPL_METRICS_NAMES = [
  'Average value by metric handler request in flight',
  'Average value by virtual memory bytes',
  'Average value by cpu seconds total',
  'Average value by memstats stat bytes',
  'Average value by memstats heap allocation bytes',
];

export const PPL_METRICS = [
  'source = prometheus.promhttp_metric_handler_requests_in_flight | stats avg(@value) by span(@timestamp,1h)',
  'source = prometheus.process_virtual_memory_bytes | stats avg(@value) by span(@timestamp,1h)',
  'source = prometheus.process_cpu_seconds_total | stats avg(@value) by span(@timestamp,1h)',
];

export const VIS_TYPE_LINE = 'Time Series';