import { z } from "zod";

export const planNameSchema = z
  .string()
  .trim()
  .min(1, "プラン名を入力してください")
  .max(40, "プラン名は40文字以内で入力してください");
