if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET 環境変数が設定されていません。.env ファイルに JWT_SECRET を設定してください。"
  );
}

export const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
