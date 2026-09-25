-- Шкала без плюсов: 6A+ … 9C+ становятся своей буквой (6A+ → 6A).
UPDATE "problems" SET "grade" = rtrim("grade", '+') WHERE "grade" LIKE '%+';--> statement-breakpoint
UPDATE "problems" SET "author_grade" = rtrim("author_grade", '+') WHERE "author_grade" LIKE '%+';
