# 🤖 Discord 非アクティブユーザー通知ボット - Koyeb版

> **Discordサーバーで「最近見かけないユーザー」を自動で見つけて、管理者にお知らせするボット（Koyeb環境対応版）**

[![Koyeb](https://img.shields.io/badge/Deploy-Koyeb-blue?style=for-the-badge&logo=koyeb)](https://koyeb.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 🎯 このボットでできること

### 👀 **自動監視**
- メンバーの **メッセージ送信**
- **リアクション追加**
- **音声チャンネル参加・退出**
- 24時間365日、自動で監視します

### 📢 **自動通知**
- 指定した期間（例：3日間）活動がないメンバーを検出
- **毎日決まった時間**（デフォルト：夜8時）に自動報告
- **見やすい形式**で管理者に通知

### ⚙️ **簡単設定**
- **スラッシュコマンド**で簡単設定
- 監視期間、通知チャンネルなどをカスタマイズ可能
- 特定のロールや個人を除外設定も可能

---

## 💰 **駆動コストゼロ**

### 🆓 **年間コスト: $0**
- **Koyeb**: 無料ホスティング（512MB RAM、100GB帯域幅）
- **Discord**: 無料プラットフォーム

### 🔄 **24時間稼働**
- パソコンを切っても動き続ける
- 自動で復旧・メンテナンス
- 安定した監視を提供

---

## 📱 **使い方（コマンド一覧）**

### **基本コマンド**

#### `/bot-status` - 現在の状況確認
```
ボットの動作状況、設定内容を表示
```

#### `/check-inactive` - 今すぐチェック
```
現在の非アクティブユーザーを即座に確認
```

#### `/set-config` - 基本設定
```
/set-config duration:3 notify-channel:#管理部屋
→ 3日間非アクティブで #管理部屋 に通知
```

### **詳細設定**

#### `/monitoring-settings` - 監視対象の設定
```
/monitoring-settings messages:true reactions:false voice-activity:true
→ メッセージと音声は監視、リアクションは無視
```

#### `/reset-data` - データ初期化
```
⚠️ 注意: 全ての活動履歴を削除（元に戻せません）
```

---

## 🚀 **Renderデプロイ手順（推奨）**

### **1. Renderアカウント作成**
```bash
1. https://render.com/ にアクセス
2. "Get Started for Free" をクリック
3. GitHubアカウントで連携
4. 無料プランで登録完了
```

### **2. GitHubリポジトリ連携**
```bash
1. "New +" → "Web Service"
2. GitHubリポジトリを選択
3. "Connect" をクリック
```

### **3. 環境変数設定**
```bash
Environment Variables:
- DISCORD_TOKEN: [あなたのDiscord Bot Token]
- DISCORD_CLIENT_ID: [あなたのClient ID]
- GUILD_ID: [対象サーバーのID]
- NOTIFICATION_CHANNEL_ID: [通知チャンネルID]
- INACTIVE_DAYS_THRESHOLD: 30
- NOTIFICATION_TIME: 20:00
- NODE_ENV: production
```

### **4. 自動デプロイ設定**
```bash
✅ Auto-Deploy: Yes
✅ Build Command: npm ci && npm run build
✅ Start Command: npm start
✅ Health Check Path: /health
```

### **5. Renderの利点**
| 項目 | Render | Koyeb |
|------|--------|-------|
| **無料枠** | ✅ 750時間/月 | ⚠️ 制限あり |
| **24時間稼働** | ✅ スリープなし | ❌ Scale to Zero |
| **月額コスト** | $0 | $2.68/月 |
| **設定の簡単さ** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🚀 Koyebでのデプロイ手順（旧版）

### Step 1: GitHubリポジトリの準備

1. このリポジトリをフォークまたはクローン
2. 必要に応じてコードをカスタマイズ

### Step 2: Discord Bot設定

#### Bot Tokenの取得
1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセス
2. 新しいアプリケーションを作成
3. 「Bot」セクションでトークンを生成・コピー

#### 必要な権限設定
```
✅ View Channels (チャンネルを見る)
✅ Send Messages (メッセージを送信)
✅ Read Message History (メッセージ履歴を読む)
✅ Add Reactions (リアクションを追加)
✅ Connect (接続)
✅ Speak (発言)
```

**推奨**: `Administrator (管理者)` 権限を付与

#### 必須Intents設定
```
✅ SERVER MEMBERS INTENT     - ユーザーリストへのアクセスに必要
✅ MESSAGE CONTENT INTENT    - メッセージ内容の読み取りに必要
```

### Step 3: Koyebでのデプロイ

#### 3.1 Koyebアカウント作成
1. [Koyeb.com](https://koyeb.com) にアクセス
2. GitHubアカウントでサインアップ

#### 3.2 新しいサービスの作成
1. Koyebダッシュボードで「Create Service」をクリック
2. 「GitHub」を選択
3. リポジトリを選択

#### 3.3 サービス設定
- **Service Name**: `discord-inactive-notifier`
- **Instance Type**: `Nano (Free)`
- **Region**: `Frankfurt (fra)`
- **Build Command**: `npm run build`
- **Run Command**: `npm start`

#### 3.4 環境変数の設定
```
DISCORD_TOKEN=あなたのDiscordBotトークン
ENVIRONMENT=production
PORT=8000
HEALTH_CHECK_URL=https://あなたのアプリ名-あなたのユーザー名.koyeb.app/health
```

#### 3.5 デプロイ実行
1. 「Deploy」ボタンをクリック
2. ビルドとデプロイの完了を待機

### Step 4: 動作確認

1. Koyebダッシュボードでログを確認
2. Discordサーバーでボットがオンラインになることを確認
3. `/bot-status` コマンドで動作テスト

---

## 🛠️ **技術詳細（開発者向け）**

### **使用技術**
- **TypeScript**: プログラミング言語
- **Node.js 18+**: ランタイム環境
- **discord.js v14+**: Discord API ライブラリ
- **Hono**: 軽量Webフレームワーク（ヘルスチェック用）
- **node-cron**: スケジュール管理
- **JSON**: データ保存（軽量・シンプル）

### **ファイル構成**
```
discord-inactive-user-notifier/
├── src/
│   ├── index.ts              # メインプログラム
│   ├── config.ts             # 設定管理
│   ├── server.ts             # ヘルスチェックサーバー
│   ├── cron.ts               # スケジュール管理
│   ├── utils/
│   │   └── logger.ts         # ログ機能
│   └── bot/
│       ├── activity.ts       # アクティビティ管理
│       ├── notifications.ts  # 通知機能
│       └── commands.ts       # スラッシュコマンド
├── data/                     # データファイル（自動生成）
│   ├── activity.json         # ユーザー活動データ
│   ├── config.json           # ボット設定
│   └── bot.log              # 動作ログ
├── package.json              # 依存関係
├── tsconfig.json             # TypeScript設定
└── README.md                 # このファイル
```

### **API エンドポイント**
- `GET /` - ボット状態表示
- `GET /health` - Koyeb監視用ヘルスチェック
- `GET /keep-alive` - Keep-alive用
- `GET /ping` - 簡易ヘルスチェック

---

## 🔧 **トラブルシューティング**

### **Q: ボットが反応しない**
**A: 以下を確認してください**
1. ボットがサーバーに招待されているか
2. 必要な権限が付与されているか
3. Koyebで正常にデプロイされているか
4. Discord Developer PortalでIntentsが有効になっているか

### **Q: 通知が来ない**
**A: 設定を確認してください**
1. `/bot-status` で設定確認
2. 通知チャンネルでボットがメッセージ送信可能か
3. 自動通知が有効になっているか

### **Q: デプロイが失敗する**
**A: 以下を確認してください**
1. package.jsonのstartスクリプトが正しく設定されているか
2. 環境変数が正しく設定されているか
3. GitHubリポジトリが正しく設定されているか

### **Q: Keep-aliveが動作しない**
**A: 環境変数を確認してください**
1. `HEALTH_CHECK_URL`が正しく設定されているか
2. KoyebのPublic URLが正しいか

---

## 📊 **監視とメンテナンス**

### **ログ監視**
- Koyebダッシュボードでリアルタイムログを確認
- `/data/bot.log`ファイルでの詳細ログ

### **メトリクス確認**
- CPU使用率、メモリ使用量をKoyebダッシュボードで監視
- 無料プランの制限（512MB RAM、100GB帯域幅）に注意

### **アップデート方法**
1. GitHubリポジトリにコードをプッシュ
2. Koyebが自動的に再デプロイ
3. 新機能やバグ修正が自動適用

---

## 🎉 **まとめ**

**このボットで実現できること:**
- ✅ 完全無料での24時間サーバー監視
- ✅ 非アクティブメンバーの自動検出・通知
- ✅ 簡単な設定とメンテナンス
- ✅ Koyebでの安定した長期運用
- ✅ TypeScriptによる型安全な開発

---

## 📄 **ライセンス**

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

---

## 🤝 **コントリビューション**

プルリクエストやイシューの報告を歓迎します！

---

## 📞 **サポート**

問題が発生した場合は、GitHubのIssuesでお知らせください。

## 🚀 **デプロイメント状況**

### **推奨設定（Render）**
- **ホスティング**: Render (フリープラン)
- **稼働時間**: 750時間/月（24時間稼働対応）
- **スリープなし**: 継続稼働保証
- **月額コスト**: $0

### **旧設定（Koyeb）**
- **ホスティング**: Koyeb (Starterプラン)
- **監視**: UptimeRobot対応済み
- **キープアライブ**: 3分間隔 + UptimeRobot 5分間隔

### **⚠️ Koyebフリープランの制限**
2025年3月のアップデートにより、フリープランでは以下の制限があります：
- **60分非アクティブでスケールダウン**
- **実際は1-2分で終了する場合もある**
- **UptimeRobotは正常動作中**

### **📋 推奨解決策**

#### **🎯 最優先: Starterプランアップグレード**
```bash
# 月額: $0 + 使用量課金
# メリット: Scale to Zero無効化、60分制限撤廃
```

#### **🔧 UptimeRobot設定**
```
Monitor Type: HTTP(s)
URL: https://damp-jobie-takumin6240-f8b67c9e.koyeb.app/health
Interval: 5 minutes
Alert When: Down
```

#### **🔄 代替ホスティング**
| サービス | 無料枠 | 24時間稼働 | 推奨度 |
|---------|-------|-----------|--------|
| **Render** | ✅ 750時間/月 | ✅ スリープなし | ⭐⭐⭐⭐⭐ |
| **Fly.io** | ✅ 使用量制限内 | ✅ 継続稼働 | ⭐⭐⭐⭐⭐ |
| **Railway** | ✅ $5クレジット | ❌ クレジット切れで停止 | ⭐⭐⭐ |

## 🤖 **機能**

### **ヘルスチェック**
- **エンドポイント**: `/health`
- **UptimeRobot対応**: ✅
- **メモリ使用量監視**: ✅
- **プロセス情報表示**: ✅

### **ログ機能**
- **UptimeRobotアクセス検出**: ✅
- **詳細なシャットダウンログ**: ✅
- **メモリ使用量追跡**: ✅

## 🔧 **技術仕様**

// ... existing code ... 