// ── Default courses (students always see these) ──
let courses = [
  // ══════════════════════════════════════════════════════
  // COURSE 1: AI Literacy & the Training Ecosystem
  // ══════════════════════════════════════════════════════
  {
    id: 'course-1',
    title: 'Intro to AI Training Platforms',
    level: 'Introductory',
    desc: 'Build your foundational understanding of how AI language models work, how they learn from human feedback, and where you fit into the training pipeline.',
    emoji: '🤖',
    thumb: 't1',
    status: 'live',
    lessons: [
      {
        id: 'l1', title: 'What Is a Language Model?', type: 'video',
        videoUrl: 'https://app.heygen.com/embeds/f19ba0df3bdf45fd85adf81e6af2edb9',
        content: 'A language model is a type of AI that has been trained to understand and generate human language. But it did not learn on its own — it learned from massive amounts of text written by humans, and from human feedback on its outputs. Before you can contribute to AI training, you need to understand what you are actually building. This lesson covers what language models are, how they generate responses, and why they need human input to improve.',
        keyPoints: [
          'Language models predict the most likely next word based on patterns learned from training data',
          'They do not "think" or "understand" — they recognize and reproduce patterns at scale',
          'Human feedback is what makes a model helpful, safe, and accurate — not just statistically likely',
          'Every evaluation you submit teaches the model something about what good looks like'
        ]
      },
      {
        id: 'l1i', title: 'Quick Check: Prediction vs. Judgment', type: 'interactive',
        videoUrl: '', content: '', keyPoints: []
      },
      {
        locked: true,
        id: 'l2', title: 'How AI Models Learn: RLHF Explained', type: 'video',
        videoUrl: '',
        content: 'Reinforcement Learning from Human Feedback (RLHF) is the process that turns a raw language model into a helpful, safe assistant. It works in three stages: supervised fine-tuning on human-written examples, training a reward model on human preference data, and using reinforcement learning to optimize model behavior. As a contributor, you are the human in RLHF. Your ratings and comparisons are the signal the model uses to learn what humans actually want.',
        keyPoints: [
          'RLHF is why ChatGPT, Claude, and similar tools feel helpful rather than just statistically plausible',
          'Stage 1: Models learn from examples of good behavior written by humans',
          'Stage 2: Human raters compare responses — the model learns what people prefer',
          'Stage 3: The model is optimized to produce outputs humans rate highly',
          'Low quality ratings produce a model that has learned the wrong things — your accuracy matters'
        ]
      },
      {
        locked: true,
        id: 'l3', title: 'The AI Training Pipeline: Who Does What', type: 'video',
        videoUrl: '',
        content: 'AI training is not a solo operation. It involves a full pipeline of roles — from AI companies building the models, to data platforms managing the workforce, to contributors doing the evaluation work. Understanding where you sit in this pipeline helps you understand why the work matters and what is expected of you. This lesson maps the full ecosystem so you can see your role clearly.',
        keyPoints: [
          'AI companies (Anthropic, OpenAI, Google) build the models and define training goals',
          'Data platforms (Scale AI, Outlier, Appen) manage contributor pipelines and quality',
          'Contributors (you) rate, rank, write, and evaluate to produce the training signal',
          'Reviewers QA contributor work to maintain data quality at scale',
          'Every layer of this pipeline depends on the one below it — your accuracy is foundational'
        ]
      },
      {
        locked: true,
        id: 'l4', title: 'Types of Contributor Tasks', type: 'video',
        videoUrl: '',
        content: 'Not all contributor tasks are the same. Across platforms you will encounter several distinct task types, each with its own structure and purpose. Understanding the difference before you start is critical — each task type requires a different mental approach. This lesson covers the four most common task types you will see on real platforms: single response rating, comparative preference, response writing, and error classification.',
        keyPoints: [
          'Single Response Rating: Score one AI response against a rubric — the most common task type',
          'Comparative Preference: Given two responses to the same prompt, choose the better one and explain why',
          'Response Writing: Write an ideal response to a given prompt from scratch',
          'Error Classification: Identify what specifically is wrong with a bad response and label the error type',
          'Most platforms rotate task types — being fluent in all four makes you more valuable'
        ]
      },
      {
        locked: true,
        id: 'l5', title: 'What Platforms Expect: Quality, Consistency, and Calibration', type: 'video',
        videoUrl: '',
        content: 'Every major tasking platform measures three things: quality, consistency, and calibration. Quality means your ratings are accurate. Consistency means you apply the same standards every time, not just when you feel like it. Calibration means your judgment aligns with the agreed standard — not your personal opinion. Contributors who score well on all three get more tasks, higher rates, and advance to reviewer roles. This lesson shows you what these metrics look like in practice.',
        keyPoints: [
          'Quality: Are your ratings correct when measured against expert gold-standard responses?',
          'Consistency: Do you rate the same type of response the same way every time?',
          'Calibration: Does your judgment match the rubric standard, not just your personal preference?',
          'Most platforms have hidden test tasks to measure your calibration score in the background',
          'Failing calibration checks is the most common reason contributors lose access to tasks'
        ]
      },
      {
        locked: true,
        id: 'l6', title: 'Knowledge Check', type: 'quiz',
        videoUrl: '', content: '', keyPoints: []
      }
    ],
    quizzes: [
      {
        id: 'q1',
        question: 'What is the primary purpose of RLHF in AI model training?',
        options: [
          'To write the code that powers the AI',
          'To use human feedback to teach the model what good, helpful behavior looks like',
          'To automatically generate training data without human input',
          'To test whether the model can pass standardized benchmarks'
        ],
        correct: 1,
        explanation: 'RLHF — Reinforcement Learning from Human Feedback — is specifically designed to use human preference signals to shape model behavior. Without it, models produce statistically plausible text that may be unhelpful, unsafe, or inaccurate.'
      },
      {
        id: 'q2',
        question: 'A contributor submits ratings quickly without reading the full response to meet a daily task quota. What is the most likely outcome?',
        options: [
          'The model learns faster because more data was submitted',
          'The platform flags them for high output and gives them a bonus',
          'The noisy ratings degrade model quality and risk removing the contributor from the platform',
          'Nothing — volume matters more than accuracy in most platforms'
        ],
        correct: 2,
        explanation: 'Platforms use hidden calibration tasks and inter-rater reliability metrics to detect low-quality contributors. Submitting inaccurate ratings at high volume is worse than submitting fewer accurate ones — it actively harms the model.'
      },
      {
        id: 'q3',
        question: 'Which of the following best describes "calibration" in an AI evaluation context?',
        options: [
          'How quickly a contributor completes tasks',
          'Whether a contributor\'s ratings align with the agreed rubric standard — not personal opinion',
          'The number of tasks a contributor completes per hour',
          'Whether the AI model performs well on public benchmarks'
        ],
        correct: 1,
        explanation: 'Calibration is about alignment with a shared standard. A calibrated contributor rates a 3/5 response as 3/5 because the rubric says so — not because they personally find it acceptable or unacceptable. This consistency is what makes training data reliable.'
      },
      {
        id: 'q4',
        question: 'In the AI training pipeline, what role do data platforms like Scale AI or Outlier play?',
        options: [
          'They build the AI models themselves',
          'They manage the contributor workforce and quality control between AI companies and contributors',
          'They write the training data independently without contributor input',
          'They are responsible only for paying contributors, not for quality'
        ],
        correct: 1,
        explanation: 'Data platforms sit between AI companies and contributors. They manage task distribution, enforce quality standards, run calibration checks, and deliver cleaned datasets back to the AI company. They are the operational layer that makes large-scale human evaluation possible.'
      },
      {
        id: 'q5',
        question: 'What is the difference between a comparative preference task and a single response rating task?',
        options: [
          'Comparative tasks are easier because you only have to choose one option',
          'Single rating tasks score one response against a rubric; comparative tasks choose the better of two responses and explain why',
          'Comparative tasks do not require a written explanation',
          'They are the same task presented in different formats'
        ],
        correct: 1,
        explanation: 'Single response rating tasks ask you to evaluate one response against a rubric with a numeric score. Comparative preference tasks present two responses to the same prompt and ask which is better and why — this data is especially valuable for training reward models in RLHF.'
      }
    ]
  },

  // ══════════════════════════════════════════════════════
  // COURSE 2: Evaluation Fundamentals
  // ══════════════════════════════════════════════════════
  {
    id: 'course-2',
    title: 'Intro to Model Evaluation',
    level: 'Introductory',
    desc: 'Learn how to apply evaluation rubrics accurately, understand the quality dimensions that matter, and develop the consistent judgment that platforms actually pay for.',
    emoji: '📋',
    thumb: 't2',
    status: 'live',
    locked: true,
    lessons: [
      {
        id: 'l1', title: 'What Makes a Response Good? The Four Dimensions', type: 'video',
        videoUrl: '',
        content: 'Every evaluation rubric on every major platform is built around a small set of core quality dimensions. They may be named slightly differently, but they test the same underlying things. Before you can rate responses reliably, you need to internalize these dimensions as distinct lenses — not as one overall impression. This lesson breaks down the four dimensions you will use throughout your evaluation career: Helpfulness, Accuracy, Safety, and Format.',
        keyPoints: [
          'Helpfulness: Did the response actually address what the user asked? Partial answers score lower than complete ones',
          'Accuracy: Is every factual claim in the response verifiable and correct? One wrong fact can fail the whole response',
          'Safety: Does the response avoid harmful, misleading, or inappropriate content? When in doubt, flag it',
          'Format: Is the response structured appropriately for the task — right length, right style, right organization?',
          'Critical rule: Score each dimension independently. A response can be accurate but unhelpful. Always separate them.'
        ]
      },
      {
        id: 'l2', title: 'Reading a Rubric: Anchors, Scales, and Descriptors', type: 'video',
        videoUrl: '',
        content: 'A rubric tells you what each score means. But rubrics are only useful if you know how to read them correctly. Most rubrics use a 1-5 or 1-7 scale with anchor examples — specific response samples that show what a 2 looks like versus a 4. This lesson teaches you how to read a rubric, use anchors to calibrate your judgment, and apply descriptors consistently so your scores mean the same thing every time.',
        keyPoints: [
          'A 5-point scale is meaningless without anchors — always read the examples before starting',
          'Anchors are reference points: a "3" is the midpoint, not a passing grade',
          'Descriptors tell you the criteria; anchors show you a real example of meeting them',
          'When two options seem equally valid, the rubric always wins over your personal preference',
          'If a response falls between two scores, ask: does it meet the higher bar completely? If not, score it lower.'
        ]
      },
      {
        id: 'l3', title: 'Instruction Following: The Most Underrated Dimension', type: 'video',
        videoUrl: '',
        content: 'Instruction following is how precisely the AI response did what the prompt asked. It is the most commonly underscored dimension by new contributors — because it requires reading the prompt carefully and checking every constraint, not just whether the answer seems right. A response that answers the wrong question perfectly still fails. This lesson teaches you how to audit instruction following systematically before looking at anything else.',
        keyPoints: [
          'Always read the full prompt before reading the response — check every constraint and requirement',
          'Explicit constraints: word counts, format requirements, tone specifications, language requests',
          'Implicit constraints: if the user asks for "a quick overview," a 2,000-word essay fails instruction following',
          'Partial instruction following: if 3 of 4 requirements are met, the response does not get full marks',
          'Instruction following failures often cascade — a wrong format makes a response unhelpful even if accurate'
        ]
      },
      {
        id: 'l4', title: 'Writing a Good Rationale', type: 'video',
        videoUrl: '',
        content: 'A rationale is the written explanation for your rating. It is the most valuable part of your submission — and the part most contributors do poorly. A good rationale explains specifically why you gave each score, references the rubric, and identifies what would need to change for a higher score. A bad rationale says "good answer" or "could be better." This lesson teaches you the anatomy of a strong rationale and gives you a framework you can apply to every task.',
        keyPoints: [
          'A rationale should answer three questions: what did the response do well, what did it do poorly, and why?',
          'Always reference the specific dimension you are commenting on — "helpfulness" not "it was good"',
          'Be specific about failures: "the response omitted step 3 of the instructions" not "incomplete"',
          'Length: 2-4 sentences per dimension is the professional standard on most platforms',
          'Your rationale is QA\'d by reviewers — vague rationales flag you as a low-quality contributor'
        ]
      },
      {
        id: 'l5', title: 'Common Mistakes New Evaluators Make', type: 'video',
        videoUrl: '',
        content: 'After training thousands of contributors, the same mistakes show up over and over. Knowing them in advance puts you ahead of 90% of people who start on these platforms. This lesson covers the seven most common evaluation errors — each one a real pattern seen on live tasking platforms — and exactly how to avoid them.',
        keyPoints: [
          'Halo effect: rating a well-written response highly across all dimensions even when it is factually wrong',
          'Leniency bias: giving 4s when the rubric says 3 because you feel bad giving a low score',
          'Primacy bias: judging the whole response by the first paragraph without reading the rest',
          'Over-penalizing style: docking points for tone when the rubric does not ask you to evaluate tone',
          'Conflating dimensions: letting a low accuracy score drag down your helpfulness score',
          'Ignoring the prompt: evaluating how good the response is in general, not how well it addressed this specific prompt',
          'Under-documenting: submitting a score without a rationale that can withstand reviewer scrutiny'
        ]
      },
      {
        id: 'l6', title: 'Calibration in Practice: Matching the Standard', type: 'video',
        videoUrl: '',
        content: 'Calibration is what separates a good contributor from a great one. It means your judgment consistently matches the agreed standard — not just sometimes, and not just for easy cases. This lesson walks you through how calibration sessions work on real platforms, how to use gold-standard examples to anchor your scoring, and what to do when you disagree with the answer key.',
        keyPoints: [
          'Gold standard examples are pre-scored responses that represent the official calibration point',
          'Your job is to match the gold standard, not argue with it — even if you disagree',
          'When you disagree: document your reasoning, but submit the calibrated score',
          'Inter-rater reliability (IRR) is measured across all reviewers — if only you disagree, reconsider',
          'Platforms run hidden calibration checks regularly — treat every task as if it might be scored'
        ]
      },
      {
        id: 'l7', title: 'Knowledge Check', type: 'quiz',
        videoUrl: '', content: '', keyPoints: []
      }
    ],
    quizzes: [
      {
        id: 'q1',
        question: 'A response to "List the top 5 programming languages for beginners" provides an accurate, well-formatted list of 5 languages but never explains why they are good for beginners. How should this be scored on Helpfulness?',
        options: [
          'High — it answered the question by listing 5 languages',
          'High — the format is correct so helpfulness is implied',
          'Lower — the prompt asked for top languages "for beginners" which implies explanation, not just a list',
          'It cannot be scored without knowing the full rubric'
        ],
        correct: 2,
        explanation: 'Helpfulness must be evaluated against the full intent of the prompt. Asking for languages "for beginners" implies the user wants to know why those languages are beginner-friendly — a bare list technically answers the letter of the question but not its spirit. This is a partial helpfulness failure.'
      },
      {
        id: 'q2',
        question: 'You are scoring a response and personally think the writing style is too casual. The rubric does not include tone or style as a dimension. What should you do?',
        options: [
          'Deduct points on Format since style falls under format',
          'Add a note in the rationale but do not deduct points for something outside the rubric',
          'Score it lower on Helpfulness because casual tone is less helpful',
          'Skip the response and flag it for a reviewer to handle'
        ],
        correct: 1,
        explanation: 'You can only score dimensions the rubric asks you to evaluate. If tone is not a dimension, penalizing it introduces noise into the data. You can note it in your rationale for context, but your scores must reflect only what the rubric measures.'
      },
      {
        id: 'q3',
        question: 'What is the most important thing to do before reading an AI response you are about to evaluate?',
        options: [
          'Check how long the response is to calibrate your expectations',
          'Read the full prompt carefully and identify every explicit and implicit constraint',
          'Look at the overall quality of the writing to set a baseline score',
          'Check whether similar prompts have been answered correctly before'
        ],
        correct: 1,
        explanation: 'Instruction following starts with the prompt, not the response. Reading the prompt carefully and cataloguing every requirement — explicit and implicit — before reading the response is what separates calibrated evaluators from those who score on general impression.'
      },
      {
        id: 'q4',
        question: 'A rationale that says "good response, well written" is an example of:',
        options: [
          'Strong documentation that clearly supports the rating given',
          'An acceptable rationale for high-scoring responses',
          'A vague rationale that will flag as low quality during reviewer QA',
          'The standard format used on most platforms'
        ],
        correct: 2,
        explanation: 'Vague rationales like "good response" give reviewers nothing to work with. They cannot verify your reasoning, which means your scores cannot be trusted or used for calibration. A good rationale names the specific dimension, explains the specific evidence, and identifies what would need to change.'
      },
      {
        id: 'q5',
        question: 'During a calibration exercise, your score differs from the gold standard answer key. What is the correct response?',
        options: [
          'Submit your own score — you were asked for your judgment',
          'Average your score with the gold standard to find a middle ground',
          'Review your reasoning against the rubric to understand the disagreement, then submit the calibrated score',
          'Flag the task as having an incorrect answer key'
        ],
        correct: 2,
        explanation: 'Calibration is not about who is right — it is about aligning to a shared standard so that training data is consistent. When you disagree with the answer key, treat it as a learning signal: review the rubric, identify where your reasoning diverged, and submit the calibrated answer. Document your reasoning in the rationale if needed.'
      },
      {
        id: 'q6',
        question: 'Which of the following is an example of the "halo effect" in evaluation?',
        options: [
          'Giving a low score because the first sentence of the response is weak',
          'Rating a response as accurate because it is written in a confident, professional tone',
          'Deducting points for a format issue that the rubric does not cover',
          'Scoring a response higher because you agree with its opinion'
        ],
        correct: 1,
        explanation: 'The halo effect is when one positive quality (like writing style or confidence) causes you to rate other unrelated dimensions higher without evidence. A response written in a professional tone is not automatically accurate — accuracy requires verifying the facts, regardless of how the response sounds.'
      }
    ]
  },

  // ══════════════════════════════════════════════════════
  // COURSE 3: Tasking Fundamentals — Practice & Assessment
  // ══════════════════════════════════════════════════════
  {
    id: 'course-3',
    title: 'Tasking Fundamentals',
    level: 'Introductory',
    desc: 'Apply everything you have learned through real evaluation practice. Work through single response rating, comparative preference, and error classification tasks — the three core task types on live AI training platforms.',
    emoji: '🎯',
    thumb: 't3',
    status: 'live',
    locked: true,
    lessons: [
      {
        id: 'l1', title: 'Task Type 1: Single Response Rating', type: 'video',
        videoUrl: '',
        content: 'Single response rating is the most common task type on every major platform. You are given a prompt and one AI response. Your job is to score it across each rubric dimension, then write a rationale that explains your reasoning. This sounds simple — but it requires you to hold all four dimensions in mind simultaneously, resist halo effects, and document your thinking clearly enough that a reviewer can follow your reasoning. This lesson walks through the complete workflow for a single response rating task from start to finish.',
        keyPoints: [
          'Step 1: Read the full prompt and identify every requirement before touching the response',
          'Step 2: Read the full response without scoring — get the complete picture first',
          'Step 3: Score each dimension independently, starting with Instruction Following',
          'Step 4: Write your rationale — one specific observation per dimension',
          'Step 5: Sanity check — do your scores and rationale tell a consistent story?',
          'Time guidance: spend at least 3-5 minutes per task on real platforms — rushing is the main quality killer'
        ]
      },
      {
        id: 'l2', title: 'Task Type 2: Comparative Preference', type: 'video',
        videoUrl: '',
        content: 'Comparative preference tasks give you two AI responses to the same prompt and ask you to choose the better one and explain why. This data is used to train the reward model in RLHF — it is some of the most valuable data you will ever produce. The challenge is that neither response needs to be perfect. You are making a relative judgment, not an absolute one. This lesson covers how to approach comparisons systematically without falling into the trap of anchoring on the first response you read.',
        keyPoints: [
          'Read both responses fully before making any judgment — first impressions mislead',
          'Compare dimension by dimension: which is more helpful? More accurate? Better formatted?',
          'One response can win even if both have flaws — you are choosing the better option, not the perfect one',
          'If they are genuinely equal across all dimensions, it is valid to say so — but be specific about why',
          'Your rationale must explain the comparison, not just describe what each response did',
          'Watch for length bias: longer responses feel more thorough but are not always better'
        ]
      },
      {
        id: 'l3', title: 'Task Type 3: Error Classification', type: 'video',
        videoUrl: '',
        content: 'Error classification tasks give you a response that has something wrong with it and ask you to identify and label the specific error type. This data trains models to recognize and avoid their own failure modes. It requires precise thinking — not just knowing that something is wrong, but understanding what category of wrong it is. This lesson covers the six most common error categories you will encounter and how to distinguish between them.',
        keyPoints: [
          'Factual Error: The response states something that is verifiably false',
          'Instruction Non-Compliance: The response ignored or misunderstood part of the prompt',
          'Harmful Content: The response contains unsafe, biased, or inappropriate material',
          'Incomplete Response: The response partially addresses the prompt but omits required information',
          'Format Error: The response uses the wrong structure, length, or style for the task',
          'Hallucination: The response presents fabricated information with confidence — especially common with citations, statistics, and named entities',
          'A response can have multiple error types — label all that apply'
        ]
      },
      {
        id: 'l4', title: 'Edge Cases and When to Escalate', type: 'video',
        videoUrl: '',
        content: 'Not every task fits neatly into the rubric. Edge cases are the scenarios that test your judgment — ambiguous prompts, responses that partially comply, content that is borderline but not clearly unsafe. Knowing when to escalate versus when to make a judgment call is one of the most important skills a contributor develops. This lesson covers the escalation decision tree used on most platforms and how to document edge cases clearly.',
        keyPoints: [
          'Escalation triggers: content you believe is genuinely unsafe, prompts with no correct interpretation, rubric gaps that prevent scoring',
          'Do not escalate just because something is difficult — difficulty is expected',
          'When escalating: document exactly what is ambiguous and what you attempted before escalating',
          'Most platforms have a flag or escalation option in the task interface — use it for genuine edge cases only',
          'A pattern of frequent escalation signals poor calibration — reviewers will notice',
          'When in doubt on borderline safety: escalate. When in doubt on scoring: use your best judgment and document it'
        ]
      },
      {
        id: 'l5', title: 'Professional Standards and Platform Expectations', type: 'video',
        videoUrl: '',
        content: 'This final lesson covers what it actually looks like to be a high-performing contributor on a real platform. Not the mechanics — you have those now — but the professional standards: how to manage your calibration score, how to handle disagreements with the rubric, how to build a track record that leads to advancement, and what the difference looks like between a contributor who gets more tasks and one who gets fewer.',
        keyPoints: [
          'Your calibration score is the most important number on any platform — protect it',
          'Consistency matters more than perfection: a 3.8 average with low variance beats a 4.5 with high variance',
          'Advancement to reviewer roles typically requires 90%+ calibration accuracy over 100+ tasks',
          'Platform communication: if guidelines change, re-read them — do not assume last month\'s standard still applies',
          'Time management: sustainable throughput beats daily sprints — burnout kills quality',
          'Your reputation on one platform follows you to others — the AI data industry is smaller than it looks'
        ]
      },
      {
        id: 'l6', title: 'Knowledge Check', type: 'quiz',
        videoUrl: '', content: '', keyPoints: []
      },
      {
        id: 'l7', title: 'Practice Tasks', type: 'practice',
        videoUrl: '',
        content: 'Apply everything you have learned through real evaluation tasks. You will work through single response ratings, comparative preference tasks, and error classification — the three core task types on live platforms. Your evaluations are saved and contribute to real AI training data. Take your time. Quality over speed.',
        keyPoints: [
          'Read the full prompt before reading any response',
          'Score each dimension independently',
          'Your written rationale is the most valuable part of your submission'
        ]
      }
    ],
    quizzes: [
      {
        id: 'q1',
        question: 'You are completing a single response rating task. The response is accurate and well-formatted, but it answers a slightly different question than the one asked. Which dimension fails most clearly?',
        options: [
          'Accuracy — because the answer drifts from the topic',
          'Format — because the structure does not match the prompt',
          'Instruction Following — because the response did not address the actual prompt',
          'Safety — because off-topic responses can mislead users'
        ],
        correct: 2,
        explanation: 'When a response answers the wrong question, the primary failure is Instruction Following — the response did not do what the prompt asked. Accuracy applies to factual correctness, not relevance. This is one of the most common classification errors new contributors make.'
      },
      {
        id: 'q2',
        question: 'In a comparative preference task, Response A is longer, more detailed, and well-structured. Response B is shorter but directly answers the specific question asked. The prompt was "give me a quick answer about X." Which should you prefer?',
        options: [
          'Response A — more detail is always more helpful',
          'Response B — it better follows the instruction to give a quick answer',
          'Response A — better format signals higher quality',
          'They are equal because both contain correct information'
        ],
        correct: 1,
        explanation: 'The prompt explicitly asked for a "quick answer" — that is an instruction. Response B follows this instruction; Response A violates it by providing excessive detail. Instruction compliance is a core dimension. Length bias (assuming longer is better) is one of the most common errors in comparative tasks.'
      },
      {
        id: 'q3',
        question: 'A response cites a statistic: "Studies show that 73% of people prefer X." No source is provided and you cannot verify this number. What error type is this?',
        options: [
          'Format Error — statistics should always include citations',
          'Instruction Non-Compliance — the prompt did not ask for statistics',
          'Hallucination — the model fabricated a specific, unverifiable statistic with confidence',
          'Incomplete Response — because the citation is missing'
        ],
        correct: 2,
        explanation: 'Fabricating specific statistics (percentages, study results, named sources) with no basis in fact is the definition of hallucination. It is one of the most dangerous error types because it appears credible. A missing citation alone is a format issue — an invented statistic is a hallucination.'
      },
      {
        id: 'q4',
        question: 'When should you escalate a task rather than score it yourself?',
        options: [
          'Whenever the task is difficult or time-consuming',
          'Whenever you personally disagree with the rubric standard',
          'When the content is genuinely unsafe, the prompt is truly uninterpretable, or the rubric has a gap that prevents scoring',
          'Whenever you are unsure of your score'
        ],
        correct: 2,
        explanation: 'Escalation is for genuine blockers — safety concerns, uninterpretable prompts, or rubric gaps. Being unsure of your score or finding a task difficult is not an escalation trigger. Frequent unnecessary escalations signal poor calibration and reduce your platform standing.'
      },
      {
        id: 'q5',
        question: 'A response has two problems: it gets one fact wrong, and it is formatted as a list when the prompt asked for a paragraph. How should you handle this?',
        options: [
          'Flag only the most serious error — the factual one',
          'Label both error types — Factual Error and Format Error — since a response can have multiple errors',
          'Average the two errors and apply a single mid-level score',
          'Escalate because multiple errors indicate the rubric cannot cover this response'
        ],
        correct: 1,
        explanation: 'A response can have multiple error types and all should be labeled. Identifying only the most obvious error misses part of the picture and produces incomplete training data. Comprehensive error labeling is what makes your submissions most valuable.'
      }
    ]
  }
];

// ── Demo course (only visible in demo mode) ──
const demoCourse = {
  id: 'course-demo',
  title: 'AI Contributor Training — Sample Module',
  level: 'Introductory',
  desc: 'A sample module demonstrating what structured AI contributor training looks like — covering RLHF, written response evaluation, and rubric design.',
  emoji: '🧪',
  thumb: 'td',
  status: 'live',
  isDemo: true,
  lessons: [
    {
      id: 'ld1',
      title: 'What Is RLHF and Why It Depends on You',
      type: 'video',
      videoUrl: '',
      content: 'Reinforcement Learning from Human Feedback (RLHF) is the process by which large language models learn to produce better, safer, and more helpful responses — using human judgment as the training signal. This lesson explains what that means in practice, and why the quality of contributor work directly determines the quality of the model.',
      keyPoints: [
        'RLHF uses human ratings and comparisons to fine-tune model behavior',
        'Contributors are not just data entry workers — they are the quality signal',
        'A poorly calibrated reviewer produces noisy data that degrades model performance',
        'Structured training is what separates high-performing contributor teams from high-churn ones'
      ]
    },
    {
      id: 'ld2',
      title: 'Evaluating Written Responses: What Good Looks Like',
      type: 'video',
      videoUrl: '',
      content: 'Written response evaluation is one of the most common — and most misunderstood — contributor tasks. This lesson breaks down how to assess a model response across the dimensions that matter: helpfulness, accuracy, clarity, and appropriate tone. We use real example prompts and responses to show how experienced evaluators think through their ratings.',
      keyPoints: [
        'Helpfulness: did the response actually address what was asked?',
        'Accuracy: is every factual claim in the response correct?',
        'Clarity: is the response easy to understand without being over-simplified?',
        'Tone: is the register appropriate for the context — professional, conversational, technical?',
        'A response can pass on three dimensions and fail on one — each is scored independently'
      ]
    },
    {
      id: 'ld3',
      title: 'Knowledge Check',
      type: 'quiz',
      videoUrl: '',
      content: '',
      keyPoints: []
    }
  ],
  quizzes: [
    {
      id: 'qd1',
      question: 'A model response answers the user\'s question accurately, but uses a highly technical tone when the user clearly asked for a simple explanation. How should this be rated?',
      options: [
        'High — it answered the question correctly',
        'High on accuracy, lower on helpfulness and tone — each dimension scored separately',
        'Low across all dimensions — tone errors invalidate the response',
        'It cannot be rated without more information'
      ],
      correct: 1,
      explanation: 'Each evaluation dimension is scored independently. A response can be factually correct but still fail on helpfulness or tone. A good evaluator recognizes this and scores accordingly — not averaging across all dimensions, but assessing each one on its own merits.'
    },
    {
      id: 'qd2',
      question: 'Why does RLHF quality depend so directly on contributor training?',
      options: [
        'Because contributors write the code used to train the model',
        'Because the human ratings contributors produce are the direct signal used to shape model behavior',
        'Because contributors choose which model architecture to use',
        'Because poorly trained contributors slow down the annotation pipeline'
      ],
      correct: 1,
      explanation: 'In RLHF, the model learns from human preference signals — the ratings, comparisons, and evaluations contributors produce. If those signals are inconsistent or poorly calibrated, the model learns from noise. Structured contributor training directly improves model quality at the source.'
    }
  ]
};

// Leaderboard — loaded from Supabase, no fake data
let leaderboard = [];

const allBadges = [
  { id: 'first-lesson', icon: '🎬', name: 'First Lesson', desc: 'Complete your first lesson', xpReq: 0, lessonReq: 1 },
  { id: 'quiz-ace', icon: '✅', name: 'Quiz Ace', desc: 'Answer 3 quiz questions correctly', xpReq: 0, correctReq: 3 },
  { id: 'on-fire', icon: '🔥', name: 'On Fire', desc: 'Reach a 3-day streak', xpReq: 0, streakReq: 3 },
  { id: 'century', icon: '💯', name: 'Century', desc: 'Earn 100 XP', xpReq: 100 },
  { id: 'halfway', icon: '⚡', name: 'Halfway', desc: 'Complete 50% of a course', xpReq: 300 },
  { id: 'scholar', icon: '🏆', name: 'Scholar', desc: 'Earn 500 XP', xpReq: 500 },
  { id: 'course-complete', icon: '🎓', name: 'Graduate', desc: 'Complete a full course', xpReq: 0 },
  { id: 'streak-7', icon: '🌟', name: 'Week Warrior', desc: 'Reach a 7-day streak', xpReq: 0, streakReq: 7 },
];
