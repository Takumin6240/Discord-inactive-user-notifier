import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  REST, 
  Routes,
  ActivityType
} from 'discord.js';
import { serve } from '@hono/node-server';

import { DISCORD_TOKEN, PORT, loadConfig } from './config.js';
import { logMessage, getJSTNow } from './utils/logger.js';
import { initializeActivity, recordActivity, getInactiveUsers } from './bot/activity.js';
import { sendNotification } from './bot/notifications.js';
import { startKeepAlive, startNotificationSchedule } from './cron.js';
import { 
  commands,
  handleBotStatus,
  handleCheckInactive,
  handleSetConfig,
  handleMonitoringSettings,
  handleResetData
} from './bot/commands.js';
import healthCheckServer from './server.js';

// Discord Clientの設定
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ボット起動時の処理
client.once(Events.ClientReady, async (readyClient) => {
  logMessage(`Intent 'message_content' を有効化しました`);
  logMessage(`Intent 'guilds' を有効化しました`);
  logMessage(`Intent 'guild_messages' を有効化しました`);
  logMessage(`Intent 'guild_reactions' を有効化しました`);
  logMessage(`Intent 'members' を有効化しました`);
  logMessage(`Discord Intents の設定が完了しました`);
  logMessage(`Discord Bot インスタンスを作成しました`);

  // アクティビティデータを初期化
  initializeActivity();

  // ボットのステータスを設定
  readyClient.user.setActivity('ユーザー監視中...', { type: ActivityType.Watching });

  logMessage(`ボットが起動しました: ${readyClient.user.tag}`);

  // スラッシュコマンドを登録
  await registerSlashCommands();

  // 自動通知スケジュールを設定
  const config = loadConfig();
  if (config.enableAutoNotify) {
    startNotificationSchedule(config.notifyTime, async () => {
      await runAutoNotification();
    });
    logMessage(`自動通知スケジュールを設定しました: ${config.notifyTime}`);
  }

  // Keep-aliveを開始
  startKeepAlive();

  // Koyeb用URL情報を表示
  displayKoyebInfo();
});

// メッセージイベント
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  await recordActivity(message.author.id, message.guild.id, 'message');
});

// リアクションイベント
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  if (!reaction.message.guild) return;

  await recordActivity(user.id, reaction.message.guild.id, 'reaction');
});

// 音声チャンネルイベント
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (!newState.member || newState.member.user.bot) return;
  if (!newState.guild) return;

  // 音声チャンネルに参加または移動した場合
  if (newState.channelId && (!oldState.channelId || oldState.channelId !== newState.channelId)) {
    await recordActivity(newState.member.id, newState.guild.id, 'voice');
  }
});

// スラッシュコマンドイベント
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'bot-status':
        await handleBotStatus(interaction);
        break;
      case 'check-inactive':
        await handleCheckInactive(interaction);
        break;
      case 'set-config':
        await handleSetConfig(interaction);
        break;
      case 'monitoring-settings':
        await handleMonitoringSettings(interaction);
        break;
      case 'reset-data':
        await handleResetData(interaction);
        break;
      default:
        await interaction.reply({ content: '❌ 未知のコマンドです', ephemeral: true });
    }
  } catch (error) {
    logMessage(`Command execution error: ${error}`, 'ERROR');
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ コマンド実行中にエラーが発生しました', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ コマンド実行中にエラーが発生しました', ephemeral: true });
      }
    } catch (followUpError) {
      logMessage(`Failed to send error message: ${followUpError}`, 'ERROR');
    }
  }
});

// エラーハンドリング
client.on(Events.Error, (error) => {
  logMessage(`Discord.js error: ${error}`, 'ERROR');
});

// スラッシュコマンドを登録
async function registerSlashCommands(): Promise<void> {
  if (!DISCORD_TOKEN) {
    logMessage('DISCORD_TOKEN is not set', 'ERROR');
    return;
  }

  try {
    const rest = new REST().setToken(DISCORD_TOKEN);
    const commandData = commands.map(command => command.toJSON());

    logMessage('スラッシュコマンドを登録中...');
    
    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commandData }
    );

    logMessage('スラッシュコマンドを登録しました');
  } catch (error) {
    logMessage(`Failed to register slash commands: ${error}`, 'ERROR');
  }
}

// 自動通知を実行
async function runAutoNotification(): Promise<void> {
  const config = loadConfig();
  
  if (!config.enableAutoNotify) {
    return;
  }

  try {
    for (const guild of client.guilds.cache.values()) {
      const inactiveUsers = await getInactiveUsers(guild);
      
      // 管理者を取得（通知先として使用）
      const owner = await guild.fetchOwner();
      
      await sendNotification(owner.user, guild, inactiveUsers);
      logMessage(`Auto notification sent for guild: ${guild.name}`);
    }
  } catch (error) {
    logMessage(`Auto notification error: ${error}`, 'ERROR');
  }
}

// Koyeb用情報を表示
function displayKoyebInfo(): void {
  const koyebUrl = process.env.KOYEB_PUBLIC_DOMAIN;
  
  if (koyebUrl) {
    const healthUrl = `https://${koyebUrl}/health`;
    const homeUrl = `https://${koyebUrl}/`;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Koyeb監視設定情報');
    console.log('='.repeat(60));
    console.log(`📊 推奨監視URL: ${healthUrl}`);
    console.log(`🔗 管理画面URL: ${homeUrl}`);
    console.log(`⚙️ 監視間隔: 5分`);
    console.log(`⏱️ タイムアウト: 30秒`);
    console.log('='.repeat(60));
  } else {
    logMessage('KOYEB_PUBLIC_DOMAIN not set, using default port', 'WARN');
  }
}

// メイン処理
async function main(): Promise<void> {
  // トークンの検証
  if (!DISCORD_TOKEN) {
    logMessage('❌ DISCORD_TOKENが設定されていません', 'ERROR');
    console.log('❌ エラー: DISCORD_TOKENが設定されていません');
    console.log('💡 解決方法:');
    console.log('1. 環境変数でDISCORD_TOKENを設定してください');
    console.log('2. Discord Developer Portalでトークンを確認してください');
    process.exit(1);
  }

  if (DISCORD_TOKEN === 'your_discord_bot_token_here') {
    logMessage('❌ DISCORD_TOKENがデフォルト値のままです', 'ERROR');
    console.log('❌ エラー: DISCORD_TOKENがデフォルト値のままです');
    console.log('💡 実際のDiscord Botトークンに変更してください');
    process.exit(1);
  }

  try {
    // Koyeb用のヘルスチェックサーバーを起動
    console.log('🌐 Hono Webサーバーを起動しています...');
    serve({
      fetch: healthCheckServer.fetch,
      port: PORT,
    });
    logMessage(`Health check server started on port ${PORT}`);

    // Discord Botを起動
    logMessage('ボットを起動しています...');
    console.log('🤖 Discord Botを起動中...');
    console.log(`🔐 トークン確認: ${DISCORD_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);
    
    await client.login(DISCORD_TOKEN);
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Incorrect login details')) {
        logMessage(`Discord認証エラー: ${error.message}`, 'ERROR');
        console.log(`❌ Discord認証エラー: ${error.message}`);
        console.log('💡 トークンが正しいか確認してください');
      } else if (error.message.includes('Missing Privileged Intent')) {
        logMessage(`Discord Intents権限エラー: ${error.message}`, 'ERROR');
        console.log(`❌ Discord Intents権限エラー: ${error.message}`);
        console.log('💡 Discord Developer PortalでIntentsを有効化してください');
        console.log('  - SERVER MEMBERS INTENT');
        console.log('  - MESSAGE CONTENT INTENT');
      } else {
        logMessage(`予期しないBot起動エラー: ${error.message}`, 'ERROR');
        console.log(`❌ 予期しないエラー: ${error.message}`);
        console.log(`エラータイプ: ${error.constructor.name}`);
      }
    } else {
      logMessage(`予期しないBot起動エラー: ${error}`, 'ERROR');
      console.log(`❌ 予期しないエラー: ${error}`);
    }
    
    process.exit(1);
  }
}

// プロセス終了時の処理
process.on('SIGINT', () => {
  logMessage('Bot is shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logMessage('Bot is shutting down...');
  client.destroy();
  process.exit(0);
});

// 未処理の例外をキャッチ
process.on('unhandledRejection', (reason, promise) => {
  logMessage(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'ERROR');
});

process.on('uncaughtException', (error) => {
  logMessage(`Uncaught Exception: ${error}`, 'ERROR');
  process.exit(1);
});

// アプリケーション開始
main().catch((error) => {
  logMessage(`Application startup error: ${error}`, 'ERROR');
  process.exit(1);
}); 