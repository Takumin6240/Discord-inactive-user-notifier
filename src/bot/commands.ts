import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  TextChannel
} from 'discord.js';
import { loadConfig, saveConfig } from '../config.js';
import { getInactiveUsers, resetActivityData } from './activity.js';
import { sendNotification } from './notifications.js';
import { getJSTNow, logMessage } from '../utils/logger.js';

// コマンドデータを定義
export const commands = [
  // bot-status コマンド
  new SlashCommandBuilder()
    .setName('bot-status')
    .setDescription('ボットの状態と設定を表示')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // check-inactive コマンド
  new SlashCommandBuilder()
    .setName('check-inactive')
    .setDescription('非アクティブユーザーを即時チェック')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // set-config コマンド
  new SlashCommandBuilder()
    .setName('set-config')
    .setDescription('設定を変更')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('非アクティブ判定日数 (1-30日)')
        .setMinValue(1)
        .setMaxValue(30)
        .setRequired(false))
    .addChannelOption(option =>
      option.setName('notify-channel')
        .setDescription('通知チャンネル')
        .setRequired(false))
    .addChannelOption(option =>
      option.setName('log-channel')
        .setDescription('ログチャンネル')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('auto-notify')
        .setDescription('自動通知の有効/無効')
        .setRequired(false)),

  // monitoring-settings コマンド
  new SlashCommandBuilder()
    .setName('monitoring-settings')
    .setDescription('監視対象の設定を変更')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(option =>
      option.setName('messages')
        .setDescription('メッセージ監視')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('reactions')
        .setDescription('リアクション監視')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('voice-activity')
        .setDescription('音声活動監視')
        .setRequired(false)),

  // reset-data コマンド
  new SlashCommandBuilder()
    .setName('reset-data')
    .setDescription('アクティビティデータを初期化（注意：元に戻せません）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // whitelist コマンド
  new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('ホワイトリスト管理（非アクティブ対象から除外）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('ユーザーをホワイトリストに追加')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('ホワイトリストに追加するユーザー')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('ユーザーをホワイトリストから削除')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('ホワイトリストから削除するユーザー')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('現在のホワイトリストを表示'))
];

// bot-status コマンドの処理
export async function handleBotStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ このコマンドは管理者のみ実行可能です', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const config = loadConfig();
    const startTime = getJSTNow();
    
    // 通知チャンネルの設定状況
    let notifyChannelInfo = 'DMで通知';
    if (config.notifyChannel && interaction.guild) {
      const channel = interaction.guild.channels.cache.get(config.notifyChannel) as TextChannel;
      if (channel) {
        notifyChannelInfo = `<#${config.notifyChannel}>`;
      } else {
        notifyChannelInfo = `❌ チャンネルが見つかりません（ID: ${config.notifyChannel}）`;
      }
    }

    // 監視設定
    const monitoring = config.monitoringOptions;
    const monitoringStatus = [
      `メッセージ: ${monitoring.messages ? '✅' : '❌'}`,
      `リアクション: ${monitoring.reactions ? '✅' : '❌'}`,
      `音声活動: ${monitoring.voiceActivity ? '✅' : '❌'}`
    ];

    const embed = new EmbedBuilder()
      .setTitle('🤖 ボットステータス')
      .setColor(Colors.Green)
      .setTimestamp()
      .addFields(
        {
          name: '🔧 設定',
          value: `非アクティブ日数: ${config.inactiveDays}日\n自動通知: ${config.enableAutoNotify ? '✅' : '❌'}\n通知先: ${notifyChannelInfo}`,
          inline: true
        },
        {
          name: '👀 監視設定',
          value: monitoringStatus.join('\n'),
          inline: true
        },
        {
          name: '📋 ホワイトリスト',
          value: `除外ユーザー: ${config.excludeUsers.length}名\n除外ロール: ${config.excludeRoles.length}個`,
          inline: true
        }
      );

    await interaction.followUp({ embeds: [embed] });
    
  } catch (error) {
    logMessage(`bot-status command error: ${error}`, 'ERROR');
    await interaction.followUp({ content: '❌ コマンド実行中にエラーが発生しました', ephemeral: true });
  }
}

// check-inactive コマンドの処理
export async function handleCheckInactive(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ このコマンドは管理者のみ実行可能です', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    if (!interaction.guild) {
      await interaction.followUp({ content: '❌ このコマンドはサーバー内でのみ実行可能です', ephemeral: true });
      return;
    }

    const inactiveUsers = await getInactiveUsers(interaction.guild);
    await sendNotification(interaction.user, interaction.guild, inactiveUsers);
    await interaction.followUp({ content: '✅ 通知を送信しました', ephemeral: true });
    
  } catch (error) {
    logMessage(`check-inactive command error: ${error}`, 'ERROR');
    await interaction.followUp({ content: '❌ コマンド実行中にエラーが発生しました', ephemeral: true });
  }
}

// set-config コマンドの処理
export async function handleSetConfig(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ このコマンドは管理者のみ実行可能です', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const config = loadConfig();
    const updates: string[] = [];

    const duration = interaction.options.getInteger('duration');
    const notifyChannel = interaction.options.getChannel('notify-channel') as TextChannel;
    const logChannel = interaction.options.getChannel('log-channel') as TextChannel;
    const autoNotify = interaction.options.getBoolean('auto-notify');

    if (duration !== null) {
      config.inactiveDays = Math.max(1, Math.min(30, duration));
      updates.push(`非アクティブ日数: ${config.inactiveDays}日`);
    }

    if (notifyChannel) {
      config.notifyChannel = notifyChannel.id;
      updates.push(`通知チャンネル: <#${notifyChannel.id}>`);
    }

    if (logChannel) {
      config.logChannel = logChannel.id;
      updates.push(`ログチャンネル: <#${logChannel.id}>`);
    }

    if (autoNotify !== null) {
      config.enableAutoNotify = autoNotify;
      updates.push(`自動通知: ${autoNotify ? '有効' : '無効'}`);
    }

    saveConfig(config);

    const response = updates.length > 0 ? 
      `✅ 設定を更新しました:\n${updates.join('\n')}` : 
      '❌ 更新する設定が指定されていません';

    await interaction.followUp({ content: response, ephemeral: true });
    
  } catch (error) {
    logMessage(`set-config command error: ${error}`, 'ERROR');
    await interaction.followUp({ content: '❌ コマンド実行中にエラーが発生しました', ephemeral: true });
  }
}

// monitoring-settings コマンドの処理
export async function handleMonitoringSettings(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ このコマンドは管理者のみ実行可能です', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const config = loadConfig();
    const updates: string[] = [];

    const messages = interaction.options.getBoolean('messages');
    const reactions = interaction.options.getBoolean('reactions');
    const voiceActivity = interaction.options.getBoolean('voice-activity');

    if (messages !== null) {
      config.monitoringOptions.messages = messages;
      updates.push(`メッセージ監視: ${messages ? '有効' : '無効'}`);
    }

    if (reactions !== null) {
      config.monitoringOptions.reactions = reactions;
      updates.push(`リアクション監視: ${reactions ? '有効' : '無効'}`);
    }

    if (voiceActivity !== null) {
      config.monitoringOptions.voiceActivity = voiceActivity;
      updates.push(`音声活動監視: ${voiceActivity ? '有効' : '無効'}`);
    }

    saveConfig(config);

    const response = updates.length > 0 ? 
      `✅ 監視設定を更新しました:\n${updates.join('\n')}` : 
      '❌ 更新する設定が指定されていません';

    await interaction.followUp({ content: response, ephemeral: true });
    
  } catch (error) {
    logMessage(`monitoring-settings command error: ${error}`, 'ERROR');
    await interaction.followUp({ content: '❌ コマンド実行中にエラーが発生しました', ephemeral: true });
  }
}

// reset-data コマンドの処理
export async function handleResetData(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ このコマンドは管理者のみ実行可能です', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    resetActivityData();
    await interaction.followUp({ content: '✅ アクティビティデータを初期化しました', ephemeral: true });
    logMessage('Activity data has been reset by admin command');
    
  } catch (error) {
    logMessage(`reset-data command error: ${error}`, 'ERROR');
    await interaction.followUp({ content: '❌ コマンド実行中にエラーが発生しました', ephemeral: true });
  }
}

// whitelist コマンドの処理
export async function handleWhitelist(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ このコマンドは管理者のみ実行可能です', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const config = loadConfig();
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        await handleWhitelistAdd(interaction, config);
        break;
      case 'remove':
        await handleWhitelistRemove(interaction, config);
        break;
      case 'list':
        await handleWhitelistList(interaction, config);
        break;
      default:
        await interaction.followUp({ content: '❌ 未知のサブコマンドです', ephemeral: true });
    }
    
  } catch (error) {
    logMessage(`whitelist command error: ${error}`, 'ERROR');
    await interaction.followUp({ content: '❌ コマンド実行中にエラーが発生しました', ephemeral: true });
  }
}

// ホワイトリストにユーザーを追加
async function handleWhitelistAdd(interaction: ChatInputCommandInteraction, config: any): Promise<void> {
  const user = interaction.options.getUser('user');
  if (!user) {
    await interaction.followUp({ content: '❌ ユーザーが指定されていません', ephemeral: true });
    return;
  }

  if (config.excludeUsers.includes(user.id)) {
    await interaction.followUp({ 
      content: `❌ ${user.username} は既にホワイトリストに登録されています`, 
      ephemeral: true 
    });
    return;
  }

  config.excludeUsers.push(user.id);
  saveConfig(config);

  await interaction.followUp({ 
    content: `✅ ${user.username} をホワイトリストに追加しました\n（非アクティブユーザー対象から除外されます）`, 
    ephemeral: true 
  });
  
  logMessage(`User ${user.username} (${user.id}) added to whitelist by admin`);
}

// ホワイトリストからユーザーを削除
async function handleWhitelistRemove(interaction: ChatInputCommandInteraction, config: any): Promise<void> {
  const user = interaction.options.getUser('user');
  if (!user) {
    await interaction.followUp({ content: '❌ ユーザーが指定されていません', ephemeral: true });
    return;
  }

  const index = config.excludeUsers.indexOf(user.id);
  if (index === -1) {
    await interaction.followUp({ 
      content: `❌ ${user.username} はホワイトリストに登録されていません`, 
      ephemeral: true 
    });
    return;
  }

  config.excludeUsers.splice(index, 1);
  saveConfig(config);

  await interaction.followUp({ 
    content: `✅ ${user.username} をホワイトリストから削除しました\n（非アクティブユーザー対象に含まれるようになります）`, 
    ephemeral: true 
  });
  
  logMessage(`User ${user.username} (${user.id}) removed from whitelist by admin`);
}

// ホワイトリストを表示
async function handleWhitelistList(interaction: ChatInputCommandInteraction, config: any): Promise<void> {
  if (config.excludeUsers.length === 0) {
    await interaction.followUp({ 
      content: '📋 ホワイトリストは空です\n現在、除外されているユーザーはいません', 
      ephemeral: true 
    });
    return;
  }

  if (!interaction.guild) {
    await interaction.followUp({ content: '❌ このコマンドはサーバー内でのみ実行可能です', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 ホワイトリスト一覧')
    .setDescription('非アクティブユーザー対象から除外されているユーザー')
    .setColor(Colors.Blue)
    .setTimestamp();

  const userList: string[] = [];
  
  for (const userId of config.excludeUsers) {
    try {
      const member = await interaction.guild.members.fetch(userId);
      userList.push(`• ${member.user.username}#${member.user.discriminator} (ID: ${userId})`);
    } catch (error) {
      // メンバーが見つからない場合
      userList.push(`• 不明なユーザー (ID: ${userId}) - サーバーから退出済み`);
    }
  }

  // 長すぎる場合は分割
  const maxLength = 1024;
  let description = userList.join('\n');
  
  if (description.length > maxLength) {
    description = description.substring(0, maxLength - 20) + '\n...(他省略)';
  }

  embed.addFields({
    name: `登録ユーザー数: ${config.excludeUsers.length}名`,
    value: description,
    inline: false
  });

  await interaction.followUp({ embeds: [embed], ephemeral: true });
} 