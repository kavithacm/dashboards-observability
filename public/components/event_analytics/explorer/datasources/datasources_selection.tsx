/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { batch, useDispatch, useSelector } from 'react-redux';
import { LogExplorerRouterContext } from '../..';
import {
  DataSourceGroup,
  DataSourceSelectable,
  DataSourceType,
} from '../../../../../../../src/plugins/data/public';
import { coreRefs } from '../../../../framework/core_refs';
import {
  selectSearchMetaData,
  update as updateSearchMetaData,
} from '../../../event_analytics/redux/slices/search_meta_data_slice';
import { reset as resetCountDistribution } from '../../redux/slices/count_distribution_slice';
import { reset as resetFields } from '../../redux/slices/field_slice';
import { reset as resetPatterns } from '../../redux/slices/patterns_slice';
import { reset as resetQueryResults } from '../../redux/slices/query_result_slice';
import { reset as resetVisualization } from '../../redux/slices/visualization_slice';
import { reset as resetVisConfig } from '../../redux/slices/viualization_config_slice';
import { reset as resetQuery } from '../../redux/slices/query_slice';
import { DirectQueryRequest, SelectedDataSource } from '../../../../../common/types/explorer';
import { ObservabilityDefaultDataSource } from '../../../../framework/datasources/obs_opensearch_datasource';
import {
  DATA_SOURCE_TYPE_URL_PARAM_KEY,
  DATA_SOURCE_NAME_URL_PARAM_KEY,
  DEFAULT_DATA_SOURCE_NAME,
  DEFAULT_DATA_SOURCE_TYPE,
  DEFAULT_DATA_SOURCE_TYPE_NAME,
  DEFAULT_DATA_SOURCE_OBSERVABILITY_DISPLAY_NAME,
  DATA_SOURCE_TYPES,
  QUERY_LANGUAGE,
} from '../../../../../common/constants/data_sources';
import { SQLService } from '../../../../services/requests/sql';
import { get as getObjValue } from '../../../../../common/utils/shared';
import {
  setAsyncSessionId,
  getAsyncSessionId,
} from '../../../../../common/utils/query_session_utils';
import { DIRECT_DUMMY_QUERY } from '../../../../../common/constants/shared';

const getDataSourceState = (selectedSourceState: SelectedDataSource[]) => {
  if (selectedSourceState.length === 0) return [];
  return [
    {
      label: selectedSourceState[0].label,
      value: selectedSourceState[0].value,
      type: selectedSourceState[0].type,
      name: selectedSourceState[0].name,
    },
  ];
};

const removeDataSourceFromURLParams = (currURL: string) => {
  // Parse the current URL
  const currentURL = new URL(currURL);

  // Split the hash into its base and query parts
  const [hashBase, hashQuery] = currentURL.hash.split('?');

  if (hashQuery) {
    // Convert the hash query into a URLSearchParams object for easier manipulation
    const hashParams = new URLSearchParams(hashQuery);

    // Remove the data source redirection parameters
    hashParams.delete(DATA_SOURCE_NAME_URL_PARAM_KEY);
    hashParams.delete(DATA_SOURCE_TYPE_URL_PARAM_KEY);

    // Reconstruct the hash
    currentURL.hash = hashParams.toString() ? `${hashBase}?${hashParams.toString()}` : hashBase;

    // Update the browser's address bar
    history.replaceState({}, '', currentURL.toString());
  }
};

export const DataSourceSelection = ({ tabId }: { tabId: string }) => {
  const { dataSources, http } = coreRefs;
  const sqlService = new SQLService(http!);
  const dispatch = useDispatch();
  const routerContext = useContext(LogExplorerRouterContext);
  const explorerSearchMetadata = useSelector(selectSearchMetaData)[tabId];
  const [activeDataSources, setActiveDataSources] = useState<DataSourceType[]>([]);
  const [dataSourceOptionList, setDataSourceOptionList] = useState<DataSourceGroup[]>([]);
  const [selectedSources, setSelectedSources] = useState<SelectedDataSource[]>(
    getDataSourceState(explorerSearchMetadata.datasources)
  );

  /**
   * Resets various states associated with data source changes.
   */
  const resetStateOnDataSourceChange = () => {
    dispatch(resetQuery({ tabId }));
    dispatch(resetFields({ tabId }));
    dispatch(resetFields({ tabId }));
    dispatch(resetPatterns({ tabId }));
    dispatch(resetQueryResults({ tabId }));
    dispatch(resetVisConfig({ tabId }));
    dispatch(resetVisualization({ tabId }));
    dispatch(resetCountDistribution({ tabId }));
  };

  /**
   * Handle the changes in the data source selection.
   *
   * @param {SelectedDataSource[]} selectedSource - The newly selected data source(s).
   */
  const handleSourceChange = (selectedSource: SelectedDataSource[]) => {
    batch(() => {
      resetStateOnDataSourceChange();
      dispatch(
        updateSearchMetaData({ tabId, data: { datasources: getDataSourceState(selectedSource) } })
      );
    });
    setSelectedSources(selectedSource);
  };

  const runDummyQuery = (dataSource: string) => {
    const requestPayload = {
      lang: QUERY_LANGUAGE.SQL.toLowerCase(),
      query: DIRECT_DUMMY_QUERY,
      datasource: dataSource,
    } as DirectQueryRequest;

    sqlService
      .fetch(requestPayload)
      .then((result) => {
        setAsyncSessionId(getObjValue(result, 'sessionId', null));
      })
      .catch((e) => {
        console.error(e);
      });
  };

  useEffect(() => {
    setSelectedSources(getDataSourceState(explorerSearchMetadata.datasources));
  }, [explorerSearchMetadata.datasources]);

  const handleDataSetFetchError = useCallback(() => {
    return (error: Error) => {
      console.error('Error fetching dataset:', error);
    };
  }, []);

  /**
   * Subscribe to data source updates and manage the active data sources state.
   */
  useEffect(() => {
    const subscription = dataSources.dataSourceService.dataSources$.subscribe(
      (currentDataSources) => {
        // temporary solution for 2.11 to render OpenSearch / default cluster for observability
        // local indices and index patterns, while keep listing all index patterns for data explorer
        // it filters the registered index pattern data sources in data plugin, and attach default cluster
        // for all indices
        setActiveDataSources([
          new ObservabilityDefaultDataSource({
            name: DEFAULT_DATA_SOURCE_NAME,
            type: DEFAULT_DATA_SOURCE_TYPE,
            metadata: null,
          }),
          ...Object.values(currentDataSources).filter((ds) => ds.type !== DEFAULT_DATA_SOURCE_TYPE),
        ]);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Check for URL parameters to update the data source if redirected from discover.
   * Removes data source name and type from URL after processing. This is temporary solution for 2.11
   * as observability log explorer will adopt view service.
   */
  useEffect(() => {
    const datasourceName = routerContext?.searchParams.get(DATA_SOURCE_NAME_URL_PARAM_KEY);
    const datasourceType = routerContext?.searchParams.get(DATA_SOURCE_TYPE_URL_PARAM_KEY);
    if (datasourceName && datasourceType) {
      // remove datasourceName and datasourceType from URL for a clean search state
      removeDataSourceFromURLParams(window.location.href);
      batch(() => {
        resetStateOnDataSourceChange();
        dispatch(
          updateSearchMetaData({
            tabId,
            data: { datasources: [{ label: datasourceName, type: datasourceType }] },
          })
        );
      });
    }
  }, []);

  useEffect(() => {
    // Execute a dummy query to initialize the cluster and obtain a sessionId for subsequent queries.
    const dsType = explorerSearchMetadata.datasources?.[0]?.type;
    const dsName = explorerSearchMetadata.datasources?.[0]?.label;
    if (
      !getAsyncSessionId() &&
      [DATA_SOURCE_TYPES.SPARK, DATA_SOURCE_TYPES.S3Glue].includes(dsType) &&
      dsName
    ) {
      runDummyQuery(dsName);
    }
  }, [explorerSearchMetadata.datasources]);

  /**
   * Process the data source options to display different than discover's group names.
   * Temporary solution for version 2.11.
   */
  const memorizedDataSourceOptionList = useMemo(() => {
    return dataSourceOptionList.map((dsOption) => {
      if (dsOption.label === DEFAULT_DATA_SOURCE_TYPE_NAME) {
        dsOption.label = DEFAULT_DATA_SOURCE_OBSERVABILITY_DISPLAY_NAME;
      }
      return dsOption;
    });
  }, [dataSourceOptionList]);

  return (
    <DataSourceSelectable
      className="dsc-selector"
      dataSources={activeDataSources}
      dataSourceOptionList={memorizedDataSourceOptionList}
      setDataSourceOptionList={setDataSourceOptionList}
      selectedSources={selectedSources}
      onDataSourceSelect={handleSourceChange}
      onFetchDataSetError={handleDataSetFetchError}
      singleSelection={{ asPlainText: true }}
    />
  );
};
