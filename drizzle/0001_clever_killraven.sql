CREATE UNIQUE INDEX "uq_books_isbn" ON "books" USING btree ("isbn") WHERE "books"."isbn" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_users_fullname_trgm" ON "users" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_users_email_trgm" ON "users" USING gin ("email" gin_trgm_ops);