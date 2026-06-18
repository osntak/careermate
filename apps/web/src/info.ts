/**
 * Server + environment metadata surfaced to the Settings page and the /api/health
 * endpoint. Lets non-technical users *see* where their data lives, which is a
 * core privacy promise: everything is on this machine.
 */
import {
  getDataDir,
  getDbPath,
  getExportsDir,
  getBackupsDir,
  getEntityCounts,
  getVerifyStrict,
} from '@careermate/db';
import { APP_VERSION } from '@careermate/shared';

export const APP_NAME = 'CareerMate';
// 버전은 @careermate/shared 단일 출처에서. (번들에서 package.json 버전으로 치환)
export { APP_VERSION };

let _port = 0;
export function setServerPort(port: number): void {
  _port = port;
}

export function getServerInfo() {
  return {
    name: APP_NAME,
    version: APP_VERSION,
    port: _port,
    url: `http://127.0.0.1:${_port}`,
    data_dir: getDataDir(),
    db_path: getDbPath(),
    exports_dir: getExportsDir(),
    backups_dir: getBackupsDir(),
    node_version: process.version,
    counts: getEntityCounts(),
    verify_strict: getVerifyStrict(),
  };
}
