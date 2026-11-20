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
        "graphVersion" = 'v25.0';

    UPDATE public.users
    SET "whatsappPhone" = NULL,
        "whatsappPhoneVerifiedAt" = NULL;

    UPDATE public.users
    SET "whatsappPhone" = '15550000777',
        "whatsappPhoneVerifiedAt" = now()
    WHERE email = 'broker@example.com';

    DELETE FROM public.verification_codes
    WHERE purpose = 'WHATSAPP_LINK' AND "consumedAt" IS NULL;

    UPDATE public.company_settings
    SET "whatsappAssistantEnabled" = FALSE;
END;
$$;
