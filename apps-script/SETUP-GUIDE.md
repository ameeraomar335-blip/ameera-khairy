# Connecting the RSVP to a Google Sheet

This takes about 10 minutes and only needs to be done once.
Use the Google account you want to own the RSVP list.

---

## Step 1: Create the Google Sheet

1. Go to **sheets.new** in your browser. A new, empty Google Sheet opens.
2. Click **"Untitled spreadsheet"** at the top left and rename it, e.g. **RSVP Ameera & Khairy**.

## Step 2: Open Apps Script

1. In the Sheet's menu, click **Extensions → Apps Script**.
2. A new tab opens with a code editor. It already contains a few lines (`function myFunction() {...}`).
3. Click **"Untitled project"** at the top left and rename it **RSVP Kad Kahwin**.

## Step 3: Paste the code

1. In VS Code, open the file **apps-script/Code.gs**.
2. Press **Ctrl+A** (select all), then **Ctrl+C** (copy).
3. Go back to the Apps Script tab, click inside the code area, press **Ctrl+A**, then **Ctrl+V** to replace everything with the new code.
4. Press **Ctrl+S** to save.

## Step 4: Run the setup once (and give permission)

1. On the toolbar above the code there is a dropdown showing a function name. Choose **setup**.
2. Click **▶ Run**.
3. A box says **"Authorization required"**. Click **Review permissions** and choose your Google account.
4. You'll see **"Google hasn't verified this app"**. That's normal: it's your own script.
   Click **Advanced** → **Go to RSVP Kad Kahwin (unsafe)** → **Allow**.
5. Go back to your Sheet. You should now see a tab called **RSVP** with these headings:
   `Timestamp | Nama | Kehadiran | Bilangan | Ucapan | Sembunyi`

## Step 5: Publish it as a Web App

1. In Apps Script, click the blue **Deploy** button (top right) → **New deployment**.
2. Click the **⚙ gear icon** next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `RSVP v1`
   - **Execute as:** **Me** (your email)
   - **Who has access:** **Anyone**. This is important; otherwise guests can't send RSVPs.
4. Click **Deploy**. If it asks for permission again, allow it the same way as in Step 4.
5. Copy the **Web app URL**. It looks like this:
   `https://script.google.com/macros/s/AKfycb............/exec`

## Step 6: Paste the URL into the card

1. In VS Code, open **script.js**.
2. Near the top, find this line:
   ```js
   APPS_SCRIPT_URL: "",
   ```
3. Paste your URL between the quotes, so it looks like:
   ```js
   APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycb..../exec",
   ```
4. Save (**Ctrl+S**).

## Step 7: Test it

1. Open **index.html** in your browser, tap **Buka Kad**, and scroll to the RSVP form.
2. Send a test RSVP with an ucapan.
3. You should see "Terima kasih! RSVP anda telah diterima." and your ucapan appear on the wall.
4. Check your Google Sheet. A new row should be there.
5. When you're done testing, **delete the test rows** in the Sheet (keep row 1, the headings).

---

## Day-to-day use

- **Who's coming:** every RSVP is a new row in the **RSVP** tab. The card shows the total number of guests (all "Bilangan" for "Hadir") above the ucapan wall.
- **Hide an ucapan:** type `x` in column **F (Sembunyi)** on that row. It disappears from the wall within a minute (their RSVP still counts).
- **RSVP closing:** the form closes automatically after **5 December 2026** (Malaysia time).

## If you ever change Code.gs later

Changes are **not live** until you redeploy:
**Deploy → Manage deployments → ✏️ (pencil) → Version: "New version" → Deploy.**
The Web app URL stays the same, so you don't need to change script.js.

## Troubleshooting

| Problem | Fix |
|---|---|
| "RSVP tidak dapat dihantar" | Check **Who has access** is **Anyone** (Deploy → Manage deployments → ✏️). |
| Wall says "Ucapan tidak dapat dimuatkan" | Same as above. Also check the URL in script.js ends with `/exec`. |
| Nothing in the Sheet | Make sure you ran **setup** (Step 4) and pasted the code into the Apps Script opened *from this Sheet*. |
