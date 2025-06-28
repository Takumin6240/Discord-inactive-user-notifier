import cron from 'node-cron';
import { HEALTH_CHECK_URL } from './config.js';
import { logMessage } from './utils/logger.js';

// Keep-aliveリクエストを送信
async function sendKeepAliveRequest(): Promise<void> {
  if (!HEALTH_CHECK_URL) {
    return;
  }

  try {
    const response = await fetch(HEALTH_CHECK_URL);
    if (response.ok) {
      logMessage(`Keep-alive request sent successfully: ${response.status}`, 'DEBUG');
    } else {
      logMessage(`Keep-alive request failed: ${response.status}`, 'WARN');
    }
  } catch (error) {
    logMessage(`Keep-alive request error: ${error}`, 'WARN');
  }
}

// Keep-aliveスケジュールを開始
export function startKeepAlive(): void {
  if (HEALTH_CHECK_URL) {
    // 3分ごとにKeep-aliveリクエストを送信（UptimeRobot 5分間隔と組み合わせて効果的な監視）
    cron.schedule('*/3 * * * *', () => {
      sendKeepAliveRequest();
    });
    
    logMessage('Keep-alive scheduler started (every 3 minutes) - UptimeRobot compatible');
  } else {
    logMessage('HEALTH_CHECK_URL not set, Keep-alive disabled', 'WARN');
  }
}

// 通知スケジュールを開始
export function startNotificationSchedule(
  scheduleExpression: string, 
  callback: () => Promise<void>
): void {
  if (cron.validate(scheduleExpression)) {
    cron.schedule(scheduleExpression, async () => {
      try {
        await callback();
      } catch (error) {
        logMessage(`Scheduled notification error: ${error}`, 'ERROR');
      }
    }, {
      timezone: 'Asia/Tokyo'
    });
    
    logMessage(`Notification schedule started: ${scheduleExpression} (JST)`);
  } else {
    logMessage(`Invalid cron expression: ${scheduleExpression}`, 'ERROR');
  }
} 