import { z } from "zod";

export const planNameSchema = z
  .string()
  .trim()
  .min(1, "シナリオ名を入力してください")
  .max(40, "シナリオ名は40文字以内で入力してください");
