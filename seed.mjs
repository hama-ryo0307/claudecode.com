/**
 * ダミーデータ投入スクリプト
 *
 * 使い方:
 *   node seed.mjs
 *
 * 環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていれば RLS をバイパスして挿入します。
 * 未設定の場合は anon key で試みます（RLS 次第で失敗する場合があります）。
 */

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://jboakakzwuvbgmxfhmhu.supabase.co";
const SUPA_ANON_KEY = "sb_publishable_EztMQd4TBmZH4pLksrs-Rg_xmX_YS_p";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPA_ANON_KEY;

const supa = createClient(SUPA_URL, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- ダミーユーザー ----------
const users = [
  { id: "dummy-admin-001", display_name: "田中 太郎", role: "admin" },
  { id: "dummy-member-002", display_name: "佐藤 花子", role: "employee" },
  { id: "dummy-member-003", display_name: "鈴木 一郎", role: "employee" },
  { id: "dummy-member-004", display_name: "高橋 美咲", role: "employee" },
  { id: "dummy-member-005", display_name: "山田 健太", role: "employee" },
];

// ---------- 日付ヘルパー ----------
const pad = (n) => String(n).padStart(2, "0");

function dateStr(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function isoJST(y, m, d, h, min, sec = 0) {
  // JST (UTC+9) のタイムスタンプを ISO 文字列で返す
  const dt = new Date(Date.UTC(y, m - 1, d, h - 9, min, sec));
  return dt.toISOString();
}

// 2026年4月と5月のデータを生成
const months = [
  { y: 2026, m: 4, days: 30 },
  { y: 2026, m: 5, days: 2 }, // 5月は2日まで（今日まで）
];

// ---------- attendances ----------
function generateAttendances() {
  const rows = [];
  for (const { y, m, days } of months) {
    for (let d = 1; d <= days; d++) {
      const dow = new Date(y, m - 1, d).getDay();
      if (dow === 0 || dow === 6) continue; // 土日スキップ

      for (const user of users) {
        // 80% の確率で出勤
        if (Math.random() > 0.8) continue;

        // 出勤時刻: 8:30〜9:30 のランダム
        const inH = 8 + Math.floor(Math.random() * 2);
        const inM = Math.floor(Math.random() * 60);
        // 退勤時刻: 17:00〜20:00 のランダム（5月2日は退勤なしの場合あり）
        const isToday = y === 2026 && m === 5 && d === 2;
        const hasClockOut = isToday ? Math.random() > 0.5 : true;
        const outH = 17 + Math.floor(Math.random() * 3);
        const outM = Math.floor(Math.random() * 60);

        rows.push({
          id: uid(),
          user_id: user.id,
          date: dateStr(y, m, d),
          clock_in: isoJST(y, m, d, inH, inM),
          clock_out: hasClockOut ? isoJST(y, m, d, outH, outM) : null,
        });
      }
    }
  }
  return rows;
}

// ---------- shifts ----------
function generateShifts() {
  const rows = [];
  const statuses = ["pending", "approved", "rejected"];
  const admin = users[0];

  for (const { y, m, days } of months) {
    for (let d = 1; d <= days; d++) {
      const dow = new Date(y, m - 1, d).getDay();
      if (dow === 0 || dow === 6) continue;

      // 各メンバーが 40% の確率でシフト申請
      for (const user of users.slice(1)) {
        if (Math.random() > 0.4) continue;

        const startH = 9;
        const endH = 17 + Math.floor(Math.random() * 2);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const isDecided = status !== "pending";
        const createdAt = isoJST(y, m, Math.max(1, d - 3), 10, 0);

        rows.push({
          id: uid(),
          user_id: user.id,
          user_name: user.display_name,
          date: dateStr(y, m, d),
          start_time: `${pad(startH)}:00`,
          end_time: `${pad(endH)}:00`,
          note: Math.random() > 0.5 ? "通常勤務希望" : null,
          status,
          approver_id: isDecided ? admin.id : null,
          approver_name: isDecided ? admin.display_name : null,
          approved_at: isDecided ? isoJST(y, m, Math.max(1, d - 1), 14, 30) : null,
          created_at: createdAt,
        });
      }
    }
  }
  return rows;
}

// ---------- daily_reports ----------
function generateReports() {
  const rows = [];
  const contents = [
    "午前中はフロントエンドのバグ修正を行いました。午後はチームミーティングに参加し、来週のスプリントの計画を立てました。",
    "新しいAPIエンドポイントの実装を完了しました。テストコードも書き、カバレッジ90%を達成しました。",
    "顧客からのフィードバックをもとにUI改善を行いました。レスポンシブ対応も修正しました。",
    "データベースのインデックス最適化を行い、クエリ速度が30%向上しました。ドキュメントも更新しました。",
    "コードレビューを3件実施しました。セキュリティに関する指摘を2点行い、修正を確認しました。",
    "社内勉強会の資料を作成しました。テーマはTypeScriptのジェネリクスについてです。",
    "障害対応：本番環境でのメモリリークを調査し、原因を特定。パッチを当てて解決しました。",
    "新機能のプロトタイプを作成し、PMとデザイナーにデモを行いました。フィードバックを元に修正予定です。",
  ];

  for (const { y, m, days } of months) {
    for (let d = 1; d <= days; d++) {
      const dow = new Date(y, m - 1, d).getDay();
      if (dow === 0 || dow === 6) continue;

      for (const user of users) {
        // 70% の確率で日報投稿
        if (Math.random() > 0.7) continue;

        rows.push({
          user_id: user.id,
          date: dateStr(y, m, d),
          content: contents[Math.floor(Math.random() * contents.length)],
          created_at: isoJST(y, m, d, 18, Math.floor(Math.random() * 60)),
        });
      }
    }
  }
  return rows;
}

// ---------- action_logs ----------
function generateLogs() {
  const rows = [];
  const actions = [
    { action: "clock_in", target: "attendances" },
    { action: "clock_out", target: "attendances" },
    { action: "shift_request", target: "shifts" },
    { action: "approve_shift", target: "shifts" },
    { action: "reject_shift", target: "shifts" },
    { action: "save_report", target: "daily_reports" },
    { action: "login", target: "session" },
    { action: "logout", target: "session" },
  ];

  for (const { y, m, days } of months) {
    for (let d = 1; d <= days; d++) {
      const dow = new Date(y, m - 1, d).getDay();
      if (dow === 0 || dow === 6) continue;

      for (const user of users) {
        // 各ユーザー1日あたり2〜4件のログ
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const act = actions[Math.floor(Math.random() * actions.length)];
          const h = 8 + Math.floor(Math.random() * 10);
          const min = Math.floor(Math.random() * 60);

          rows.push({
            id: uid(),
            user_id: user.id,
            user_name: user.display_name,
            action: act.action,
            target: act.target,
            detail: dateStr(y, m, d),
            timestamp: isoJST(y, m, d, h, min),
          });
        }
      }
    }
  }
  return rows;
}

// ---------- 実行 ----------
async function main() {
  console.log("ダミーデータ投入を開始します...\n");

  // 1. profiles
  console.log("1/5 profiles を投入中...");
  const { error: profErr } = await supa.from("profiles").upsert(users, { onConflict: "id" });
  if (profErr) {
    console.error("  profiles エラー:", profErr.message);
  } else {
    console.log(`  profiles: ${users.length} 件 OK`);
  }

  // 2. attendances
  console.log("2/5 attendances を投入中...");
  const attendances = generateAttendances();
  // バッチで投入（Supabase は一度に数百行まで）
  for (let i = 0; i < attendances.length; i += 100) {
    const batch = attendances.slice(i, i + 100);
    const { error } = await supa.from("attendances").insert(batch);
    if (error) {
      console.error(`  attendances バッチ ${i} エラー:`, error.message);
      break;
    }
  }
  console.log(`  attendances: ${attendances.length} 件 OK`);

  // 3. shifts
  console.log("3/5 shifts を投入中...");
  const shifts = generateShifts();
  for (let i = 0; i < shifts.length; i += 100) {
    const batch = shifts.slice(i, i + 100);
    const { error } = await supa.from("shifts").insert(batch);
    if (error) {
      console.error(`  shifts バッチ ${i} エラー:`, error.message);
      break;
    }
  }
  console.log(`  shifts: ${shifts.length} 件 OK`);

  // 4. daily_reports
  console.log("4/5 daily_reports を投入中...");
  const reports = generateReports();
  for (let i = 0; i < reports.length; i += 100) {
    const batch = reports.slice(i, i + 100);
    const { error } = await supa.from("daily_reports").insert(batch);
    if (error) {
      console.error(`  daily_reports バッチ ${i} エラー:`, error.message);
      break;
    }
  }
  console.log(`  daily_reports: ${reports.length} 件 OK`);

  // 5. action_logs
  console.log("5/5 action_logs を投入中...");
  const logs = generateLogs();
  for (let i = 0; i < logs.length; i += 100) {
    const batch = logs.slice(i, i + 100);
    const { error } = await supa.from("action_logs").insert(batch);
    if (error) {
      console.error(`  action_logs バッチ ${i} エラー:`, error.message);
      break;
    }
  }
  console.log(`  action_logs: ${logs.length} 件 OK`);

  console.log("\n完了！");
}

main().catch(console.error);
