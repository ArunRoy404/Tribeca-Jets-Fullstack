# Send CRM emails from your @tribecajets.com address

**About 10 minutes · done once · no technical knowledge needed**

---

## Where things stand

The Command Center currently sends its emails (sign-in codes, password
resets, team invitations and emails to clients) from
`no-reply@tribecajetscommandcenter.com`, using a free email service (Resend).
The free service allows up to **100 emails a day**; going beyond that from
this address would need a paid plan.

Instead, you can use your existing **@tribecajets.com** Google mail at no
extra cost, and the emails will come from that address.

**You will not share your Google password.** You will create an **app
password**: a separate code that only lets the CRM send email. You can cancel
it at any time without affecting your mailbox or your normal password.

---

## Step 1: Choose the sender address

**Option A: use your own mailbox** (free, simplest). Emails will come from
your existing @tribecajets.com address. Nothing to set up here, so go to
Step 2.

**Option B: use `no-reply@tribecajets.com`** (free). This is an extra address
added to your existing mailbox, so it costs nothing. Do this first:

1. Sign in at **admin.google.com** as an administrator.
2. Go to **Directory → Users**, click your mailbox, then open **User
   information → Alternate email addresses (email aliases)** and add
   `no-reply`.
3. Open Gmail in that mailbox. Click the **gear icon → See all settings →
   Accounts and Import → Send mail as → Add another email address**. Enter
   `no-reply@tribecajets.com`, keep **Treat as an alias** ticked, and follow
   the prompts.

Replies sent to `no-reply@` will arrive in that same mailbox. A separate
no-reply mailbox also works, but it adds a paid Google user.

## Step 2: Turn on 2-Step Verification

Sign in to Google with your mailbox (the one from Step 1), then:

1. Go to **myaccount.google.com** and open **Security**.
2. Under *How you sign in to Google*, turn on **2-Step Verification** and
   follow the prompts.

## Step 3: Create the app password

1. Go to **myaccount.google.com/apppasswords** (still signed in as that
   mailbox).
2. Type the name `Tribeca CRM` and click **Create**.
3. A 16-character password appears on screen. **Copy it now**: Google will
   not show it again.

## Step 4: Send us four things

| What to send | Example (not real) |
|---|---|
| 1. Your mailbox (where you made the password) | `owner@tribecajets.com` |
| 2. The 16-character app password | `abcd efgh ijkl mnop` |
| 3. The address emails should come from | `no-reply@tribecajets.com`, or the same mailbox |
| 4. The sender name people will see | `Tribeca Jets` |

Please send the app password **securely**, through a password manager's
share feature or a one-time secret link (for example onetimesecret.com), not
in a normal email or chat message.

We will connect it, send a test email, and confirm when it is done.

---

## If the app passwords page is missing

Your Google Workspace administrator needs to:

1. Sign in at **admin.google.com**. Go to **Security → Authentication →
   2-step verification**.
2. Tick **Allow users to turn on 2-Step Verification**, make sure sign-in is
   not limited to security keys only, and click **Save**.
3. Make sure no security policy is blocking app passwords. Then repeat
   Steps 2 and 3.

---

**To stop it any time:** go to **myaccount.google.com/apppasswords** and
delete `Tribeca CRM`.
