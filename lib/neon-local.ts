import { neonConfig } from "@neondatabase/serverless";

const LOCAL_HOST = "db.localtest.me";

export function isLocalNeonHost(url: string): boolean {
  return new URL(url).hostname === LOCAL_HOST;
}

// Route the Neon driver through the Docker HTTP/WebSocket proxy in docker-compose.test.yml.
export function configureNeonForUrl(url: string): void {
  if (!isLocalNeonHost(url)) return;
  neonConfig.fetchEndpoint = `http://${LOCAL_HOST}:4444/sql`;
  neonConfig.wsProxy = (host) => `${host}:4444/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}
