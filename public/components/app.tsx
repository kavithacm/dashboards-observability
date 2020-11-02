import { I18nProvider } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import { ChromeBreadcrumb, CoreStart, IUiSettingsClient } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import { SearchBarProps } from './common';
import { FilterType } from './common/filters/filters';
import { renderPageWithSidebar } from './common/side_nav';
import { Dashboard } from './dashboard';
import { Services, ServiceView } from './services';
import { Traces, TraceView } from './traces';

interface TraceAnalyticsAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  uiSettings: IUiSettingsClient;
  chrome: CoreStart['chrome'];
  navigation: NavigationPublicPluginStart;
}

export interface CoreDeps {
  http: CoreStart['http'];
  uiSettings: IUiSettingsClient;
  setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => void;
}

export const TraceAnalyticsApp = ({
  basename,
  notifications,
  http,
  uiSettings,
  chrome,
  navigation,
}: TraceAnalyticsAppDeps) => {
  const storedFilters = window.localStorage.getItem('TraceAnalyticsFilters');
  const [query, setQuery] = useState<string>(
    window.localStorage.getItem('TraceAnalyticsQuery') || ''
  );
  const [filters, setFilters] = useState<FilterType[]>(
    storedFilters ? JSON.parse(storedFilters) : []
  );
  const [startTime, setStartTime] = useState<string>(
    window.localStorage.getItem('TraceAnalyticsStartTime') || '2020-10-15T14:00:00.000Z'
  );
  const [endTime, setEndTime] = useState<string>(
    window.localStorage.getItem('TraceAnalyticsEndTime') || '2020-10-15T15:30:00.000Z'
  );

  const setFiltersWithStorage = (newFilters: FilterType[]) => {
    setFilters(newFilters);
    window.localStorage.setItem('TraceAnalyticsFilters', JSON.stringify(newFilters));
  };
  const setQueryWithStorage = (newQuery: string) => {
    setQuery(newQuery);
    window.localStorage.setItem('TraceAnalyticsQuery', newQuery);
  };
  const setStartTimeWithStorage = (newStartTime: string) => {
    setStartTime(newStartTime);
    window.localStorage.setItem('TraceAnalyticsStartTime', newStartTime);
  };
  const setEndTimeWithStorage = (newEndTime: string) => {
    setEndTime(newEndTime);
    window.localStorage.setItem('TraceAnalyticsEndTime', newEndTime);
  };

  const commonProps: SearchBarProps & CoreDeps = {
    http,
    uiSettings,
    setBreadcrumbs: chrome.setBreadcrumbs,
    query,
    setQuery: setQueryWithStorage,
    filters,
    setFilters: setFiltersWithStorage,
    startTime,
    setStartTime: setStartTimeWithStorage,
    endTime,
    setEndTime: setEndTimeWithStorage,
  };

  return (
    <HashRouter basename={basename}>
      <I18nProvider>
        <>
          <Switch>
            <Route
              exact
              path={['/dashboard', '/']}
              render={(props) => renderPageWithSidebar(<Dashboard {...commonProps} />, 1)}
            />
            <Route
              exact
              path="/traces"
              render={(props) => renderPageWithSidebar(<Traces {...commonProps} />, 2)}
            />
            <Route
              path="/traces/:id+"
              render={(props) => (
                <TraceView
                  setBreadcrumbs={chrome.setBreadcrumbs}
                  http={http}
                  uiSettings={uiSettings}
                  traceId={decodeURIComponent(props.match.params.id)}
                />
              )}
            />
            <Route
              exact
              path="/services"
              render={(props) => renderPageWithSidebar(<Services {...commonProps} />, 3)}
            />
            <Route
              path="/services/:id+"
              render={(props) => (
                <ServiceView
                  serviceName={decodeURIComponent(props.match.params.id)}
                  {...commonProps}
                  addFilter={(filter: FilterType) => {
                    const newFilters = [...filters, filter];
                    setFiltersWithStorage(newFilters);
                  }}
                />
              )}
            />
          </Switch>
        </>
      </I18nProvider>
    </HashRouter>
  );
};
