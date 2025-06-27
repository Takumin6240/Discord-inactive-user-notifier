import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// 開発環境でのみdotenvを読み込み
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (error) {
    // dotenvがない場合は無視
  }
}

// 環境変数
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
export const ENVIRONMENT = process.env.ENVIRONMENT || 'production';
export const PORT = parseInt(process.env.PORT || '8000');
export const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || '';

// データディレクトリ
export const DATA_DIR = join(process.cwd(), 'data');
export const ACTIVITY_FILE = join(DATA_DIR, 'activity.json');
export const CONFIG_FILE = join(DATA_DIR, 'config.json');
export const LOG_FILE = join(DATA_DIR, 'bot.log');

// デフォルト設定
export const DEFAULT_CONFIG = {
  inactiveDays: 3,
  enableAutoNotify: true,
  notifyTime: "0 20 * * *", // 毎日20時（日本時間）
  notifyChannel: null,
  logChannel: null,
  excludeRoles: [],
  excludeUsers: [],
  maxUsersPerMessage: 20,
  monitoringOptions: {
    messages: true,
    reactions: true,
    voiceActivity: true
  },
  koyebConfig: {
    keepaliveInterval: 5
  }
};

// 設定の型定義
export interface Config {
  inactiveDays: number;
  enableAutoNotify: boolean;
  notifyTime: string;
  notifyChannel: string | null;
  logChannel: string | null;
  excludeRoles: string[];
  excludeUsers: string[];
  maxUsersPerMessage: number;
  monitoringOptions: {
    messages: boolean;
    reactions: boolean;
    voiceActivity: boolean;
  };
  koyebConfig: {
    keepaliveInterval: number;
  };
}

// アクティビティデータの型定義
export interface ActivityData {
  [userId: string]: {
    [guildId: string]: {
      lastActivity: string;
      activityType: string;
    };
  };
}

// データディレクトリを作成
export function ensureDataDirectory(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 設定ファイルを読み込み
export function loadConfig(): Config {
  ensureDataDirectory();
  
  if (existsSync(CONFIG_FILE)) {
    try {
      const configData = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...configData };
    } catch (error) {
      console.warn('設定ファイルの読み込みに失敗しました。デフォルト設定を使用します:', error);
    }
  }
  
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

// 設定ファイルを保存
export function saveConfig(config: Config): void {
  ensureDataDirectory();
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('設定ファイルの保存に失敗しました:', error);
  }
}

// アクティビティデータを読み込み
export function loadActivity(): ActivityData {
  ensureDataDirectory();
  
  if (existsSync(ACTIVITY_FILE)) {
    try {
      return JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
    } catch (error) {
      console.warn('アクティビティファイルの読み込みに失敗しました:', error);
    }
  }
  
  return {};
}

// アクティビティデータを保存
export function saveActivity(activity: ActivityData): void {
  ensureDataDirectory();
  try {
    writeFileSync(ACTIVITY_FILE, JSON.stringify(activity, null, 2), 'utf-8');
  } catch (error) {
    console.error('アクティビティファイルの保存に失敗しました:', error);
  }
} 