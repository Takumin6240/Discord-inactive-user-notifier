import { Guild, User, GuildMember } from 'discord.js';
import { loadActivity, saveActivity, loadConfig, type ActivityData } from '../config.js';
import { getJSTNow, logMessage } from '../utils/logger.js';

// アクティビティデータ
let activityData: ActivityData = {};

// アクティビティデータを初期化
export function initializeActivity(): void {
  activityData = loadActivity();
  logMessage(`Activity data loaded: ${Object.keys(activityData).length} users`);
}

// アクティビティを記録
export async function recordActivity(
  userId: string, 
  guildId: string, 
  activityType: 'message' | 'reaction' | 'voice'
): Promise<void> {
  const config = loadConfig();
  
  // 監視設定を確認
  const monitoring = config.monitoringOptions;
  if (
    (activityType === 'message' && !monitoring.messages) ||
    (activityType === 'reaction' && !monitoring.reactions) ||
    (activityType === 'voice' && !monitoring.voiceActivity)
  ) {
    return;
  }

  if (!activityData[userId]) {
    activityData[userId] = {};
  }

  activityData[userId][guildId] = {
    lastActivity: getJSTNow().toISOString(),
    activityType: activityType
  };

  // 定期的に保存（メモリ効率化）
  try {
    saveActivity(activityData);
  } catch (error) {
    logMessage(`Failed to save activity data: ${error}`, 'ERROR');
  }
}

// 非アクティブユーザーを取得
export async function getInactiveUsers(guild: Guild): Promise<GuildMember[]> {
  const config = loadConfig();
  const inactiveDays = config.inactiveDays;
  const excludeRoles = config.excludeRoles;
  const excludeUsers = config.excludeUsers;
  
  const cutoffTime = new Date(getJSTNow().getTime() - (inactiveDays * 24 * 60 * 60 * 1000));
  const inactiveUsers: GuildMember[] = [];

  try {
    // ギルドメンバーを取得
    await guild.members.fetch();
    
    for (const [userId, member] of guild.members.cache) {
      // ボットを除外
      if (member.user.bot) continue;
      
      // 除外ユーザーをチェック
      if (excludeUsers.includes(userId)) continue;
      
      // 除外ロールをチェック
      const hasExcludedRole = excludeRoles.some(roleId => 
        member.roles.cache.has(roleId)
      );
      if (hasExcludedRole) continue;

      // アクティビティをチェック
      const userActivity = activityData[userId]?.[guild.id];
      
      if (!userActivity) {
        // アクティビティ記録がない場合は非アクティブとみなす
        inactiveUsers.push(member);
      } else {
        const lastActivity = new Date(userActivity.lastActivity);
        if (lastActivity < cutoffTime) {
          inactiveUsers.push(member);
        }
      }
    }
  } catch (error) {
    logMessage(`Error fetching inactive users: ${error}`, 'ERROR');
  }

  return inactiveUsers;
}

// アクティビティデータをリセット
export function resetActivityData(): void {
  activityData = {};
  saveActivity(activityData);
  logMessage('Activity data has been reset');
}

// 現在のアクティビティデータを取得
export function getCurrentActivityData(): ActivityData {
  return { ...activityData };
} 