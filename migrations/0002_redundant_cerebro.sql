CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" integer,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"evidence_snapshot" jsonb,
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolved_by" integer
);
--> statement-breakpoint
DO $$ 
DECLARE 
  user_count INT; 
  event_count INT; 
  report_count INT; 
BEGIN 
  SELECT count(*) INTO user_count FROM user_reports; 
  SELECT count(*) INTO event_count FROM event_reports; 
  
  INSERT INTO reports (reporter_id, target_type, target_id, reason, status, created_at, updated_at) 
  SELECT reporter_id, 'user', reported_user_id, reason, status, created_at, created_at FROM user_reports; 
  
  INSERT INTO reports (reporter_id, target_type, target_id, reason, status, created_at, updated_at) 
  SELECT reporter_id, 'event', event_id, reason, status, created_at, created_at FROM event_reports; 
  
  SELECT count(*) INTO report_count FROM reports; 
  IF report_count < (user_count + event_count) THEN 
    RAISE EXCEPTION 'Migration validation failed: Report count mismatch'; 
  END IF; 
END $$;
--> statement-breakpoint
ALTER TABLE "event_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "event_reports";--> statement-breakpoint
DROP TABLE "user_reports";--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "creator_id" integer;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "reports" USING btree ("reporter_id");--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;