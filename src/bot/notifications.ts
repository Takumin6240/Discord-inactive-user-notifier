import { 
  Guild, 
  GuildMember, 
  EmbedBuilder, 
  TextChannel, 
  User,
  Colors 
} from 'discord.js';
import { loadConfig, loadActivity } from '../config.js';
import { getJSTDateTimeString, logMessage } from '../utils/logger.js';

// 通知を送信
export async function sendNotification(
  targetUser: User, 
  guild: Guild, 
  inactiveUsers: GuildMember[]
): Promise<void> {
  const config = loadConfig();
  const maxUsersPerMessage = config.maxUsersPerMessage;
  
  try {
    let notificationTarget: TextChannel | User = targetUser;
    
    // 通知チャンネルが設定されている場合
    if (config.notifyChannel) {
      const channel = guild.channels.cache.get(config.notifyChannel) as TextChannel;
      if (channel && channel.isTextBased()) {
        notificationTarget = channel;
      } else {
        logMessage(`Notification channel not found: ${config.notifyChannel}`, 'WARN');
      }
    }

    if (inactiveUsers.length === 0) {
      // 非アクティブユーザーがいない場合
      const embed = new EmbedBuilder()
        .setTitle('📢 非アクティブユーザー通知')
        .setDescription('✅ 非アクティブユーザーはいません。')
        .setColor(Colors.Green)
        .setTimestamp()
        .setFooter({ 
          text: `監視期間: ${config.inactiveDays}日間` 
        });

      await notificationTarget.send({ embeds: [embed] });
      logMessage(`Sent notification: No inactive users found`);
      return;
    }

    // 非アクティブユーザーがいる場合、複数メッセージに分割
    const chunks = chunkArray(inactiveUsers, maxUsersPerMessage);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embed = new EmbedBuilder()
        .setTitle(`📢 非アクティブユーザー通知${chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : ''}`)
        .setColor(Colors.Orange)
        .setTimestamp()
        .setFooter({ 
          text: `監視期間: ${config.inactiveDays}日間 | 合計: ${inactiveUsers.length}名` 
        });

      const userList = chunk.map(member => {
        const lastActivity = getLastActivityString(member.id, guild.id);
        return `• ${member.user.username}#${member.user.discriminator} (ID: ${member.id})\n  最終活動: ${lastActivity}`;
      }).join('\n\n');

      embed.setDescription(userList);

      if (i === 0) {
        embed.addFields({
          name: '📊 概要',
          value: `合計 ${inactiveUsers.length}名の非アクティブユーザーが検出されました`,
          inline: false
        });
      }

      await notificationTarget.send({ embeds: [embed] });
    }

    logMessage(`Sent notification: ${inactiveUsers.length} inactive users found`);
    
  } catch (error) {
    logMessage(`Error sending notification: ${error}`, 'ERROR');
  }
}

// ログメッセージを送信
export async function sendLogMessage(
  guild: Guild, 
  message: string, 
  level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'
): Promise<void> {
  const config = loadConfig();
  
  if (!config.logChannel) {
    return;
  }

  try {
    const channel = guild.channels.cache.get(config.logChannel) as TextChannel;
    if (!channel || !channel.isTextBased()) {
      return;
    }

    const color = level === 'ERROR' ? Colors.Red : 
                  level === 'WARN' ? Colors.Yellow : Colors.Blue;

    const embed = new EmbedBuilder()
      .setTitle(`📝 ボットログ [${level}]`)
      .setDescription(message)
      .setColor(color)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    
  } catch (error) {
    logMessage(`Error sending log message: ${error}`, 'ERROR');
  }
}

// 配列をチャンクに分割
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// 最終アクティビティの文字列を取得
function getLastActivityString(userId: string, guildId: string): string {
  try {
    const activityData = loadActivity();
    const userActivity = activityData[userId]?.[guildId];
    
    if (!userActivity) {
      return '記録なし';
    }
    
    const lastActivity = new Date(userActivity.lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else {
      return `${diffDays}日前`;
    }
  } catch (error) {
    return '記録なし';
  }
} 