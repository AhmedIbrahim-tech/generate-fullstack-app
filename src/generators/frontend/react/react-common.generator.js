import path from 'node:path';
import { add } from '../../../utils/package-manager.js';
import { copyTemplate, templatesRoot, writeFile } from '../../../utils/filesystem.js';

/**
 * @param {object} frontend
 * @returns {string[]}
 */
export function resolveReactPackages(frontend = {}) {
  const packages = ['lucide-react', 'sonner', 'framer-motion'];

  // State
  if (frontend.state === 'redux' || !frontend.state) {
    packages.push('@reduxjs/toolkit', 'react-redux');
  } else if (frontend.state === 'zustand') {
    packages.push('zustand');
  }

  // HTTP Client
  if (frontend.httpClient === 'axios' || !frontend.httpClient) {
    packages.push('axios');
  }

  // Forms
  if (frontend.forms === 'react-hook-form-zod' || !frontend.forms) {
    packages.push('react-hook-form', '@hookform/resolvers', 'zod');
  }

  // Component systems & styling
  if (frontend.styling === 'bootstrap') {
    packages.push('bootstrap', 'react-bootstrap');
  }

  if (frontend.componentSystem === 'mui') {
    packages.push('@mui/material', '@emotion/react', '@emotion/styled');
  } else if (frontend.componentSystem === 'antd') {
    packages.push('antd');
  }

  // Real Time
  if (frontend.realtime === 'signalr') {
    packages.push('@microsoft/signalr');
  }

  return [...new Set(packages)];
}

/**
 * @param {{ clientDir: string, packageManager: 'npm' | 'yarn' | 'pnpm', replacements: Record<string, string>, frontend?: object }} options
 */
export async function overlayReactCommon(options) {
  await copyTemplate(
    path.join(templatesRoot(), 'frontend', 'react', 'common'),
    options.clientDir,
    options.replacements,
  );

  // Write SignalR service/hook if enabled
  if (options.frontend?.realtime === 'signalr') {
    await writeSignalRClient(options.clientDir);
  }
}

/**
 * @param {{ clientDir: string, packageManager: 'npm' | 'yarn' | 'pnpm', frontend?: object }} options
 */
export function installReactCommonPackages(options) {
  const packages = resolveReactPackages(options.frontend);
  add(options.packageManager, packages, {
    cwd: options.clientDir,
    step: 'Install React architecture packages',
  });
}

/**
 * @param {string} clientDir
 */
async function writeSignalRClient(clientDir) {
  const content = `import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export function useSignalR(hubUrl: string = "/hubs/app") {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          return localStorage.getItem("access_token") ?? "";
        },
      })
      .withAutomaticReconnect()
      .build();

    conn
      .start()
      .then(() => {
        setIsConnected(true);
        setConnection(conn);
      })
      .catch((err) => {
        console.warn("SignalR connection error:", err);
      });

    return () => {
      conn.stop();
    };
  }, [hubUrl]);

  return { connection, isConnected };
}
`;
  await writeFile(path.join(clientDir, 'src', 'shared', 'services', 'useSignalR.ts'), content);
}
