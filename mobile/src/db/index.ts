import * as SQLite from 'expo-sqlite';
import {
  ActivityEntry,
  ActivityType,
  Challenge,
  ChallengeLog,
  FoodEntry,
  Goal,
  WeightEntry,
} from '../domain/types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('goal-driven.db').then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS goal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sex TEXT NOT NULL,
      age INTEGER NOT NULL,
      height_cm REAL NOT NULL,
      start_weight_kg REAL NOT NULL,
      current_weight_kg REAL NOT NULL,
      target_weight_kg REAL NOT NULL,
      timeframe_weeks INTEGER,
      activity_level TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS food_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories REAL NOT NULL,
      protein_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      servings REAL NOT NULL DEFAULT 1,
      logged_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      distance_km REAL,
      duration_min REAL,
      steps INTEGER,
      calories_burned REAL NOT NULL,
      logged_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS challenge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      unit TEXT NOT NULL,
      daily_target REAL,
      total_target REAL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS challenge_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      logged_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS weight_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weight_kg REAL NOT NULL,
      logged_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_food_logged_at ON food_entry(logged_at);
    CREATE INDEX IF NOT EXISTS idx_activity_logged_at ON activity_entry(logged_at);
    CREATE INDEX IF NOT EXISTS idx_challenge_log_challenge ON challenge_log(challenge_id, logged_at);
    CREATE INDEX IF NOT EXISTS idx_weight_logged_at ON weight_entry(logged_at);
  `);
}

function mapGoal(row: any): Goal {
  return {
    id: row.id,
    sex: row.sex,
    age: row.age,
    heightCm: row.height_cm,
    startWeightKg: row.start_weight_kg,
    currentWeightKg: row.current_weight_kg,
    targetWeightKg: row.target_weight_kg,
    timeframeWeeks: row.timeframe_weeks,
    activityLevel: row.activity_level,
    createdAt: row.created_at,
  };
}

export async function getCurrentGoal(): Promise<Goal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM goal ORDER BY id DESC LIMIT 1');
  return row ? mapGoal(row) : null;
}

export async function saveGoal(
  input: Omit<Goal, 'id' | 'createdAt' | 'startWeightKg'> & { startWeightKg?: number },
): Promise<Goal> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  const startWeight = input.startWeightKg ?? input.currentWeightKg;
  const result = await db.runAsync(
    `INSERT INTO goal (sex, age, height_cm, start_weight_kg, current_weight_kg, target_weight_kg, timeframe_weeks, activity_level, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.sex,
      input.age,
      input.heightCm,
      startWeight,
      input.currentWeightKg,
      input.targetWeightKg,
      input.timeframeWeeks,
      input.activityLevel,
      createdAt,
    ],
  );
  await db.runAsync('INSERT INTO weight_entry (weight_kg, logged_at) VALUES (?, ?)', [
    input.currentWeightKg,
    createdAt,
  ]);
  return {
    id: result.lastInsertRowId,
    ...input,
    startWeightKg: startWeight,
    createdAt,
  };
}

export async function updateCurrentWeight(weightKg: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE goal SET current_weight_kg = ? WHERE id = (SELECT id FROM goal ORDER BY id DESC LIMIT 1)', [weightKg]);
  await db.runAsync('INSERT INTO weight_entry (weight_kg, logged_at) VALUES (?, ?)', [weightKg, now]);
}

export async function listWeights(limit = 30): Promise<WeightEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM weight_entry ORDER BY logged_at DESC LIMIT ?',
    [limit],
  );
  return rows.map((r) => ({ id: r.id, weightKg: r.weight_kg, loggedAt: r.logged_at }));
}

function dayRange(date: Date): [string, string] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.toISOString(), end.toISOString()];
}

export async function listFoodEntriesForDay(date = new Date()): Promise<FoodEntry[]> {
  const db = await getDb();
  const [start, end] = dayRange(date);
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM food_entry WHERE logged_at >= ? AND logged_at < ? ORDER BY logged_at DESC',
    [start, end],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    calories: r.calories,
    proteinG: r.protein_g,
    carbsG: r.carbs_g,
    fatG: r.fat_g,
    servings: r.servings,
    loggedAt: r.logged_at,
  }));
}

export async function addFoodEntry(
  entry: Omit<FoodEntry, 'id' | 'loggedAt'> & { loggedAt?: string },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO food_entry (name, calories, protein_g, carbs_g, fat_g, servings, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.name,
      entry.calories,
      entry.proteinG,
      entry.carbsG,
      entry.fatG,
      entry.servings,
      entry.loggedAt ?? new Date().toISOString(),
    ],
  );
}

export async function deleteFoodEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM food_entry WHERE id = ?', [id]);
}

export async function listActivityForDay(date = new Date()): Promise<ActivityEntry[]> {
  const db = await getDb();
  const [start, end] = dayRange(date);
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM activity_entry WHERE logged_at >= ? AND logged_at < ? ORDER BY logged_at DESC',
    [start, end],
  );
  return rows.map((r) => ({
    id: r.id,
    type: r.type as ActivityType,
    label: r.label,
    distanceKm: r.distance_km,
    durationMin: r.duration_min,
    steps: r.steps,
    caloriesBurned: r.calories_burned,
    loggedAt: r.logged_at,
  }));
}

export async function addActivityEntry(
  entry: Omit<ActivityEntry, 'id' | 'loggedAt'> & { loggedAt?: string },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO activity_entry (type, label, distance_km, duration_min, steps, calories_burned, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.type,
      entry.label,
      entry.distanceKm,
      entry.durationMin,
      entry.steps,
      entry.caloriesBurned,
      entry.loggedAt ?? new Date().toISOString(),
    ],
  );
}

export async function deleteActivityEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM activity_entry WHERE id = ?', [id]);
}

export async function listChallenges(): Promise<Challenge[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM challenge ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    unit: r.unit,
    dailyTarget: r.daily_target,
    totalTarget: r.total_target,
    startDate: r.start_date,
    endDate: r.end_date,
    createdAt: r.created_at,
  }));
}

export async function addChallenge(
  c: Omit<Challenge, 'id' | 'createdAt' | 'startDate'> & { startDate?: string },
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO challenge (title, unit, daily_target, total_target, start_date, end_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      c.title,
      c.unit,
      c.dailyTarget,
      c.totalTarget,
      c.startDate ?? now,
      c.endDate,
      now,
    ],
  );
  return result.lastInsertRowId;
}

export async function deleteChallenge(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM challenge WHERE id = ?', [id]);
}

export async function logChallenge(challengeId: number, amount: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO challenge_log (challenge_id, amount, logged_at) VALUES (?, ?, ?)',
    [challengeId, amount, new Date().toISOString()],
  );
}

export async function challengeTodayTotal(challengeId: number): Promise<number> {
  const db = await getDb();
  const [start, end] = dayRange(new Date());
  const row = await db.getFirstAsync<any>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM challenge_log WHERE challenge_id = ? AND logged_at >= ? AND logged_at < ?',
    [challengeId, start, end],
  );
  return row?.total ?? 0;
}

export async function challengeCumulativeTotal(challengeId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM challenge_log WHERE challenge_id = ?',
    [challengeId],
  );
  return row?.total ?? 0;
}

export async function challengeStreak(challengeId: number, dailyTarget: number): Promise<number> {
  if (!dailyTarget || dailyTarget <= 0) return 0;
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT DATE(logged_at) AS day, SUM(amount) AS total
     FROM challenge_log WHERE challenge_id = ?
     GROUP BY DATE(logged_at) ORDER BY day DESC`,
    [challengeId],
  );
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (rows[i].day === expectedStr && rows[i].total >= dailyTarget) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function listChallengeLogs(
  challengeId: number,
  limit = 20,
): Promise<ChallengeLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM challenge_log WHERE challenge_id = ? ORDER BY logged_at DESC LIMIT ?',
    [challengeId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    challengeId: r.challenge_id,
    amount: r.amount,
    loggedAt: r.logged_at,
  }));
}
