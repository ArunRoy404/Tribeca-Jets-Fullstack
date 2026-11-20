-- Prepare the isolated copy before the 4100 API starts.
\set ON_ERROR_STOP on

DO $$
BEGIN
    IF current_database() <> 'tribeca_postman' THEN
        RAISE EXCEPTION 'WhatsApp Postman preparation requires tribeca_postman (connected to %)', current_database();
    END IF;

    UPDATE public.whatsapp_settings
    SET "openaiApiKey" = NULL,
        "openaiModel" = NULL,
        "accessToken" = NULL,
        "appSecret" = NULL,
        "verifyToken" = NULL,
        "phoneNumberId" = NULL,
        "graphVersion" = 'v25.0',
        "assistantEnabled" = FALSE;

    UPDATE public.whatsapp_phones
    SET "deletedAt" = now()
    WHERE "deletedAt" IS NULL;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'broker@example.com' AND role = 'BROKER') THEN
        RAISE EXCEPTION 'Seed the broker fixture first';
    END IF;
    INSERT INTO public.whatsapp_phones ("id", "userId", "phone", "label", "verifiedAt", "updatedAt")
    SELECT gen_random_uuid(), id, '15550000777', 'Fixture', now(), now()
    FROM public.users WHERE email = 'broker@example.com'
    ON CONFLICT ("userId", "phone") DO UPDATE
    SET "label" = EXCLUDED."label", "verifiedAt" = now(), "updatedAt" = now(),
        "deletedAt" = NULL, "deletedById" = NULL;

    UPDATE public.verification_codes SET "consumedAt" = now()
    WHERE purpose = 'WHATSAPP_LINK' AND "consumedAt" IS NULL;
END;
$$;

SELECT p.id AS broker_phone_fixture_id
FROM public.whatsapp_phones p JOIN public.users u ON u.id = p."userId"
WHERE u.email = 'broker@example.com' AND p.phone = '15550000777' AND p."deletedAt" IS NULL;
