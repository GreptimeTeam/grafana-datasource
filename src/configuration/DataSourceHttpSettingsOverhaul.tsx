import React, { useState } from 'react';

import { DataSourceSettings } from '@grafana/data';
import { Auth, ConnectionSettings, convertLegacyAuthProps, AuthMethod } from '@grafana/experimental';

import { SecureSocksProxySettings, useTheme2 } from '@grafana/ui';
import { AzureAuthSettings } from '../grafanaui/types';

import { PromOptions } from '../types';

import { docsTip, overhaulStyles } from './ConfigEditor';
import { CustomMethod } from './overhaul/types';
import DatabaseNameSettings from './DatabaseNameSettings';
type Props = {
  options: DataSourceSettings<PromOptions, {}>;
  onOptionsChange: (options: DataSourceSettings<PromOptions, {}>) => void;
  azureAuthSettings: AzureAuthSettings;
  sigV4AuthToggleEnabled: boolean | undefined;
  renderSigV4Editor: React.ReactNode;
  secureSocksDSProxyEnabled: boolean;
};

export const DataSourcehttpSettingsOverhaul = (props: Props) => {
  const {
    options,
    onOptionsChange,
    azureAuthSettings,
    sigV4AuthToggleEnabled,
    renderSigV4Editor,
    secureSocksDSProxyEnabled,
  } = props;

  const newAuthProps = convertLegacyAuthProps({
    config: options,
    onChange: onOptionsChange,
  });

  const theme = useTheme2();
  const styles = overhaulStyles(theme);

  // for custom auth methods sigV4 and azure auth
  let customMethods: CustomMethod[] = [];

  const [sigV4Selected, setSigV4Selected] = useState<boolean>(options.jsonData.sigV4Auth || false);

  const sigV4Id = 'custom-sigV4Id';

  const sigV4Option: CustomMethod = {
    id: sigV4Id,
    label: 'SigV4 auth',
    description: 'This is SigV4 auth description',
    component: <>{renderSigV4Editor}</>,
  };

  if (sigV4AuthToggleEnabled) {
    customMethods.push(sigV4Option);
  }

  const azureAuthEnabled: boolean =
    (azureAuthSettings?.azureAuthSupported && azureAuthSettings.getAzureAuthEnabled(options)) || false;

  const [azureAuthSelected, setAzureAuthSelected] = useState<boolean>(azureAuthEnabled);

  const azureAuthId = 'custom-azureAuthId';

  const azureAuthOption: CustomMethod = {
    id: azureAuthId,
    label: 'Azure auth',
    description: 'This is Azure auth description',
    component: (
      <>
        {azureAuthSettings.azureSettingsUI && (
          <azureAuthSettings.azureSettingsUI dataSourceConfig={options} onChange={onOptionsChange} />
        )}
      </>
    ),
  };

  // allow the option to show in the dropdown
  if (azureAuthSettings?.azureAuthSupported) {
    customMethods.push(azureAuthOption);
  }

  function returnSelectedMethod() {
    if (sigV4Selected) {
      return sigV4Id;
    }

    if (azureAuthSelected) {
      return azureAuthId;
    }

    return newAuthProps.selectedMethod;
  }

  // Do we need this switch anymore? Update the language.
  let urlTooltip;
  switch (options.access) {
    case 'direct':
      urlTooltip = (
        <>
          Your access method is <em>Browser</em>, this means the URL needs to be accessible from the browser.
          {docsTip()}
        </>
      );
      break;
    case 'proxy':
      urlTooltip = (
        <>
          Your access method is <em>Server</em>, this means the URL needs to be accessible from the grafana
          backend/server.
          {docsTip()}
        </>
      );
      break;
    default:
      urlTooltip = <>Specify a complete HTTP URL (for example http://your_server:8080) {docsTip()}</>;
  }

  return (
    <>
      <ConnectionSettings
        urlPlaceholder="http://localhost:9090"
        config={options}
        onChange={onOptionsChange}
        urlLabel="GreptimeDB server URL"
        urlTooltip={urlTooltip}
      />
      <hr/>
      <DatabaseNameSettings 
        config={options}
        onChange={onOptionsChange}/>
      <hr></hr>
      <Auth
        {...newAuthProps}
        visibleMethods={[AuthMethod.NoAuth, AuthMethod.BasicAuth]}
        customMethods={customMethods}
        onAuthMethodSelect={(method) => {
          // sigV4Id
          if (sigV4AuthToggleEnabled) {
            setSigV4Selected(method === sigV4Id);
          }

          // Azure
          if (azureAuthSettings?.azureAuthSupported) {
            setAzureAuthSelected(method === azureAuthId);
            azureAuthSettings.setAzureAuthEnabled(options, method === azureAuthId);
          }

          onOptionsChange({
            ...options,
            basicAuth: method === AuthMethod.BasicAuth,
            withCredentials: method === AuthMethod.CrossSiteCredentials,
            jsonData: {
              ...options.jsonData,
              sigV4Auth: method === sigV4Id,
              oauthPassThru: method === AuthMethod.OAuthForward,
            },
          });
        }}
        // If your method is selected pass its id to `selectedMethod`,
        // otherwise pass the id from converted legacy data
        selectedMethod={returnSelectedMethod()}
      />
      <div className={styles.sectionBottomPadding} />
      {secureSocksDSProxyEnabled && (
        <>
          <SecureSocksProxySettings options={options} onOptionsChange={onOptionsChange} />
          <div className={styles.sectionBottomPadding} />
        </>
      )}
    </>
  );
};
