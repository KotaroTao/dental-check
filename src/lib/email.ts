import nodemailer from "nodemailer";

/**
 * メール送信ユーティリティ
 *
 * 環境変数で設定:
 *   SMTP_HOST     - SMTPサーバーのホスト名（例: smtp.gmail.com）
 *   SMTP_PORT     - ポート番号（デフォルト: 587）
 *   SMTP_USER     - SMTPユーザー名
 *   SMTP_PASS     - SMTPパスワード
 *   SMTP_FROM     - 送信元アドレス（例: noreply@qrqr-dental.com）
 *
 * 設定されていない場合はメール送信をスキップ（ログ出力のみ）
 */

// SMTP設定が揃っているかチェック
function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

// Nodemailerトランスポート（遅延初期化）
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465", // 465はSSL、それ以外はSTARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * メールを送信する
 * SMTP設定がない場合は false を返す（エラーにはしない）
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    // SMTP未設定 → メール送信をスキップ
    console.error("[Email] SMTP未設定のためメール送信をスキップ:", options.subject);
    return false;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error("[Email] 送信エラー:", error);
    return false;
  }
}

/**
 * パスワードリセットメールを送信
 */
export async function sendPasswordResetEmail(
  to: string,
  clinicName: string,
  resetUrl: string
): Promise<boolean> {
  return sendMail({
    to,
    subject: "【QRくるくる診断DX】パスワードリセット",
    text: [
      `${clinicName} 様`,
      "",
      "パスワードリセットのリクエストを受け付けました。",
      "以下のURLからパスワードを再設定してください。",
      "",
      resetUrl,
      "",
      "※ このURLは1時間で無効になります。",
      "※ このリクエストに心当たりがない場合は、このメールを無視してください。",
      "",
      "----",
      "QRくるくる診断DX",
      "https://qrqr-dental.com",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">パスワードリセット</h2>
        <p>${clinicName} 様</p>
        <p>パスワードリセットのリクエストを受け付けました。<br>以下のボタンからパスワードを再設定してください。</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            パスワードを再設定する
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          ※ このURLは1時間で無効になります。<br>
          ※ このリクエストに心当たりがない場合は、このメールを無視してください。
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">QRくるくる診断DX - https://qrqr-dental.com</p>
      </div>
    `,
  });
}

/**
 * 招待メールを送信
 */
export async function sendInvitationEmail(
  to: string,
  clinicName: string,
  inviteUrl: string
): Promise<boolean> {
  return sendMail({
    to,
    subject: "【QRくるくる診断DX】アカウント登録のご招待",
    text: [
      `${clinicName} 様`,
      "",
      "QRくるくる診断DXへのご招待です。",
      "以下のURLからアカウントを登録してください。",
      "",
      inviteUrl,
      "",
      "※ このURLは一度のみ使用できます。",
      "",
      "----",
      "QRくるくる診断DX",
      "https://qrqr-dental.com",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">アカウント登録のご招待</h2>
        <p>${clinicName} 様</p>
        <p>QRくるくる診断DXへのご招待です。<br>以下のボタンからアカウントを登録してください。</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            アカウントを登録する
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          ※ このURLは一度のみ使用できます。
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">QRくるくる診断DX - https://qrqr-dental.com</p>
      </div>
    `,
  });
}
