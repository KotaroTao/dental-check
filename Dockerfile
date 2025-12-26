# Node.js開発用Dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# ソースコードをコピー
COPY . .

# ポート3001を公開
EXPOSE 3001

# 開発サーバーを起動
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3001"]
