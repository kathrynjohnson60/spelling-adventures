# Setting up teacher and parent accounts

Spelling Adventures uses **Firebase**, Google's free service, to store accounts and saved lists. Do this setup once, which takes about 15 minutes. It's free for a school-sized app; Firebase's free "Spark" plan doesn't ask for a credit card.

> **Check first:** your school may need to approve a new online service. If the setup asks you to choose a Google account, use the one your school approves for this.

## 1. Create the Firebase project
1. Go to **https://console.firebase.google.com** and sign in with Google.
2. Click **Create a project** (or **Add project**).
3. Name it **Spelling Adventures** and click **Continue**.
4. Turn **off** Google Analytics. It isn't needed. Then click **Create project**, wait, and click **Continue**.

## 2. Turn on sign-in
1. In the left menu, open **Build → Authentication** and click **Get started**.
2. On the **Sign-in method** tab:
   - Click **Email/Password**, switch on the first toggle (Email/Password), and click **Save**.
   - Click **Add new provider → Google**, switch it on, pick your email as the "support email," and click **Save**.
3. Open the **Settings** tab, then **Authorized domains**, click **Add domain**, and type **kathrynjohnson60.github.io**, then click **Add**. (`localhost` is already listed.)

## 3. Create the database
1. In the left menu, open **Build → Firestore Database** and click **Create database**.
2. Keep the suggested location (for example **nam5 (United States)**) and click **Next**.
3. Choose **Start in production mode** and click **Create**.
4. Open the **Rules** tab. Delete everything in the box, paste in the contents of the **`firestore.rules`** file from the `spelling-adventures` folder, and click **Publish**.

## 4. Copy the app settings
1. Click the **gear ⚙️ → Project settings** at the top left.
2. Under **Your apps**, click the **Web** button (it looks like `</>`).
3. Nickname: **Spelling Adventures website**. Leave "Firebase Hosting" **unchecked**. Click **Register app**.
4. Firebase shows a block of code with **`const firebaseConfig = { … }`**. Copy the part from `apiKey` down to `appId`, and send it to Claude, or paste it into `js/firebase-config.js` in place of `null`.

These settings are **not passwords**. Every website that uses Firebase includes them publicly. The security rules from step 3 are what keep each account's lists private.

## What gets stored
- **Teachers and parents:** their name, their email, and the spelling lists they save.
- **Shared lists:** the list's name, grade, and words, plus the teacher's display name.
- **Students:** nothing. Students never sign in, and their scores and missed words stay on their own device.
