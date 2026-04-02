const practiceTasks = [
  // ── SINGLE RESPONSE RATING TASKS (1-4) ──
  {
    id: 'task-1',
    type: 'rating',
    taskLabel: 'Single Response Rating',
    prompt: 'Explain what machine learning is to a complete beginner with no technical background. Keep it simple and under 100 words.',
    response: 'Machine learning is a way of teaching computers to recognize patterns. Instead of programming every rule manually, you show the computer thousands of examples and it figures out the patterns on its own. For instance, if you show it 10,000 pictures of cats labeled "cat" and 10,000 pictures of dogs labeled "dog," it learns to tell them apart. The more examples it sees, the better it gets. This is how your email spam filter, Netflix recommendations, and voice assistants work.',
    difficulty: 'Introductory',
    notes: 'Consider: Did it stay under 100 words? Is it genuinely beginner-friendly? Does it use a concrete example?'
  },
  {
    id: 'task-2',
    type: 'rating',
    taskLabel: 'Single Response Rating',
    prompt: 'What are three practical steps I can take today to improve my cybersecurity?',
    response: 'Cybersecurity is a complex field that encompasses many domains including network security, application security, and endpoint protection. Organizations typically deploy multi-layered defense strategies including firewalls, intrusion detection systems, and security information and event management platforms. The NIST Cybersecurity Framework provides a structured approach. You should also consider zero-trust architecture principles.',
    difficulty: 'Introductory',
    notes: 'The prompt asked for 3 practical steps for an individual today. Evaluate how well the response addressed that specific request.'
  },
  {
    id: 'task-3',
    type: 'rating',
    taskLabel: 'Single Response Rating',
    prompt: 'Write a two-sentence summary of how the internet works.',
    response: 'The internet is a global network of computers that communicate by breaking information into small packets, sending them along the fastest available routes, and reassembling them at the destination. These packets travel through physical cables and wireless signals, guided by routers that read addressing information to direct each packet toward its intended recipient.',
    difficulty: 'Introductory',
    notes: 'Check: is it exactly two sentences? Is it accurate? Is it at the right level for a general audience?'
  },
  {
    id: 'task-4',
    type: 'rating',
    taskLabel: 'Single Response Rating',
    prompt: 'Give me a step-by-step recipe for scrambled eggs.',
    response: 'Scrambled eggs are a classic breakfast dish enjoyed worldwide. They are made from eggs, which are a nutritious food containing protein and essential vitamins. Many professional chefs have their own techniques for making scrambled eggs, and the dish varies by culture. Gordon Ramsay is known for his distinctive scrambled egg method. Eggs can also be prepared in many other ways including fried, poached, and boiled.',
    difficulty: 'Introductory',
    notes: 'The prompt asked for a step-by-step recipe. Evaluate whether this response delivered what was asked.'
  },
  // ── COMPARATIVE PREFERENCE TASKS (5-6) ──
  {
    id: 'task-5',
    type: 'comparison',
    taskLabel: 'Comparative Preference',
    prompt: 'Explain what a black hole is to a 10-year-old.',
    responseA: 'A black hole is a region of spacetime where gravity is so strong that nothing — not even light or other electromagnetic waves — has enough speed to escape its event horizon. They form when massive stars collapse under their own gravity at the end of their life cycle. The singularity at the center represents a point of infinite density where the laws of physics as we understand them break down.',
    responseB: 'Imagine a star is like a giant fire in space. When it runs out of fuel, it can collapse and squish down into a tiny point. That tiny point has such strong gravity — like a super-powered magnet — that it pulls everything toward it, even light. Since light can\'t escape, we can\'t see it, which is why we call it a black hole. It\'s like a cosmic vacuum cleaner that nothing can escape from.',
    difficulty: 'Introductory',
    notes: 'The prompt specifies a 10-year-old audience. Both responses may be accurate — the question is which better serves that specific audience.'
  },
  {
    id: 'task-6',
    type: 'comparison',
    taskLabel: 'Comparative Preference',
    prompt: 'What should I do if I think I am having a heart attack?',
    responseA: 'If you think you are having a heart attack, call 911 immediately — do not drive yourself. While waiting for help: sit or lie down in a comfortable position, loosen any tight clothing, and if you are not allergic to aspirin and have it available, chew one regular aspirin (325mg) or four low-dose aspirins. Do not eat or drink anything else. Unlock your front door if possible so paramedics can get in. Stay on the phone with the dispatcher.',
    responseB: 'Heart attacks are serious medical events caused by a blockage in coronary arteries. Symptoms include chest pain, shortness of breath, and pain radiating to the arm or jaw. The medical term is myocardial infarction. Treatment options include thrombolytics, angioplasty, and in severe cases, coronary artery bypass grafting. Long-term management typically involves statins, antiplatelet therapy, and lifestyle modifications.',
    difficulty: 'Intermediate',
    notes: 'This is a safety-critical prompt. Consider: which response would actually help someone in a medical emergency?'
  },
  // ── ERROR CLASSIFICATION TASKS (7-8) ──
  {
    id: 'task-7',
    type: 'error',
    taskLabel: 'Error Classification',
    prompt: 'Who was the first person to walk on the moon, and when did it happen?',
    response: 'Neil Armstrong became the first person to walk on the moon on July 20, 1969, during the Apollo 11 mission. He was accompanied by fellow astronaut Buzz Aldrin, while Michael Collins orbited above in the command module. Armstrong\'s famous words upon stepping onto the lunar surface were: "One small step for man, one giant leap for mankind." The mission was a historic achievement for NASA and marked the culmination of the Space Race. The second moon landing occurred in December 1969.',
    errorTypes: ['Factual Error', 'Hallucination', 'Instruction Non-Compliance', 'Format Error', 'Incomplete Response', 'No Error'],
    difficulty: 'Intermediate',
    notes: 'Read carefully. Most of the response is accurate — but there is at least one factual error. Identify it specifically.'
  },
  {
    id: 'task-8',
    type: 'error',
    taskLabel: 'Error Classification',
    prompt: 'Write a haiku about autumn.',
    response: 'Autumn is a beautiful season characterized by the changing of leaves from green to vibrant shades of red, orange, and yellow. The crisp air carries the scent of fallen leaves, and there is a sense of transition as nature prepares for winter. Many people enjoy autumn activities like apple picking, pumpkin carving, and hiking through forests ablaze with color. It is truly one of the most visually spectacular times of year.',
    errorTypes: ['Factual Error', 'Hallucination', 'Instruction Non-Compliance', 'Format Error', 'Incomplete Response', 'No Error'],
    difficulty: 'Introductory',
    notes: 'A haiku has a very specific format. Evaluate whether the response followed the instructions.'
  }
];
