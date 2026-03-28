export type DrillId = "accuracy" | "rhythm" | "long" | "punctuation" | "numbers";

export interface DrillDefinition {
  id: DrillId;
  label: string;
  description: string;
  targetAccuracy?: number;
  targetWpm?: number;
  samples: string[];
}

export const drills: DrillDefinition[] = [
  {
    id: "accuracy",
    label: "Accuracy Focus",
    description: "Slow down and hit 95% accuracy with clean keystrokes.",
    targetAccuracy: 95,
    samples: [
      "Slow and steady wins precision every single time.",
      "Accuracy is the foundation of every fast typist.",
      "Focus on clean inputs and consistent finger control.",
      "Every correct keystroke builds the habit of accuracy.",
      "Quiet hands, clear mind, perfect rhythm in each word.",
      "Precision grows when you never rush the first pass.",
      "Small errors compound; fix them before speeding up.",
      "Hit each spacebar with intention and control.",
      "Stay relaxed, keep your eyes ahead of the cursor.",
      "Perfect form today, higher speed tomorrow.",
      "Tap each letter with care, then move to the next.",
      "Keep your wrists light and your keystrokes exact.",
      "Intentional typing beats frantic speed every time.",
      "Correctness is a muscle; train it with patience.",
      "Steady fingers make fewer mistakes under pressure.",
      "Accuracy is a promise you keep for every word.",
      "Slow your breath and your errors will fade.",
      "Smooth inputs create confident results.",
      "Let precision guide you, not the clock.",
      "Focus on the word, not the finish line."
    ]
  },
  {
    id: "rhythm",
    label: "Rhythm",
    description: "Maintain steady pace and controlled flow.",
    targetWpm: 45,
    targetAccuracy: 92,
    samples: [
      "Rhythm is the balance between speed and accuracy.",
      "Keep a steady cadence and breathe between words.",
      "Smooth input creates consistent speed across sentences.",
      "Let your fingers drum a calm and even pattern.",
      "A steady beat makes long sessions feel easy.",
      "Flow is a habit: keep the tempo and avoid spikes.",
      "Even pacing turns practice into progress.",
      "Avoid sprinting; hold a clean, repeatable pace.",
      "Count the beats between words to stay grounded.",
      "Consistency is the metronome of fast typing.",
      "Find the groove and stay inside it.",
      "When the pace is smooth, errors fall away.",
      "Let the sentence guide your tempo and timing.",
      "Calm rhythm turns practice into muscle memory.",
      "Keep your speed even through short and long words.",
      "Hold the line with steady, controlled pulses.",
      "Momentum matters more than bursts.",
      "Let the rhythm carry you across the full line.",
      "A balanced cadence keeps fatigue away."
    ]
  },
  {
    id: "long",
    label: "Long Text",
    description: "Build endurance with longer passages.",
    targetAccuracy: 92,
    samples: [
      "Long sessions reward calm typing. Focus on precision while keeping momentum across each clause and phrase so fatigue does not reduce accuracy.",
      "Typing for endurance means maintaining a comfortable pace, checking posture, and letting rhythm guide your hands through longer paragraphs.",
      "Endurance practice is about patience: keep your breathing steady, your wrists light, and your eyes scanning one or two words ahead.",
      "Long form work demands focus. Settle into a pace you can hold for minutes, and let the sentence structure guide your flow.",
      "Sustain the run with relaxed shoulders and consistent keystrokes, even when the paragraph stretches longer than expected.",
      "As the passage grows, keep your fingers soft and your attention forward; accuracy depends on calm repetition and a steady gaze.",
      "Long practice is a quiet marathon: sit tall, breathe evenly, and let each phrase land cleanly before the next begins.",
      "The secret to long typing drills is gentle momentum, where every word arrives with intention and no sudden rush.",
      "Focus on the rhythm of the paragraph, not the speed of a single word, and the length will feel manageable.",
      "Build endurance by keeping your eyes ahead while your hands trace the sentence below, one steady beat at a time.",
      "The longer the text, the more important it is to stay relaxed and precise, so the last line is as clean as the first.",
      "Keep your pace steady and your posture open, and the paragraph will flow like a calm river.",
      "Long drills reward patience; each clause is a checkpoint that teaches control.",
      "Let your wrists float and your fingers dance lightly across the keys through the full passage.",
      "Stretch the sentence, not your stress level, and the words will stay accurate.",
      "Endurance grows when you breathe, blink, and keep the cadence smooth.",
      "Calm focus across long text trains the mind as much as the hands.",
      "Stay consistent, even when the line wraps and the paragraph continues.",
      "A steady pace across many lines creates real typing resilience.",
      "Long runs reveal habits; keep the good ones and relax the rest."
    ]
  },
  {
    id: "punctuation",
    label: "Punctuation",
    description: "Train with commas, quotes, and tricky punctuation.",
    targetAccuracy: 90,
    samples: [
      "Wait, pause, then type: commas, quotes, and dashes should feel natural.",
      "She said, \"Practice daily,\" and then smiled; it worked.",
      "Use punctuation correctly: commas, colons, semicolons; finish strong.",
      "Quote marks, parentheses (like these), and hyphens keep your hands honest.",
      "Type carefully: apostrophes, ellipses... and the occasional dash — all count.",
      "When punctuation is precise, the sentence reads like music.",
      "Remember: periods end thoughts, and commas keep them alive.",
      "Questions? Answers! Commands? All need punctuation.",
      "A dash — used well — can shift the tone quickly.",
      "Use colons: they introduce lists, explanations, and emphasis.",
      "The semicolon; it connects two close ideas.",
      "Parentheses (like this) add detail without distraction.",
      "Type the full quote, then close it cleanly.",
      "Ellipses... create a pause, not a stop.",
      "Keep apostrophes correct in don't, it's, and we'll.",
      "Punctuation shapes meaning; accuracy shapes trust.",
      "Commas matter, especially in long sentences, so watch them.",
      "Quotes can nest: \"He said, 'practice.'\"",
      "Hyphens join words; dashes break them apart.",
      "Finish each sentence with intention."
    ]
  },
  {
    id: "numbers",
    label: "Numbers",
    description: "Strengthen number row control and accuracy.",
    targetAccuracy: 90,
    samples: [
      "On 2026-03-22 we tracked 98 samples and 4 outliers.",
      "Dial 555-0199, enter 4827, then confirm the 3-step code.",
      "Budget: 1200 units, 35% allocation, 18 days remaining.",
      "Route 9B has 14 stops and 2 detours today.",
      "Invoice #2048 is due in 7 days; late fee is 5%.",
      "Set the timer for 03:45 and repeat 4 cycles.",
      "Temperature dropped to -2 overnight, then rose to 8.",
      "Use PIN 7391, then verify with code 602-118.",
      "Report shows 47 items, 12 pending, and 6 closed.",
      "The ratio is 3:2, not 2:3, so recalc the total.",
      "Flight B12 departs at 07:15 from gate 4.",
      "We logged 3 errors in 1,024 attempts.",
      "Score: 18-21 in set 2, then 25-23 in set 3.",
      "Track 5 km in 22:19 with 142 bpm.",
      "The version is 2.4.9, not 2.4.8.",
      "Batch #77 ships 14 boxes, each 12 kg.",
      "Use 60% force for 8 seconds, then 40% for 6.",
      "Coordinates read 19.0760, 72.8777 today.",
      "Schedule: 09:00, 11:30, 14:45, 18:10."
    ]
  }
];

export const getDrill = (id: DrillId) => drills.find((drill) => drill.id === id) ?? drills[0];
