import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '~/app/standalone/AppLayout';
import { AppRoutes } from '~/app/AppRoutes';
import { chatPlaygroundRootPath, globGenAiAll } from '~/app/utilities/routes';
import { PluginStoreContextProvider } from '~/odh/PluginStoreContextProvider';
import '@patternfly/react-core/dist/styles/base.css';
import './app.css';

const App: React.FunctionComponent = () => (
  <PluginStoreContextProvider>
    <AppLayout>
      <Routes>
        <Route path={`${globGenAiAll}`} element={<AppRoutes />} />
        <Route path="*" element={<Navigate to={chatPlaygroundRootPath} replace />} />
      </Routes>
    </AppLayout>
  </PluginStoreContextProvider>
);

export default App;
