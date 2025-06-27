import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { LOG_FILE } from '../config.js';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

// 日本時間を取得
export function getJSTNow(): Date {
  return new Date(Date.now() + (9 * 60 * 60 * 1000));
}

// 日本時間の文字列を取得
export function getJSTDateTimeString(): string {
  const now = getJSTNow();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

// ログメッセージを出力
export function logMessage(message: string, level: LogLevel = 'INFO'): void {
  const timestamp = getJSTDateTimeString();
  const logEntry = `[${timestamp}] [${level}] ${message}`;
  
  // コンソールに出力
  if (typeof console !== 'undefined') {
    switch (level) {
      case 'ERROR':
        console.error(logEntry);
        break;
      case 'WARN':
        console.warn(logEntry);
        break;
      case 'DEBUG':
        console.debug(logEntry);
        break;
      default:
        console.log(logEntry);
    }
  }
  
  // ファイルにログを書き込み
  try {
    if (existsSync(LOG_FILE)) {
      appendFileSync(LOG_FILE, logEntry + '\n', 'utf-8');
    } else {
      writeFileSync(LOG_FILE, logEntry + '\n', 'utf-8');
    }
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.error('ログファイルの書き込みに失敗しました:', error);
    }
  }
} 