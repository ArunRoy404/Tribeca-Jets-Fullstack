-- Capture-only fixture. Reset with prepare_whatsapp_test_db.sql.
\set ON_ERROR_STOP on

DO $$
DECLARE
    owner_id uuid;
BEGIN
    IF current_database() <> 'tribeca_postman' THEN
        RAISE EXCEPTION 'WhatsApp five-phone fixture requires tribeca_postman';
    END IF;
    SELECT id INTO STRICT owner_id FROM public.users
    WHERE email = 'admin@example.com' AND role = 'SUPER_ADMIN' AND status = 'ACTIVE' AND "deletedAt" IS NULL;

    IF EXISTS (SELECT 1 FROM public.whatsapp_settings WHERE "assistantEnabled"
        OR "openaiApiKey" IS NOT NULL OR "accessToken" IS NOT NULL OR "appSecret" IS NOT NULL
        OR "verifyToken" IS NOT NULL OR "phoneNumberId" IS NOT NULL) THEN
        RAISE EXCEPTION 'Clear the WhatsApp settings with the preparation script first';
    END IF;
    IF EXISTS (SELECT 1 FROM public.whatsapp_phones WHERE "userId" = owner_id AND "deletedAt" IS NULL) THEN
        RAISE EXCEPTION 'Archive the existing live phones with the preparation script first';
    END IF;

    INSERT INTO public.whatsapp_phones ("id", "userId", "phone", "label", "verifiedAt", "updatedAt")
    SELECT gen_random_uuid(), owner_id, '1555000080' || fixture, 'Fixture ' || fixture, now(), now()
    FROM generate_series(1, 5) AS fixture
    ON CONFLICT ("userId", "phone") DO UPDATE
    SET "label" = EXCLUDED."label", "verifiedAt" = now(), "updatedAt" = now(),
        "deletedAt" = NULL, "deletedById" = NULL;
END;
$$;
