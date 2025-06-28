import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { logMessage } from './utils/logger.js';

dotenv.config();

// 開発環境でのみdotenvを読み込み
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (error) {
    // dotenvがない場合は無視
  }
}

// Render specific configurations
const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID;
const isKoyeb = process.env.KOYEB === 'true' || process.env.KOYEB_APP_ID;

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
  inactiveDays: 30,
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

// 設定の型定義（新旧両対応）
export interface Config {
  // 新形式（Render用）
  discordToken: string;
  discordClientId: string;
  guildId: string;
  notificationChannelId: string;
  inactiveDaysThreshold: number;
  notificationTime: string;
  port: number;
  platform: 'render' | 'koyeb' | 'local';
  
  // 旧形式（既存コード互換用）
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

// 設定ファイルを読み込み（新旧両対応）
export function loadConfig(): Config {
  ensureDataDirectory();
  
  // 環境変数から基本設定を読み込み
  const envConfig = {
    discordToken: process.env.DISCORD_TOKEN || '',
    discordClientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    notificationChannelId: process.env.NOTIFICATION_CHANNEL_ID || '',
    inactiveDaysThreshold: parseInt(process.env.INACTIVE_DAYS_THRESHOLD || '30'),
    notificationTime: process.env.NOTIFICATION_TIME || '20:00',
    port: parseInt(process.env.PORT || '8000'),
    platform: isRender ? 'render' : isKoyeb ? 'koyeb' : 'local' as const
  };

  // ファイルから既存設定を読み込み
  let fileConfig = DEFAULT_CONFIG;
  if (existsSync(CONFIG_FILE)) {
    try {
      const configData = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      fileConfig = { ...DEFAULT_CONFIG, ...configData };
    } catch (error) {
      console.warn('設定ファイルの読み込みに失敗しました。デフォルト設定を使用します:', error);
    }
  }

  // 新旧形式を統合
  const config: Config = {
    // 新形式
    discordToken: envConfig.discordToken,
    discordClientId: envConfig.discordClientId,
    guildId: envConfig.guildId,
    notificationChannelId: envConfig.notificationChannelId,
    inactiveDaysThreshold: envConfig.inactiveDaysThreshold,
    notificationTime: envConfig.notificationTime,
    port: envConfig.port,
    platform: envConfig.platform as 'render' | 'koyeb' | 'local',
    
    // 旧形式（既存コード互換用）
    inactiveDays: fileConfig.inactiveDays,
    enableAutoNotify: fileConfig.enableAutoNotify,
    notifyTime: fileConfig.notifyTime,
    notifyChannel: fileConfig.notifyChannel,
    logChannel: fileConfig.logChannel,
    excludeRoles: fileConfig.excludeRoles,
    excludeUsers: fileConfig.excludeUsers,
    maxUsersPerMessage: fileConfig.maxUsersPerMessage,
    monitoringOptions: fileConfig.monitoringOptions,
    koyebConfig: fileConfig.koyebConfig
  };

  // 環境変数が設定されている場合は上書き
  if (envConfig.notificationChannelId) {
    config.notifyChannel = envConfig.notificationChannelId;
  }
  if (envConfig.inactiveDaysThreshold) {
    config.inactiveDays = envConfig.inactiveDaysThreshold;
  }

  // 必須環境変数の検証
  const requiredVars = ['discordToken', 'discordClientId', 'guildId'];
  const missingVars = requiredVars.filter(key => !config[key as keyof Config]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  logMessage(`🌐 Platform detected: ${config.platform.toUpperCase()}`);
  logMessage(`📊 Configuration loaded successfully`);

  // 初回設定時はファイルに保存
  if (!existsSync(CONFIG_FILE)) {
    saveConfig(config);
  }

  return config;
}

// 設定ファイルを保存
export function saveConfig(config: Config): void {
  ensureDataDirectory();
  try {
    // 旧形式のプロパティのみをファイルに保存
    const fileConfig = {
      inactiveDays: config.inactiveDays,
      enableAutoNotify: config.enableAutoNotify,
      notifyTime: config.notifyTime,
      notifyChannel: config.notifyChannel,
      logChannel: config.logChannel,
      excludeRoles: config.excludeRoles,
      excludeUsers: config.excludeUsers,
      maxUsersPerMessage: config.maxUsersPerMessage,
      monitoringOptions: config.monitoringOptions,
      koyebConfig: config.koyebConfig
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(fileConfig, null, 2), 'utf-8');
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