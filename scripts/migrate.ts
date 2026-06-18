/** Initialize/upgrade the local database. Safe to run repeatedly. */
import { getDb, getDbPath } from '@careermate/db';

getDb(); // opens + migrates
console.log(`✅ CareerMate 데이터베이스 준비 완료`);
console.log(`   위치: ${getDbPath()}`);
