import { Hono } from 'hono';
import { getJSTNow, getJSTDateTimeString, logMessage } from './utils/logger.js';
import { loadConfig } from './config.js';

const app = new Hono();

// 起動時間を記録
const startTime = getJSTNow();

// ヘルスチェック用のエンドポイント
app.get('/', (c) => {
  const config = loadConfig();
  const uptime = Math.floor((getJSTNow().getTime() - startTime.getTime()) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  return c.json({
    status: 'ok',
    service: 'Discord 非アクティブユーザー通知ボット',
    message: 'Discord Bot is running',
    uptime: `${hours}時間 ${minutes}分`,
    timestamp: getJSTDateTimeString(),
    node_version: process.version,
    config: {
      inactiveDays: config.inactiveDays,
      autoNotify: config.enableAutoNotify,
      monitoring: config.monitoringOptions
    }
  });
});

// UptimeRobot + Koyeb用最適化ヘルスチェックエンドポイント
app.get('/health', (c) => {
  const memUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor((getJSTNow().getTime() - startTime.getTime()) / 1000);
  
  // UptimeRobotからのリクエストをログに記録
  const userAgent = c.req.header('User-Agent') || '';
  if (userAgent.includes('UptimeRobot')) {
    logMessage(`[UptimeRobot] Keep-alive ping received - Uptime: ${uptimeSeconds}s`);
  }
  
  return c.json({
    status: 'healthy',
    timestamp: getJSTDateTimeString(),
    service: 'discord-bot',
    uptime: uptimeSeconds,
    uptimeRobot: {
      compatible: true,
      lastPing: getJSTDateTimeString(),
      interval: '5min'
    },
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform
    }
  });
});

// Keep-alive用エンドポイント
app.get('/keep-alive', (c) => {
  return c.text('Bot is alive!');
});

// Ping用エンドポイント
app.get('/ping', (c) => {
  return c.text('pong');
});

export default app; 