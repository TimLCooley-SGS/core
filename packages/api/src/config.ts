import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  CONTROL_PLANE_SUPABASE_URL: z.string().url(),
  CONTROL_PLANE_SUPABASE_ANON_KEY: z.string().min(1),
  CONTROL_PLANE_SUPABASE_SERVICE_KEY: z.string().min(1),
  CONTROL_PLANE_DATABASE_URL: z.string().min(1),
  SUPABASE_ACCESS_TOKEN: z.string().min(1),
  SUPABASE_ORG_ID: z.string().min(1),
  SUPABASE_DB_PASSWORD: z.string().min(1),
  SENDGRID_API_KEY: z.string().min(1).optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = envSchema.parse(process.env);
  }
  return _config;
}
