/* =====================================================================
   Spelling Adventures — sentences.js
   Builds simple, grade-appropriate sentences for any spelling word —
   no internet or AI service needed.

   How it works:
     1. A teacher-written example sentence (from the list editor) always comes first.
     2. Common "sight words" (said, because, their…) have hand-written sentences.
     3. Every other word gets a "word type" (naming word, action word, describing
        word…), either chosen by the teacher in the editor or guessed from a
        built-in word list and word endings (-ly, -ness, -ful, -ing …).
        Sentence templates for that word type and grade band are filled in.

   Grade bands: 1 = grades 1–2, 2 = grades 3–4 (and Custom), 3 = grades 5–6.
   ===================================================================== */
'use strict';

const Sentences = (() => {
  const NAMES = ['Maya', 'Leo', 'Sam', 'Ava', 'Noah', 'Zoe', 'Eli', 'Mia', 'Omar', 'Lily', 'Jack', 'Rosa',
    'Ben', 'Priya', 'Max', 'Chloe', 'Theo', 'Nora', 'Jada', 'Luis'];
  const PLACES = ['the park', 'the library', 'school', 'the beach', "Grandma's house", 'the zoo',
    'the garden', 'the playground', 'the museum', 'camp'];
  const PETS = ['puppy', 'kitten', 'turtle', 'bunny', 'parrot', 'hamster', 'goldfish', 'pony'];

  /* Word types the teacher can choose in the editor. */
  const TYPES = {
    auto: 'Auto (guess for me)',
    noun: 'Naming word (a thing)',
    plural: 'Naming word (more than one)',
    abstract: 'Idea or feeling (kindness)',
    verb: 'Action word (jump)',
    past: 'Action word, past (jumped)',
    ing: 'Action word, -ing (jumping)',
    adjective: 'Describing word (happy)',
    color: 'Color word',
    superlative: 'Most-word (biggest)',
    adverb: 'How-word (quickly)',
    other: 'Other / sight word',
  };

  /* ---------- Built-in word list for guessing word types ---------- */
  const LEX = {};
  const addLex = (type, words) => words.split(/\s+/).forEach(w => { LEX[w] = type; });
  addLex('noun', `cat dog hat map bag sun bus bed box fox pig hen pan pen cup mop pot rug bug jet net van web
    ant bat cap fan jam log nut bike kite cake game home rope bone boat coat road goat tree bee frog fish duck
    ship shell chair table apple ball book desk bird nest truck train plane house horse mouse cloud flower
    garden rocket robot pencil crayon teacher doctor farmer friend family baby kitten puppy rabbit turtle
    rainbow backpack birthday butterfly playground football snowman sandwich basket bucket candle castle
    dragon window kitchen island mountain river ocean forest planet desert jungle volcano habitat organism
    telescope microscope biography autograph spectator invention machine computer library museum journey
    adventure animal insect dinosaur monster pirate scientist president village city country continent
    contest harvest chest question answer problem lesson picture letter number pattern sheep deer moose
    dream beach peach leaf seed wheel queen king ring wing thing string swing spring morning evening
    ceiling building painting`);
  addLex('plural', `teeth feet mice geese children men women dice oxen`);
  addLex('abstract', `sunshine energy gravity temperature kindness happiness weather music friendship courage
    honesty science history math knowledge freedom democracy pollution nutrition sadness darkness homework
    breakfast lunch dinner money time fun help peace luck health safety exercise electricity`);
  addLex('verb', `run jump sit hop swim play read sing dance eat drink sleep walk talk climb laugh smile cry help
    make bake build draw paint think learn listen look find bring carry catch throw kick skip spin clap wave
    shout whisper explore discover observe predict measure compare describe explain create invent imagine
    decide believe remember forget borrow return travel visit collect protect share wonder wander transport
    construct evaporate investigate celebrate organize improve include divide multiply subtract solve
    practice prepare begin finish arrive escape suggest invest`);
  addLex('past', `ran sat hid swam sang ate drank slept came went saw took made found told brought caught taught
    bought flew drew grew knew threw wrote rode broke chose spoke stood understood began won lost felt kept
    left met paid sent spent built heard`);
  addLex('adjective', `sad mad glad big small tall short happy funny silly sunny windy rainy cloudy snowy hungry
    sleepy angry busy easy hard soft loud quiet quick slow fast hot cold warm cool brave kind gentle proud shy
    strong tiny huge giant fancy clever bright dark shiny careful beautiful thoughtful helpful wonderful
    curious nervous famous enormous delicious honest friendly lovely lonely ugly early fresh sweet sour
    smooth rough sticky fluffy noisy messy tidy lucky scary`);
  addLex('color', `red blue green yellow orange purple pink brown black white gray grey gold silver`);
  addLex('adverb', `quickly slowly quietly loudly carefully happily sadly softly gently bravely suddenly finally
    proudly politely calmly eagerly`);
  addLex('other', `this that these those his her has is was does yes no not and or but if so`);

  // Words that look like they match an ending rule but don't.
  const NOT_ADVERB = new Set(['friendly', 'lovely', 'lonely', 'silly', 'ugly', 'holy', 'early', 'curly', 'jolly',
    'chilly', 'hilly', 'smelly', 'family', 'belly', 'jelly', 'fly', 'only', 'reply', 'supply', 'butterfly']);

  /* ---------- Hand-written sentences for common sight words ---------- */
  const BANK = {
    the: ['The dog ran to the gate.', 'I put the book on the shelf.', 'The sun is hot today.'],
    and: ['I like apples and grapes.', 'Mom and I baked cookies.', 'We ran and jumped all day.'],
    can: ['I can ride my bike.', 'Can you help me find my shoe?', 'We can play after lunch.'],
    said: ['"I am hungry," said the bear.', 'Mom said we could go to the park.', 'My friend said hello to me.'],
    was: ['The cake was yummy.', 'It was raining this morning.', 'My dog was sleepy after the walk.'],
    they: ['They played tag at recess.', 'They have a big red barn.', 'Where did they go?'],
    there: ['There is a bird in the tree.', 'Put your bag over there.', 'There are five ducks in the pond.'],
    their: ['The kids rode their bikes.', 'The birds built their nest.', 'They left their shoes by the door.'],
    "they're": ["They're going to the zoo today.", "I think they're on the bus.", "They're my best friends."],
    where: ['Where is my other sock?', 'I know where the cookies are.', 'Where do you live?'],
    because: ['I wore a coat because it was cold.', 'We laughed because the joke was funny.', 'The plant grew because we watered it.'],
    could: ['I could see the moon last night.', 'Could you help me, please?', 'She could swim across the pool.'],
    would: ['Would you like some juice?', 'I would love to visit the zoo.', 'He said he would call later.'],
    should: ['You should wear a helmet when you ride.', 'We should clean up our toys.', 'What should we play next?'],
    people: ['Many people came to the parade.', 'People need water to live.', 'Kind people help each other.'],
    friend: ['My friend shared her snack with me.', 'A good friend listens.', 'I made a new friend at school.'],
    again: ['Can we read that book again?', 'I tried again and I did it!', 'The rain came back again.'],
    about: ['We read a book about frogs.', 'Tell me about your weekend.', 'It is about time for lunch.'],
    many: ['How many apples do you have?', 'There are many stars in the sky.', 'Many birds fly south in the fall.'],
    some: ['Can I have some milk?', 'Some leaves are red and some are yellow.', 'I need some help with this puzzle.'],
    come: ['Please come to my party.', 'Come and see the rainbow!', 'When will you come home?'],
    what: ['What is your favorite color?', 'I know what you made!', 'What a fun day!'],
    when: ['When is your birthday?', 'I smile when I see my dog.', 'When it snows, we build a snowman.'],
    who: ['Who wants to play?', 'Who ate the last cookie?', 'The girl who sits by me is nice.'],
    why: ['Why is the sky blue?', 'Why did the chicken cross the road?', 'I know why you are smiling.'],
    have: ['I have two brothers.', 'We have art on Monday.', 'Do you have a pencil?'],
    from: ['I got a letter from Grandpa.', 'We walked home from school.', 'The apples came from our tree.'],
    were: ['We were late for the bus.', 'The puppies were so cute.', 'Where were you at lunch?'],
    does: ['Does your cat like to play?', 'She does her homework after dinner.', 'What does this word mean?'],
    very: ['The elephant is very big.', 'I am very happy today.', 'That was a very funny joke.'],
    every: ['I brush my teeth every night.', 'Every kid got a sticker.', 'We go to the library every week.'],
    know: ['I know how to tie my shoes.', 'Do you know the answer?', 'We know all the words to the song.'],
    write: ['I can write my name.', 'Please write the date at the top.', "Let's write a letter to Grandma."],
    right: ['Turn right at the big tree.', 'You got the answer right!', 'Raise your right hand.'],
    before: ['Wash your hands before you eat.', 'I read a book before bed.', 'We had never been there before.'],
    after: ['We play outside after lunch.', 'After the rain, we saw a rainbow.', 'The puppy ran after the ball.'],
    other: ['Where is my other shoe?', 'The other team played well.', 'We help each other.'],
    which: ['Which book do you want?', 'Which way is the park?', "I can't decide which cookie to eat."],
    through: ['We walked through the forest.', 'The ball went through the window.', 'I read the book all the way through.'],
    though: ['It was cold, though the sun was out.', 'Even though I was tired, I finished.', 'The test was hard, though I did my best.'],
    thought: ['I thought about my answer.', 'She thought the movie was funny.', 'That was a kind thought.'],
    enough: ['Do we have enough chairs?', 'I had enough to eat.', 'Is the water warm enough to swim?'],
    different: ['Every snowflake is different.', 'We tried a different game.', 'My sister and I like different colors.'],
    together: ['We worked together on the puzzle.', "Let's sing together!", 'The class walked together to the gym.'],
    always: ['I always wear my seatbelt.', 'My dog always wags his tail.', 'We always have pizza on Fridays.'],
    never: ['I never forget my lunch.', 'Never touch a hot stove.', 'I have never seen a whale.'],
    once: ['Once upon a time, there was a dragon.', 'I have been to the beach once.', 'Read the page once more.'],
    any: ['Do you have any crayons?', "I don't have any homework today.", 'Pick any book you like.'],
    been: ['I have been to the zoo.', 'Where have you been?', 'We have been friends since kindergarten.'],
    give: ['Please give me the ball.', 'I will give my mom a hug.', "Let's give the plants some water."],
    one: ['I have one sister.', 'Only one cookie is left.', 'We won the game by one point.'],
    two: ['I have two cats.', 'The bus comes at two o\'clock.', 'Two birds sat on the fence.'],
    three: ['I have three pets.', 'Three ducks swam in the pond.', 'Count to three and jump!'],
    four: ['A dog has four legs.', 'We have four people in my family.', 'I will be home at four.'],
    too: ['I want to come too!', 'The soup is too hot.', 'That box is too heavy.'],
    to: ['We went to the store.', 'I like to draw.', 'Give the note to your teacher.'],
    your: ['Is this your hat?', 'Put on your coat.', 'Your drawing is beautiful.'],
    "you're": ["You're my best friend.", "I think you're right.", "You're doing a great job!"],
    you: ['Thank you for the gift.', 'Can you help me?', 'I like you a lot!'],
    here: ['Come over here!', 'Here is your snack.', 'I have lived here all my life.'],
    please: ['Please pass the salt.', 'May I please have a turn?', 'Please close the door.'],
    sometimes: ['Sometimes I eat cereal for breakfast.', 'It sometimes snows in April.', 'Sometimes we walk to school.'],
    of: ['I drank a glass of milk.', 'The top of the hill is windy.', 'A box of crayons sat on the desk.'],
    for: ['This gift is for you.', 'We waited for the bus.', 'Thank you for helping me.'],
    are: ['You are my best friend.', 'The flowers are blooming.', 'Where are my shoes?'],
    into: ['The frog jumped into the pond.', 'Pour the water into the cup.', 'We went into the cave.'],
    over: ['The cow jumped over the moon.', 'The game is over.', 'Come over to my house.'],
    under: ['The cat is under the bed.', 'We sat under a big tree.', 'Look under the rug!'],
    this: ['This is my favorite book.', 'Can I try this one?', 'This apple is so crunchy.'],
    that: ['That dog is so fluffy.', 'I like that song.', 'Is that your backpack?'],
    with: ['I play with my sister.', 'Come with me!', 'I ate pancakes with syrup.'],
    want: ['I want a new book.', 'Do you want to play?', 'We want pizza for dinner.'],
    went: ['We went to the zoo.', 'She went home early.', 'The lights went out!'],
    look: ['Look at the stars!', 'I will look for my hat.', 'Look both ways before you cross.'],
    little: ['The little bird sang a song.', 'I have a little brother.', 'Can I have a little more?'],
    also: ['I also like grapes.', 'My cat is also orange.', 'We also need some glue.'],
    until: ['Wait until the bell rings.', 'We played until dark.', 'Keep stirring until it is smooth.'],
    almost: ['It is almost time for lunch.', 'I almost fell off my bike.', 'We are almost home!'],
  };

  /* ---------- Templates: [lowest band, highest band, text] ----------
     {w} = the word, {a} = "a"/"an" for the word, {name} {place} {pet} = random fill-ins. */
  const T = {
    noun: [
      [1, 1, 'I like the {w}.'],
      [1, 2, 'Is that {a} {w}?'],
      [1, 2, 'Look at that {w}!'],
      [1, 2, 'Can you draw {a} {w}?'],
      [1, 3, 'We read a story about {a} {w}.'],
      [1, 3, '{name} told us about {a} {w}.'],
      [2, 3, 'Have you ever seen {a} {w} up close?'],
      [2, 3, '{name} asked a question about the {w}.'],
      [2, 3, 'The {w} was the best part of the story.'],
      [2, 3, 'I want to learn more about the {w}.'],
      [3, 3, '{name} described the {w} in great detail for the class.'],
      [3, 3, '{name} wrote three facts about {a} {w}.'],
      [3, 3, 'Everyone in the group had a different idea about the {w}.'],
    ],
    abstract: [
      [1, 2, 'We talked about {w} at school today.'],
      [1, 3, '{name} wrote about {w} in a journal.'],
      [1, 2, 'I learned something new about {w} today.'],
      [2, 3, 'Our class had a great talk about {w}.'],
      [2, 3, 'Can you explain what {w} means?'],
      [2, 3, '{name} read a book that was all about {w}.'],
      [3, 3, '{w} is an important idea that we studied this week.'],
      [3, 3, 'The article gave three examples of {w}.'],
      [3, 3, '{name} gave a short speech about {w}.'],
    ],
    plural: [
      [1, 2, '{name} drew three {w}.'],
      [1, 2, 'There are so many {w} in this picture!'],
      [1, 3, 'The {w} are on the table.'],
      [1, 2, 'Can you count the {w}?'],
      [2, 3, 'We lined up all the {w} in a row.'],
      [2, 3, '{name} put the {w} in a big box.'],
      [3, 3, 'The {w} were sorted carefully into groups.'],
      [3, 3, 'Everyone was surprised by how many {w} we found.'],
    ],
    verb: [
      [1, 2, 'I like to {w}.'],
      [1, 2, 'Can you {w}?'],
      [1, 3, 'It is fun to {w}.'],
      [1, 2, "Let's {w} after lunch."],
      [1, 3, '{name} wants to {w} today.'],
      [2, 3, '{name} is learning how to {w}.'],
      [2, 3, 'We will {w} in class tomorrow.'],
      [3, 3, 'Before we {w}, we should read the directions.'],
      [3, 3, '{name} practiced until it was easy to {w}.'],
      [3, 3, 'Our teacher showed us the best way to {w}.'],
    ],
    past: [
      [1, 2, 'Yesterday, {name} {w} at {place}.'],
      [1, 3, 'We {w} after lunch.'],
      [1, 2, 'My {pet} {w} all day.'],
      [2, 3, '{name} {w} for the very first time!'],
      [2, 3, 'Last summer, my family {w} together.'],
      [3, 3, 'After a long wait, the class finally {w}.'],
      [3, 3, 'Nobody expected that we {w} so well.'],
    ],
    ing: [
      [1, 2, '{name} is {w}.'],
      [1, 2, 'I love {w}!'],
      [1, 3, 'We were {w} at {place}.'],
      [2, 3, '{name} spent the afternoon {w}.'],
      [2, 3, 'My {pet} keeps {w} all day long.'],
      [3, 3, 'After hours of {w}, everyone needed a rest.'],
    ],
    adjective: [
      [1, 2, 'The {pet} looked so {w}.'],
      [1, 3, '{name} was very {w} today.'],
      [1, 2, 'My friend is so {w}.'],
      [1, 3, '{name} is {a} {w} friend.'],
      [2, 3, 'Everyone agreed that {name} was {w}.'],
      [2, 3, 'The new student seemed {w} on the first day.'],
      [3, 3, '{name} is known for being {w}.'],
      [3, 3, 'In the story, the main character was {w} from beginning to end.'],
    ],
    color: [
      [1, 3, 'My favorite color is {w}.'],
      [1, 3, '{name} painted the fence {w}.'],
      [1, 2, 'I have {a} {w} kite.'],
      [1, 3, 'Look at that {w} bird!'],
      [2, 3, '{name} picked the {w} crayon from the box.'],
    ],
    superlative: [
      [1, 3, 'This is the {w} {pet} in town.'],
      [1, 3, '{name} built the {w} sandcastle on the beach.'],
      [2, 3, 'That was the {w} day of the whole year!'],
      [3, 3, 'Of all the stories, this one is the {w}.'],
    ],
    adverb: [
      [1, 2, 'The {pet} walked {w} to its bowl.'],
      [1, 3, '{name} {w} opened the box.'],
      [1, 2, 'Please do your work {w}.'],
      [2, 3, 'The turtle moved {w} across the road.'],
      [2, 3, '{name} {w} raised a hand to answer.'],
      [3, 3, 'The scientist {w} recorded each result.'],
      [3, 3, 'The crowd cheered {w} as the team ran onto the field.'],
    ],
    other: [
      [1, 3, 'Can you find the word "{w}" in a book?'],
      [1, 3, 'Say the word "{w}" and clap the sounds.'],
      [2, 3, 'Use the word "{w}" when you talk to a friend today.'],
      [3, 3, 'Write a sentence of your own using the word "{w}."'],
    ],
  };

  /* Story (paragraph) sentences — third person, so a story reads smoothly. */
  const STORY = {
    noun: ['Along the way, {name} spotted {a} {w}.', 'Then {name} saw a picture of {a} {w}.', 'Someone told {name} a funny story about {a} {w}.'],
    abstract: ['{name} learned something new about {w}.', 'Later, {name} told everyone about {w}.', 'Then {name} read a poster all about {w}.'],
    plural: ['Soon, {name} noticed a bunch of {w}.', '{name} counted the {w} one by one.'],
    verb: ['Then {name} decided to {w}.', 'Next, it was time for {name} to {w}.', 'A helper showed {name} how to {w}.'],
    past: ['After that, {name} {w} with a big smile.', 'Later, {name} {w} for a while.'],
    ing: ['{name} could not stop {w}!', 'Before long, {name} was {w} again.'],
    adjective: ['Everyone could see that {name} was {w}.', '{name} felt {w} all afternoon.'],
    color: ['{name} saw {a} {w} balloon floating by.', 'Suddenly, a {w} bird landed nearby.'],
    superlative: ['It was the {w} adventure {name} had ever had.'],
    adverb: ['{name} {w} tiptoed to the next spot.', '{name} {w} walked down the path.'],
    other: ['Then {name} saw the word "{w}" written on a sign.'],
  };
  const INTRO = {
    1: ['One sunny day, {name} went to {place}.', '{name} woke up early on Saturday.'],
    2: ['On a bright Saturday morning, {name} set off for {place}.', '{name} could hardly wait for the trip to {place}.'],
    3: ['It was the first warm day of spring, and {name} was heading to {place}.', 'When {name} arrived at {place}, something felt different.'],
  };
  const OUTRO = {
    1: ['It was a great day!', '{name} went home happy.'],
    2: ['By the end of the day, {name} was tired but happy.', 'What an adventure it had been!'],
    3: ['As the sun set, {name} smiled and thought about everything that had happened.', 'It was a day {name} would remember for a long time.'],
  };

  /* ---------- helpers ---------- */
  const bandFor = grade => gradeInfo(grade).band;

  function article(word) {
    const w = word.toLowerCase();
    if (/^(hour|honest|honor|heir)/.test(w)) return 'an';
    if (/^(uni|use|usu|eu|one|once|ewe)/.test(w)) return 'a';
    return /^[aeiou]/.test(w) ? 'an' : 'a';
  }

  function fill(template, word, name) {
    return template
      .replace(/\{name\}/g, name || Util.pick(NAMES))
      .replace(/\{place\}/g, () => Util.pick(PLACES))
      .replace(/\{pet\}/g, () => Util.pick(PETS))
      .replace(/\{a\}/g, article(word))
      .replace(/\{w\}/g, word);
  }

  /** Guess the word type from the teacher's choice, the word list, or its ending. */
  function detect(wordObj) {
    if (wordObj.pos && wordObj.pos !== 'auto' && TYPES[wordObj.pos]) return wordObj.pos;
    const w = Util.norm(wordObj.word);
    if (LEX[w]) return LEX[w];
    if (BANK[w]) return 'other';
    if (w.includes(' ')) return 'other';
    if (/(ness|ment|ity|tion|sion|ance|ence|dom|hood|ship|ism)$/.test(w)) return 'abstract';
    if (/[^aeiou]ly$/.test(w) && w.length > 4 && !NOT_ADVERB.has(w)) return 'adverb';
    if (/est$/.test(w) && w.length > 5) return 'superlative';
    if (/ing$/.test(w) && w.length > 5) return 'ing';
    if (/[^e]ed$/.test(w) && w.length > 4 && w !== 'hundred') return 'past';
    if (/(ful|ous|ive|able|ible|less|ish)$/.test(w)) return 'adjective';
    if (/[^su]s$/.test(w) && w.length > 3) return 'plural';
    return 'noun';
  }

  function unique(arr) {
    const seen = new Set();
    return arr.filter(s => { const k = s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  }

  /** Make 3–5 sentences that use the word. */
  function generate(wordObj, grade, count = 4) {
    const word = wordObj.word;
    const band = bandFor(grade);
    const out = [];
    if (wordObj.sentence) out.push(wordObj.sentence);
    const bank = BANK[Util.norm(word)];
    if (bank) out.push(...Util.shuffle(bank));
    const type = detect(wordObj);
    // Skip the "find the word…" style templates when a real sight-word sentence exists.
    if (!(type === 'other' && bank)) {
      const all = T[type] || T.other;
      let pool = all.filter(t => band >= t[0] && band <= t[1]);
      if (pool.length < count) pool = all;
      Util.shuffle(pool).forEach(t => out.push(fill(t[2], word)));
    }
    return unique(out).slice(0, count).map(Util.capFirst);
  }

  /** A short story using several list words. Returns { sentences, words }. */
  function story(wordObjs, grade) {
    const band = bandFor(grade);
    const name = Util.pick(NAMES);
    const sentences = [fill(Util.pick(INTRO[band]), '', name)];
    const used = new Set(); // avoid repeating the same story sentence pattern
    wordObjs.forEach(wo => {
      const type = detect(wo);
      const bank = BANK[Util.norm(wo.word)];
      if (type === 'other' && bank) return sentences.push(Util.pick(bank));
      const options = STORY[type] || STORY.other;
      const fresh = options.filter(t => !used.has(t));
      const t = Util.pick(fresh.length ? fresh : options);
      used.add(t);
      sentences.push(fill(t, wo.word, name));
    });
    sentences.push(fill(Util.pick(OUTRO[band]), '', name));
    return { sentences: sentences.map(Util.capFirst), words: wordObjs };
  }

  /** Wrap every appearance of the word in <mark> (text is HTML-escaped first). */
  function highlight(sentence, word) {
    const safe = Util.esc(sentence);
    const re = new RegExp(`(^|[^a-z])(${Util.reEsc(Util.esc(word))})(?![a-z])`, 'gi');
    return safe.replace(re, '$1<mark>$2</mark>');
  }

  /** Replace the word with a blank. Returns null if the sentence doesn't contain the exact word. */
  function blank(sentence, word, blankText = '_______') {
    const re = new RegExp(`(^|[^a-z])(${Util.reEsc(word)})(?![a-z])`, 'i');
    if (!re.test(sentence)) return null;
    return sentence.replace(re, `$1${blankText}`);
  }

  /** A sentence with a blank where the word goes (always succeeds). */
  function blankSentence(wordObj, grade) {
    for (const s of generate(wordObj, grade, 5)) {
      const b = blank(s, wordObj.word);
      if (b) return { sentence: s, blanked: b };
    }
    const s = `The spelling word is ${wordObj.word}.`;
    return { sentence: s, blanked: blank(s, wordObj.word) };
  }

  return { TYPES, detect, generate, story, highlight, blank, blankSentence };
})();
