const SAFE_ERROR_PATTERNS: Array<[RegExp, string]> = [
  [/SQLITE_BUSY|database is locked/i, '데이터베이스가 사용 중입니다. 잠시 후 다시 시도해 주세요.'],
  [/SQLITE_FULL|database or disk is full/i, '저장 공간이 부족해 작업을 완료하지 못했습니다. 디스크 여유 공간을 확인해 주세요.'],
  [/SQLITE_READONLY|attempt to write a readonly database/i, '데이터 폴더가 읽기 전용이라 저장할 수 없습니다. 폴더 권한을 확인해 주세요.'],
  [/SQLITE_CORRUPT|database disk image is malformed/i, '데이터베이스 손상이 감지되었습니다. 쓰기 작업을 중단하고 백업 복원을 진행해 주세요.'],
];

export function toSafeToolError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  for (const [pattern, message] of SAFE_ERROR_PATTERNS) {
    if (pattern.test(raw)) return message;
  }
  return '도구 실행 중 오류가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.';
}
