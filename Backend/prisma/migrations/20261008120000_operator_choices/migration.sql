-- Operators review (8 Oct 2026, owner's decisions): safety becomes a 0–5
-- rating like reliability (as the Figma form), response speed and payment
-- terms become fixed choices, and SUSPENDED joins the statuses.
--
-- Hand-written: the generated diff would DROP the three text columns and add
-- empty ones, losing what the desk typed. Here each value that fits is
-- carried across, and anything that does not is appended to the operator's
-- notes rather than discarded.

ALTER TYPE "OperatorStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

CREATE TYPE "ResponseSpeed" AS ENUM ('FAST', 'AVERAGE', 'SLOW');
CREATE TYPE "PaymentTerms" AS ENUM ('PREPAID', 'DUE_ON_RECEIPT', 'NET_7', 'NET_15', 'NET_30');

-- ---- Safety: text → a 0–5 number when it was one ("4.9", "4.9/5") ----------
ALTER TABLE "operators" ADD COLUMN "safetyScore" DOUBLE PRECISION;
UPDATE "operators"
SET "safetyScore" = substring("safetyRating" from '^\s*([0-5](\.[0-9]+)?)\s*(/\s*5)?\s*$')::double precision
WHERE "safetyRating" ~ '^\s*[0-5](\.[0-9]+)?\s*(/\s*5)?\s*$';

-- ---- Response speed ----------------------------------------------------------
ALTER TABLE "operators" ADD COLUMN "responseSpeedChoice" "ResponseSpeed";
UPDATE "operators" SET "responseSpeedChoice" = CASE
  -- "< 15 min" style: up to half an hour is fast, up to an hour average.
  WHEN "responseSpeed" ~* 'fast|quick|<\s*([0-9]|[12][0-9]|30)\s*min' THEN 'FAST'::"ResponseSpeed"
  WHEN "responseSpeed" ~* 'slow|<\s*[0-9]+\s*(h|hour)' THEN 'SLOW'::"ResponseSpeed"
  WHEN "responseSpeed" ~* 'average|medium|moderate|normal|<\s*([3-5][0-9]|60)\s*min' THEN 'AVERAGE'::"ResponseSpeed"
END
WHERE "responseSpeed" IS NOT NULL;

-- ---- Payment terms -------------------------------------------------------------
ALTER TABLE "operators" ADD COLUMN "paymentTermsChoice" "PaymentTerms";
UPDATE "operators" SET "paymentTermsChoice" = CASE
  WHEN "paymentTerms" ~* 'net\s*30' THEN 'NET_30'::"PaymentTerms"
  WHEN "paymentTerms" ~* 'net\s*15' THEN 'NET_15'::"PaymentTerms"
  WHEN "paymentTerms" ~* 'net\s*7' THEN 'NET_7'::"PaymentTerms"
  WHEN "paymentTerms" ~* 'receipt' THEN 'DUE_ON_RECEIPT'::"PaymentTerms"
  WHEN "paymentTerms" ~* 'prepa|advance|before' THEN 'PREPAID'::"PaymentTerms"
END
WHERE "paymentTerms" IS NOT NULL;

-- ---- Nothing typed is lost: what matched no choice goes into the notes ----------
UPDATE "operators" SET "sourcingNotes" = concat_ws(E'\n',
  "sourcingNotes",
  CASE WHEN "safetyRating" IS NOT NULL AND "safetyScore" IS NULL
       THEN 'Safety (as entered before 8 Oct 2026): ' || "safetyRating" END,
  CASE WHEN "responseSpeed" IS NOT NULL AND "responseSpeedChoice" IS NULL
       THEN 'Response speed (as entered before 8 Oct 2026): ' || "responseSpeed" END,
  CASE WHEN "paymentTerms" IS NOT NULL AND "paymentTermsChoice" IS NULL
       THEN 'Payment terms (as entered before 8 Oct 2026): ' || "paymentTerms" END
)
WHERE ("safetyRating" IS NOT NULL AND "safetyScore" IS NULL)
   OR ("responseSpeed" IS NOT NULL AND "responseSpeedChoice" IS NULL)
   OR ("paymentTerms" IS NOT NULL AND "paymentTermsChoice" IS NULL);

ALTER TABLE "operators" DROP COLUMN "safetyRating";
ALTER TABLE "operators" RENAME COLUMN "safetyScore" TO "safetyRating";
ALTER TABLE "operators" DROP COLUMN "responseSpeed";
ALTER TABLE "operators" RENAME COLUMN "responseSpeedChoice" TO "responseSpeed";
ALTER TABLE "operators" DROP COLUMN "paymentTerms";
ALTER TABLE "operators" RENAME COLUMN "paymentTermsChoice" TO "paymentTerms";
