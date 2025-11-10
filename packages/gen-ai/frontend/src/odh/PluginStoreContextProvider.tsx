import * as React from 'react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import extensions from './extensions';

const PLUGIN_NAME = 'plugin-gen-ai';

export const PluginStoreContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = React.useMemo(
    () => new PluginStore({ [PLUGIN_NAME]: extensions }),
    [],
  );
  return <PluginStoreProvider store={store}>{children}</PluginStoreProvider>;
};

