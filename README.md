# e-cloud

## 概要
e-cloudは、Next.js（React/TypeScript + Tailwind CSS）で構築されたフロントエンドと、Go + MongoDBで構築されたバックエンドAPIを持つ、シンプルなパーソナルストレージ & ファイル管理Webサービスです。

- ログイン/サインアップ機能（JWT認証）
- フォルダ・ファイルのアップロード、ダウンロード
- フォルダ間の移動や削除
- ZIPファイルのアップロードと解凍
- プロフィール編集（表示名・アバターの更新）
- ダッシュボードによるフォルダ階層の可視化

---

## ディレクトリ構成

```
/front   - Next.js + TypeScript フロントエンド
/server  - Go（Gin）+ MongoDB バックエンドAPI
```

---

## フロントエンド

- Next.js 16、React 19、Tailwind CSS
- Radix UIを利用し、モダンなUIコンポーネントを実装
- 認証後のダッシュボードからファイル/フォルダ管理が可能
- `front/package.json` で依存管理

起動方法:

```bash
cd front
bun install
bun run dev
# http://localhost:3000 でアクセス
```

---

## バックエンド

- Gin Web Framework（Go 1.25+）
- MongoDBデータベース
- docker-composeによるローカル開発容易化
- JWT認証によるセキュアなAPI
- Swagger自動ドキュメンテーション対応

起動方法（Docker推奨）:

```bash
cd server
docker-compose up --build
# API: http://localhost:8080
# Swagger: http://localhost:8080/swagger/index.html
```

---

## APIドキュメント

OpenAPI (Swagger) 仕様により自動生成されています。  
`/swagger` エンドポイントから仕様を確認できます。

主なAPI例:
- POST /auth/register   （ユーザー新規登録）
- POST /auth/login      （ログイン）
- GET  /files           （ファイル/フォルダ一覧取得）
- POST /files/upload    （ファイルアップロード）
- その他、フォルダ・ファイル管理API多数

---

## .env/開発設定例

`server/docker-compose.yml` で環境変数をカスタマイズ可能です。

- MONGO_URI: MongoDB接続URI
- JWT_SECRET: トークン用シークレット
- STORAGE_BASE: ストレージディレクトリ

---

## ライセンス

このプロジェクトはMITライセンスです。

---

## 貢献

Issue登録・PR大歓迎です！
