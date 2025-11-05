import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Opens or creates store.db in the backend folder
export async function openDb() {
  return open({
    filename: "./sensors.db",
    driver: sqlite3.Database,
  });
}
