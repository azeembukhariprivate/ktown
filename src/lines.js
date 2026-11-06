// Everything people say in KTOWN: Malayalam (shown in the speech bubbles) and its meaning in English (shown small
// underneath). All in one place, so the lines are easy to check and change. Each line is [Malayalam, English].

export const LINES = {
  // Townspeople, now and then, as Inaara passes.
  neighbour: [
    ['നമസ്കാരം മോളേ!', 'Hello, little one!'],
    ['എവിടെ പോവാ?', 'Where are you off to?'],
    ['സുഖമാണോ?', 'Are you well?'],
    ['സൂക്ഷിച്ച് പോണേ!', 'Go carefully!'],
    ['നല്ല ചൂട്, അല്ലേ?', "It's hot, isn't it?"],
    ['മഴ വരുമെന്ന് തോന്നുന്നു.', 'Looks like rain is coming.'],
    ['വീട്ടിൽ എല്ലാവർക്കും സുഖമല്ലേ?', 'Is everyone well at home?'],
    ['ഇന്ന് സ്കൂളില്ലേ?', 'No school today?']
  ],
  seller: [
    ['ഏത്തപ്പഴം, ഏത്തപ്പഴം!', 'Bananas, bananas!'],
    ['നല്ല ഫ്രഷ് പച്ചക്കറി!', 'Nice fresh vegetables!'],
    ['ചെറുനാരങ്ങ, പത്ത് രൂപയ്ക്ക്!', 'Limes, ten rupees!'],
    ['വാ മോളേ, നോക്കിയിട്ട് പോ!', 'Come and have a look, little one!']
  ],
  shopkeeper: [
    ['എന്താ വേണ്ടത്?', 'What would you like?'],
    ['വാ, വാ, അകത്തേക്ക് വാ!', 'Come, come on in!'],
    ['ഇന്ന് നല്ല സാധനങ്ങൾ വന്നിട്ടുണ്ട്!', 'New things came in today!']
  ],
  tea: [
    ['ചായ വേണോ മോളേ?', 'Want some tea, little one?'],
    ['ചൂട് പഴംപൊരി ഉണ്ട്!', 'Hot banana fritters here!']
  ],
  driver: [
    ['മാറി നിൽക്ക്!', 'Move aside!'],
    ['ഓട്ടോ വേണോ?', 'Need an autorickshaw?']
  ],
  ride: {
    where: ['എങ്ങോട്ടാ?', 'Where to?'],
    hop: ['കയറിക്കോ!', 'Hop in!'],
    here: ['എത്തി!', "We're here!"],
    free: ['സാരമില്ല, മോളേ. വീട്ടിൽ കൊണ്ടാക്കാം.', "Never mind, little one. I'll take you home."],
    short: ['പൈസ തികയില്ല, മോളേ.', "That's not enough money, little one."]
  },
  // Inaara's own little answers.
  inaara: {
    ok: ['ശരി!', 'Okay!'],
    thanks: ['നന്ദി!', 'Thank you!'],
    willDo: ['ഞാൻ ചെയ്യാം!', "I'll do it!"],
    here: ['ഇതാ!', 'Here you go!'],
    hi: ['ഹായ്!', 'Hi!'],
    won: ['ഞാൻ ജയിച്ചു!', 'I won!'],
    found: ['കിട്ടി!', 'Found it!'],
    oops: ['അയ്യോ!', 'Oops!'],
    caught: ['പിടിച്ചു!', 'Caught it!']
  },
  // Her three friends across Pond Lane.
  atyb: {
    hi: ['ഇനാര, റേസിന് വരുന്നോ?', 'Inaara, want to race?'],
    bike: ['സൈക്കിൾ എടുത്തിട്ട് വാ!', 'Go and get your bicycle!'],
    go: ['ഒന്ന്, രണ്ട്, മൂന്ന്... പോ!', 'One, two, three... go!'],
    lost: ['ഞാൻ ജയിച്ചു! ഒന്നുകൂടി നോക്കാം?', 'I won! Shall we try again?'],
    won: ['നീ ജയിച്ചു! സൂപ്പർ!', 'You won! Super!'],
    idle: ['ഞാനാ ഏറ്റവും വേഗം!', "I'm the fastest!"]
  },
  aydin: {
    lost: ['എന്റെ പന്ത് കാണാനില്ല!', 'My ball is missing!'],
    thanks: ['പന്ത് കിട്ടിയോ? സൂപ്പർ!', 'You found my ball? Super!'],
    catch: ['പിടിച്ചോ!', 'Catch!'],
    play: ['പന്ത് കളിക്കാം?', 'Shall we play catch?'],
    done: ['നല്ല കളി!', 'Good game!']
  },
  aiza: {
    treat: ['പഴംപൊരി വേണം!', 'I want a banana fritter!'],
    yum: ['ഹായ്, നല്ല രുചി!', 'Yay, so tasty!'],
    hand: ['ചേച്ചീ, കൈ പിടിക്കോ.', 'Big sister, hold my hand.'],
    wait: ['ചേച്ചീ, നിൽക്ക്!', 'Big sister, wait!'],
    home: ['വീടെത്തി!', "We're home!"],
    idle: ['ഐസ്ക്രീം വേണം!', 'I want ice cream!']
  },
  // The people who give jobs.
  jobs: {
    velu: {
      ask: ['മോളേ, ഈ പലഹാരം ടെമ്പിൾ റോഡിലെ വീട്ടിൽ കൊടുക്കാമോ?', 'Little one, could you take these snacks to a house on Temple Road?'],
      thanks: ['മിടുക്കി! ഇതാ നിനക്ക്.', 'Clever girl! This is for you.'],
      groceries: ['ലക്ഷ്മി സ്റ്റോറിൽ നിന്ന് സാധനം കിട്ടിയോ? നന്ദി!', 'The things from Lakshmi Stores? Thank you!']
    },
    kunjamma: {
      ask: ['ഈ പഴക്കുല പോണ്ട് ലെയ്നിലെ വീട്ടിൽ എത്തിക്കാമോ?', 'Could you take this bunch of bananas to a house on Pond Lane?'],
      thanks: ['നന്ദി മോളേ!', 'Thank you, little one!']
    },
    mariyamma: {
      ask: ['മോളേ, എന്നെ മാർക്കറ്റിൽ ഒന്ന് കൊണ്ടുപോവാമോ? ഓട്ടോയിൽ പോവാം.', 'Little one, could you take me to the market? We can go by autorickshaw.'],
      wrong: ['അല്ല മോളേ, മാർക്കറ്റിലേക്ക്!', 'No, little one, to the market!'],
      thanks: ['നീ എന്റെ പൊന്നുമോളാ!', "You're a treasure!"]
    },
    gopalan: {
      ask: ['എന്റെ ആട് എങ്ങോട്ടോ പോയി! തെങ്ങിൻതോപ്പിൽ കാണും.', "My goat has wandered off! It'll be in the coconut grove."],
      thanks: ['ആടിനെ കിട്ടി! നന്ദി!', 'You found my goat! Thank you!']
    },
    lakshmi: {
      ask: ['ഈ സാധനങ്ങൾ ചായക്കടയിൽ കൊടുക്കാമോ?', 'Could you take these things to the tea shop?']
    },
    sarada: {
      ask: ['ബുക്ക് സ്റ്റാളിൽ എനിക്കൊരു പുസ്തകം ഉണ്ട്. കൊണ്ടുവരാമോ?', 'There is a book for me at the Book Stall. Could you bring it?'],
      stall: ['ടീച്ചറുടെ പുസ്തകമല്ലേ? ഇതാ.', "The teacher's book? Here it is."],
      thanks: ['വളരെ നന്ദി, മോളേ!', 'Thank you so much, little one!']
    },
    leela: {
      ask: ['എന്റെ പൂച്ചയെ കാണാനില്ല! ഏതോ വീട്ടുമുറ്റത്തുണ്ടാവും.', "My cat is missing! It'll be in someone's yard."],
      thanks: ['പൂച്ചക്കുട്ടി വന്നു! നന്ദി മോളേ!', 'My kitten is back! Thank you, little one!']
    },
    everyday: {
      ask: ['മോളേ, ഒരു സഹായം ചെയ്യാമോ?', 'Little one, could you help me?'],
      thanks: ['നന്ദി!', 'Thank you!']
    }
  },
  // The end: the town gives her the jasmine garland.
  garland: {
    call: ['എല്ലാവരും കവലയിൽ കാത്തിരിക്കുന്നു!', 'Everyone is waiting at Kavala Junction!'],
    cheer: ['അഭിനന്ദനങ്ങൾ, ഇനാര!', 'Congratulations, Inaara!'],
    friend: ['നീ ഞങ്ങളുടെ എല്ലാവരുടെയും കൂട്ടുകാരിയാ!', "You're everyone's friend!"]
  },
  coin: ['ഒരു നാണയം!', 'A coin!']
};

/** A line from a list (picked at random), or the line itself. */
export function pick(list, r = Math.random) {
  if (!Array.isArray(list[0])) return list;
  return list[Math.floor(r() * list.length) % list.length];
}
