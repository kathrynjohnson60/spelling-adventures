# Spelling Adventures 🚀

A spelling practice app for grades 1–6+. Teachers and parents make spelling lists, and the app turns each list into tests, games, flashcards, and sentences.

## How to open it

Double-click **`index.html`**. It opens in your web browser. Chrome, Edge, or Safari work best, because they can read words aloud.

You don't need an internet connection, an account, or any installs. Lists are saved in the browser you open it in, on that device.

## Getting words pronounced correctly

Words are read by the browser's own voice. The voice quality depends on the browser:
- **Microsoft Edge** has "Natural" voices that sound almost human. They are the best choice.
- **Google Chrome** has "Google US English," which is very good.
- Older Windows voices (David, Zira, Mark) are robotic and sometimes say single words wrong. If those are the only voices, Settings shows a warning.

The app picks the clearest voice automatically. If a word still sounds wrong, open the list editor and type how the word sounds in its **Say it like…** box (for example *duz* for "does"). Students still see and spell the real word.

## Moving lists to another computer or tablet

Go to **Settings → Download backup**. On the other device, open the app and choose **Settings → Load backup file**.

To put the app itself on another device, copy the whole `spelling-adventures` folder.

## What's inside

| Activity | What students do |
|---|---|
| 📝 Spelling Test | Hear each word (word, sentence, word) and type it. Say it again, say it slowly, use it in a sentence, define it, or skip. |
| 🏃 Escape the Danger | Type letters to escape. Four painted scenes: Castle Escape (princess and wolf), Lake Escape (rowboat and shark), Forest Frenzy (bear), and River Crossing (stepping stones). Too many mistakes: the danger carries the hero away, then the scene fades to "Try again!" |
| 🃏 Memory Match | Flip cards to match each word with its picture and sound, its definition, or itself. |
| 🔀 Word Scramble | Tap letter tiles to unscramble the word. |
| 🔍 Missing Letters | Fill in the 1–3 missing letters. |
| 🎈 Balloon Pop | Hangman-style guessing. A wrong guess pops a balloon. |
| ⚡ Speed Round | Spell as many words as possible in 1–2 minutes. |
| 🎧 Listen & Type | Audio only: listen and type. |
| 💬 Sentence Builder | See 3–5 sentences per word, read a short story, or fill in the blank. |
| 🗂️ Flashcards | Print 4 or 6 cards per page with cut lines, or flip through them on screen. |

**Practice Missed Words:** a word missed in any activity is added to that list's 🎯 missed words. It is removed after the student spells it correctly. Practice missed words from the dashboard, from the list page, or from the end of any game.

## Files

- `index.html`: the page
- `css/styles.css`: colors, layout, animations, print layout
- `js/util.js`: helpers, sound effects, speech, shared screens
- `js/store.js`: saving lists and settings, plus the sample lists
- `js/sentences.js`: the sentence generator
- `js/views.js`: dashboard, list page, list editor, settings
- `js/app.js`: starts the app and switches screens
- `js/activities/`: one file per activity
- `img/backgrounds/`, `img/characters/`: the storybook artwork for Escape the Danger (made by Kathryn Johnson)
- `samples/`: the stand-alone preview pages used to approve each scene (not linked from the app)
