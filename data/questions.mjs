// data/questions.mjs - Hierarchical Engineering Taxonomy & Rich Seed Question Bank

export const departments = [
  {
    id: 'EE',
    name: 'Electrical Engineering',
    subjects: [
      {
        id: 'EE-FUND',
        name: 'Electrical Fundamentals',
        categories: [
          {
            id: 'voltage-current',
            name: 'Voltage, Current & Resistance',
            topics: ['Voltage', 'Current', 'Resistance', 'Ohm’s law', 'Power & Energy']
          },
          {
            id: 'ac-circuits',
            name: 'AC Fundamentals & Power Factor',
            topics: ['Single Phase AC', 'Three Phase Systems', 'Power Factor Correction', 'Impedance & Phasors']
          }
        ]
      },
      {
        id: 'EE-MACH',
        name: 'Electrical Machines & Drives',
        categories: [
          {
            id: 'motors',
            name: 'Electric Motors & Starters',
            topics: ['Three-Phase Induction Motor', 'Synchronous Motor', 'Motor Starters (DOL & Star-Delta)', 'Variable Frequency Drives (VFD)']
          }
        ]
      },
      {
        id: 'EE-SAFETY',
        name: 'Electrical Safety & Protection',
        categories: [
          {
            id: 'safety-standards',
            name: 'Safety Devices & Earth Leakage',
            topics: ['Earthing & Grounding', 'RCD / ELCB Protection', 'Circuit Breakers & Fuses', 'Lockout / Tagout (LOTO)']
          }
        ]
      }
    ]
  },
  {
    id: 'ELEV',
    name: 'Escalator & Elevator Engineering',
    subjects: [
      {
        id: 'ELEV-ESC-ELEC',
        name: 'Escalator Electrical & Safety Systems',
        categories: [
          {
            id: 'esc-safety-circuits',
            name: 'Safety Circuits & Interlocks',
            topics: ['Escalator Safety Switch Series', 'Emergency Stop & Overspeed', 'Comb Plate & Skirt Safety', 'Step Chain & Missing Step Detection', 'Brake Monitoring & Auxiliary Brake']
          },
          {
            id: 'esc-control',
            name: 'Drive & Control Panels',
            topics: ['Escalator Main Controller & PLC', 'VFD Speed Control & Energy Saving', 'Direction & Reversal Safety', 'Handrail Speed Monitoring']
          },
          {
            id: 'esc-maint-standards',
            name: 'Maintenance & Standards (EN 115 / ASME A17.1)',
            topics: ['EN 115 Safety Requirements', 'ASME A17.1 Escalator Rules', 'Electrical Troubleshooting & Fault Finding', 'Preventive Maintenance & Inspection']
          }
        ]
      }
    ]
  },
  {
    id: 'AUTO',
    name: 'Industrial Automation & Control Systems',
    subjects: [
      {
        id: 'AUTO-PLC',
        name: 'PLC & Control Logic',
        categories: [
          {
            id: 'plc-fundamentals',
            name: 'PLC Architecture & Ladder Logic',
            topics: ['PLC I/O Modules & Wiring', 'Ladder Logic & Relay Logic', 'Sensors & Transducers', 'Relays & Contactors']
          }
        ]
      }
    ]
  }
];

export const questions = [
  // 1. Multiple Choice (Electrical Fundamentals)
  {
    id: 'voltage-unit',
    questionId: 'voltage-unit',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Electrical Fundamentals',
    department: 'Electrical Engineering',
    category: 'Voltage, Current & Resistance',
    topic: 'Voltage',
    concept: 'Voltage',
    type: 'multiple_choice',
    questionType: 'multiple_choice',
    difficulty: 'Beginner',
    difficultyScore: 15,
    bloomLevel: 'Remember',
    prompt: 'What is the SI unit of voltage (electrical potential difference)?',
    options: ['Ohm', 'Ampere', 'Volt', 'Watt'],
    correctAnswer: 'Volt',
    answer: 'Volt',
    explanation: 'Voltage is electrical potential difference or electromotive force, measured in volts (V), named after Alessandro Volta.',
    hints: ['It is named after Alessandro Volta.', 'Its symbol is V.'],
    whyThisQuestion: 'Voltage is the fundamental driving force in electrical systems.',
    realWorldApplication: 'Measuring mains socket output or battery terminal potential across equipment.',
    next: 'current-meaning',
    branch: 'Fundamentals'
  },

  // 2. True / False
  {
    id: 'current-meaning',
    questionId: 'current-meaning',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Electrical Fundamentals',
    department: 'Electrical Engineering',
    category: 'Voltage, Current & Resistance',
    topic: 'Current',
    concept: 'Current',
    type: 'true_false',
    questionType: 'true_false',
    difficulty: 'Beginner',
    difficultyScore: 20,
    bloomLevel: 'Remember',
    prompt: 'Electric current represents the flow rate of electric charge and its SI unit is the ampere.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    answer: 'True',
    explanation: 'Current (I) is defined as charge per unit time (I = Q / t) and is measured in amperes (A).',
    hints: ['Think about the letter A marked on a multimeter dial.'],
    whyThisQuestion: 'Understanding current is essential for cable sizing and overload protection.',
    next: 'ohms-law',
    branch: 'Fundamentals'
  },

  // 3. Numerical Calculation (Ohm's Law)
  {
    id: 'ohms-law',
    questionId: 'ohms-law',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Electrical Fundamentals',
    department: 'Electrical Engineering',
    category: 'Voltage, Current & Resistance',
    topic: 'Ohm’s law',
    concept: 'Ohm’s law',
    type: 'numerical',
    questionType: 'numerical',
    difficulty: 'Elementary',
    difficultyScore: 35,
    bloomLevel: 'Apply',
    prompt: 'A circuit has 12 V DC supplied across a 4 Ω resistor. Calculate the circuit current in Amperes.',
    correctAnswer: 3,
    answer: 3,
    unit: 'A',
    tolerance: 0.02,
    explanation: 'Using Ohm’s law I = V / R: I = 12 V / 4 Ω = 3 A.',
    hints: ['Use the formula I = V / R.', 'Divide potential by resistance.'],
    formula: 'I = V / R',
    solutionSteps: ['Identify V = 12 V, R = 4 Ω', 'Apply I = V / R', 'I = 12 / 4 = 3 A'],
    whyThisQuestion: 'Ohm’s law connects the three core physical quantities in direct current and resistive AC circuits.',
    next: 'ohms-law-var1',
    branch: 'Relationships'
  },

  // 4. Variant of Ohm's Law (Parent-Child Variant Q001)
  {
    id: 'ohms-law-var1',
    questionId: 'ohms-law-var1',
    parentQuestionId: 'ohms-law',
    questionVersion: 1,
    subject: 'Electrical Fundamentals',
    department: 'Electrical Engineering',
    category: 'Voltage, Current & Resistance',
    topic: 'Ohm’s law',
    concept: 'Ohm’s law',
    type: 'numerical',
    questionType: 'numerical',
    difficulty: 'Elementary',
    difficultyScore: 40,
    bloomLevel: 'Apply',
    prompt: 'A solenoid coil with a resistance of 48 Ω is connected to a 24 V DC supply. What current flows through the coil in Amperes?',
    correctAnswer: 0.5,
    answer: 0.5,
    unit: 'A',
    tolerance: 0.02,
    explanation: 'Using I = V / R: I = 24 V / 48 Ω = 0.5 A.',
    hints: ['Apply I = V / R with V = 24 and R = 48.'],
    formula: 'I = V / R',
    whyThisQuestion: 'Engineers compute DC coil current to verify contactor and relay driver ratings.',
    next: 'resistance-unit',
    branch: 'Relationships'
  },

  // 5. Fill in the Blank
  {
    id: 'resistance-unit',
    questionId: 'resistance-unit',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Electrical Fundamentals',
    department: 'Electrical Engineering',
    category: 'Voltage, Current & Resistance',
    topic: 'Resistance',
    concept: 'Resistance',
    type: 'fill_blank',
    questionType: 'fill_blank',
    difficulty: 'Beginner',
    difficultyScore: 25,
    bloomLevel: 'Remember',
    prompt: 'The SI unit of electrical resistance opposing charge flow is the ______.',
    correctAnswer: ['ohm', 'ohms', 'Ω'],
    answer: ['ohm', 'ohms', 'Ω'],
    explanation: 'Resistance opposes electric current flow and is measured in ohms (symbol Ω).',
    hints: ['Named after Georg Simon Ohm.'],
    whyThisQuestion: 'Resistance governs current flow for a given potential difference.',
    next: 'multiple-correct-protection',
    branch: 'Fundamentals'
  },

  // 6. Multiple Correct Answers
  {
    id: 'multiple-correct-protection',
    questionId: 'multiple-correct-protection',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Electrical Safety & Protection',
    department: 'Electrical Engineering',
    category: 'Safety Devices & Earth Leakage',
    topic: 'Circuit Breakers & Fuses',
    concept: 'Circuit Breakers & Fuses',
    type: 'multiple_correct',
    questionType: 'multiple_correct',
    difficulty: 'Intermediate',
    difficultyScore: 55,
    bloomLevel: 'Analyze',
    prompt: 'Which of the following devices provide automatic overcurrent or short-circuit protection in low-voltage electrical panels? (Select ALL that apply)',
    options: ['Miniature Circuit Breaker (MCB)', 'Rewirable HRC Fuse', 'Step-down Transformer', 'Voltmeter'],
    correctAnswer: ['Miniature Circuit Breaker (MCB)', 'Rewirable HRC Fuse'],
    answer: ['Miniature Circuit Breaker (MCB)', 'Rewirable HRC Fuse'],
    explanation: 'MCBs and HRC fuses automatically interrupt current during overload or short-circuit conditions. Transformers change voltage levels and voltmeters measure potential without protecting the line.',
    hints: ['Select components designed to trip or blow during excessive current flow.'],
    whyThisQuestion: 'Identifying overcurrent protection elements is essential for electrical safety panel design.',
    next: 'ordering-maint-safety',
    branch: 'Safety'
  },

  // 7. Ordering Process (Safety Procedures)
  {
    id: 'ordering-maint-safety',
    questionId: 'ordering-maint-safety',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Electrical Safety & Protection',
    department: 'Electrical Engineering',
    category: 'Safety Devices & Earth Leakage',
    topic: 'Lockout / Tagout (LOTO)',
    concept: 'Lockout / Tagout (LOTO)',
    type: 'ordering',
    questionType: 'ordering',
    difficulty: 'Intermediate',
    difficultyScore: 60,
    bloomLevel: 'Apply',
    prompt: 'Arrange the standard Lockout / Tagout (LOTO) electrical isolation steps in correct chronological order.',
    items: ['Verify zero voltage state with a calibrated meter', 'Apply padlock and tag to circuit isolator', 'Notify affected personnel and switch off electrical supply'],
    correctAnswer: ['Notify affected personnel and switch off electrical supply', 'Apply padlock and tag to circuit isolator', 'Verify zero voltage state with a calibrated meter'],
    answer: ['Notify affected personnel and switch off electrical supply', 'Apply padlock and tag to circuit isolator', 'Verify zero voltage state with a calibrated meter'],
    explanation: 'First notify personnel and turn off the supply, physically lock/tag out the isolator switch, and finally prove zero energy state before starting physical work.',
    hints: ['Isolation occurs before locking out, and testing zero voltage is the final mandatory verification step.'],
    whyThisQuestion: 'LOTO procedures prevent accidental electrical energization during maintenance.',
    next: 'matching-units',
    branch: 'Safety'
  },

  // 8. Matching Quantities
  {
    id: 'matching-units',
    questionId: 'matching-units',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Electrical Fundamentals',
    department: 'Electrical Engineering',
    category: 'Voltage, Current & Resistance',
    topic: 'Power & Energy',
    concept: 'Power & Energy',
    type: 'matching',
    questionType: 'matching',
    difficulty: 'Elementary',
    difficultyScore: 30,
    bloomLevel: 'Understand',
    prompt: 'Match each electrical quantity to its corresponding SI unit.',
    pairs: { Voltage: 'Volt', Current: 'Ampere', Power: 'Watt', Frequency: 'Hertz' },
    correctAnswer: { Voltage: 'Volt', Current: 'Ampere', Power: 'Watt', Frequency: 'Hertz' },
    answer: { Voltage: 'Volt', Current: 'Ampere', Power: 'Watt', Frequency: 'Hertz' },
    explanation: 'Voltage is measured in volts, current in amperes, active power in watts, and frequency in hertz.',
    hints: ['Recall standard unit symbols V, A, W, Hz.'],
    whyThisQuestion: 'Standard electrical units form the language of technical engineering calculations.',
    next: 'classification-motors',
    branch: 'Practice'
  },

  // 9. Classification Question
  {
    id: 'classification-motors',
    questionId: 'classification-motors',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Electrical Machines & Drives',
    department: 'Electrical Engineering',
    category: 'Electric Motors & Starters',
    topic: 'Three-Phase Induction Motor',
    concept: 'Three-Phase Induction Motor',
    type: 'classification',
    questionType: 'classification',
    difficulty: 'Intermediate',
    difficultyScore: 50,
    bloomLevel: 'Analyze',
    prompt: 'Classify each motor starter technique into either "Reduced Voltage Starting" or "Full Voltage Direct Starting".',
    categories: {
      'Star-Delta Starter': 'Reduced Voltage Starting',
      'Direct-On-Line (DOL) Starter': 'Full Voltage Direct Starting',
      'Autotransformer Starter': 'Reduced Voltage Starting'
    },
    correctAnswer: {
      'Star-Delta Starter': 'Reduced Voltage Starting',
      'Direct-On-Line (DOL) Starter': 'Full Voltage Direct Starting',
      'Autotransformer Starter': 'Reduced Voltage Starting'
    },
    answer: {
      'Star-Delta Starter': 'Reduced Voltage Starting',
      'Direct-On-Line (DOL) Starter': 'Full Voltage Direct Starting',
      'Autotransformer Starter': 'Reduced Voltage Starting'
    },
    explanation: 'Star-Delta and Autotransformer starters reduce line voltage during motor startup to limit inrush current, whereas DOL applies full line voltage immediately.',
    hints: ['DOL applies full voltage at startup; Star-Delta reduces phase voltage by 1/√3.'],
    whyThisQuestion: 'Limiting motor inrush current protects power quality and transformer windings.',
    next: 'esc-safety-switch-series',
    branch: 'Machines'
  },

  // 10. Escalator Safety Switch Series (EN 115 / ASME A17.1)
  {
    id: 'esc-safety-switch-series',
    questionId: 'esc-safety-switch-series',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Escalator Electrical & Safety Systems',
    department: 'Escalator & Elevator Engineering',
    category: 'Safety Circuits & Interlocks',
    topic: 'Escalator Safety Switch Series',
    concept: 'Escalator Safety Switch Series',
    type: 'multiple_choice',
    questionType: 'multiple_choice',
    difficulty: 'Advanced',
    difficultyScore: 75,
    bloomLevel: 'Analyze',
    prompt: 'Under EN 115 and ASME A17.1 escalator safety standards, how are safety contacts (such as comb plate switches, broken drive chain contacts, and emergency stop buttons) electrically connected in the main safety circuit?',
    options: [
      'In series with forced open safety contacts (fail-safe closed loop)',
      'In parallel across the main contactor coil',
      'Via individual bypass switches during normal operation',
      'In parallel with the main VFD enable input'
    ],
    correctAnswer: 'In series with forced open safety contacts (fail-safe closed loop)',
    answer: 'In series with forced open safety contacts (fail-safe closed loop)',
    explanation: 'Escalator safety switch chains are wired in series using positive break / forced opening contacts. If any safety device opens or a wire breaks, the safety circuit opens, immediately disconnecting power to the motor and dropping the operational brake.',
    hints: ['Think fail-safe logic: what happens if a wire breaks or a switch trips?'],
    whyThisQuestion: 'The safety switch series is the single most critical electrical protection circuit on an escalator.',
    realWorldApplication: 'Troubleshooting escalator trips by testing loop continuity across terminal blocks.',
    reference: 'EN 115-1 Clause 5.11 / ASME A17.1 Section 6.1',
    next: 'esc-comb-plate-fault',
    branch: 'Escalator Safety'
  },

  // 11. Escalator Troubleshooting & Fault Finding (Advanced Scenario)
  {
    id: 'esc-comb-plate-fault',
    questionId: 'esc-comb-plate-fault',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Escalator Electrical & Safety Systems',
    department: 'Escalator & Elevator Engineering',
    category: 'Safety Circuits & Interlocks',
    topic: 'Comb Plate & Skirt Safety',
    concept: 'Comb Plate & Skirt Safety',
    type: 'troubleshooting',
    questionType: 'troubleshooting',
    difficulty: 'Advanced',
    difficultyScore: 85,
    bloomLevel: 'Evaluate',
    prompt: 'Scenario: An escalator trips immediately when a heavy passenger enters the upper landing comb plate. The controller indicates safety switch circuit trip code E-04. Upon inspection, the comb plate microswitch is mechanically intact. What is the most probable root cause and immediate maintenance check required under EN 115?',
    correctAnswer: 'Foreign object jammed in comb teeth pushing comb plate against spring tension, tripping comb microswitch',
    keyConcepts: ['jammed', 'foreign object', 'comb teeth', 'spring tension', 'microswitch trip'],
    explanation: 'A foreign object (such as a screw, pebble, or footwear piece) trapped between step cleats and comb teeth forces the floating comb plate backward against its calibrated return springs, opening the microswitch to prevent step collision.',
    hints: [
      'Focus on mechanical force applied to the floating comb plate.',
      'What gets trapped between step cleats and comb fingers?'
    ],
    whyThisQuestion: 'Comb plate safety switches protect passengers and equipment from step collision and trapping.',
    realWorldApplication: 'Escalator emergency maintenance response at transit terminals and shopping malls.',
    reference: 'EN 115-1 Section 5.3.4',
    next: 'plc-ladder-logic',
    branch: 'Escalator Maintenance'
  },

  // 12. Industrial Automation / PLC Question
  {
    id: 'plc-ladder-logic',
    questionId: 'plc-ladder-logic',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'PLC & Control Logic',
    department: 'Industrial Automation & Control Systems',
    category: 'PLC Architecture & Ladder Logic',
    topic: 'Ladder Logic & Relay Logic',
    concept: 'Ladder Logic & Relay Logic',
    type: 'short_answer',
    questionType: 'short_answer',
    difficulty: 'Intermediate',
    difficultyScore: 65,
    bloomLevel: 'Understand',
    prompt: 'In PLC ladder logic programming, explain the function of a "Normally Closed" (NC) contact placed in series with a motor start contact.',
    correctAnswer: 'The NC contact acts as a stop or interlock condition, interrupting coil energization when actuated.',
    keyConcepts: ['stop', 'interlock', 'interrupts', 'opens'],
    explanation: 'A Normally Closed (NC) contact passes logical TRUE when unactuated. When activated (e.g. Stop push button pressed or overload contact tripped), it turns FALSE, opening the rung and de-energizing the output coil.',
    hints: ['Think about what happens to current/signal when an NC switch is pressed.'],
    whyThisQuestion: 'NC contacts provide fundamental stop and safety interlock behavior in ladder logic.',
    next: 'power-factor-calculation',
    branch: 'Automation'
  },

  // 13. Calculation Problem (Power Factor)
  {
    id: 'power-factor-calculation',
    questionId: 'power-factor-calculation',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Electrical Fundamentals',
    department: 'Electrical Engineering',
    category: 'AC Fundamentals & Power Factor',
    topic: 'Power Factor Correction',
    concept: 'Power Factor Correction',
    type: 'calculation',
    questionType: 'calculation',
    difficulty: 'Advanced',
    difficultyScore: 80,
    bloomLevel: 'Apply',
    prompt: 'A 3-phase, 400 V motor load absorbs 40 kW of active power (P) with an apparent power (S) of 50 kVA. Calculate the operating power factor (cos φ).',
    correctAnswer: 0.8,
    answer: 0.8,
    unit: '',
    tolerance: 0.01,
    explanation: 'Power Factor = Active Power (P) / Apparent Power (S) = 40 kW / 50 kVA = 0.80 lagging.',
    hints: ['Power factor formula: PF = P / S.', 'Divide active power in kW by apparent power in kVA.'],
    formula: 'PF = P / S',
    solutionSteps: ['Given P = 40 kW, S = 50 kVA', 'PF = 40 / 50 = 0.8'],
    whyThisQuestion: 'Low power factor increases distribution line current and triggers utility penalty surcharges.',
    next: 'vfd-energy-saving',
    branch: 'Applications'
  },

  // 14. VFD Speed Control & Energy Saving
  {
    id: 'vfd-energy-saving',
    questionId: 'vfd-energy-saving',
    parentQuestionId: null,
    questionVersion: 1,
    subject: 'Escalator Electrical & Safety Systems',
    department: 'Escalator & Elevator Engineering',
    category: 'Drive & Control Panels',
    topic: 'VFD Speed Control & Energy Saving',
    concept: 'VFD Speed Control & Energy Saving',
    type: 'scenario',
    questionType: 'scenario',
    difficulty: 'Advanced',
    difficultyScore: 78,
    bloomLevel: 'Analyze',
    prompt: 'When an escalator operates under VFD control in dual-speed energy saving mode (idle crawl speed when no passengers are detected), explain how speed reduction affects electrical power consumption according to fan and pump affinity laws / motor load dynamics.',
    correctAnswer: 'Power consumption decreases significantly because motor mechanical power demand drops proportionally with reduced speed and torque requirements during un-loaded idling.',
    keyConcepts: ['power decreases', 'reduced speed', 'unloaded', 'energy saving'],
    explanation: 'During idle operation, reducing speed from 0.5 m/s to 0.2 m/s reduces mechanical friction losses and motor current draw, yielding up to 30–50% overall energy savings in low-traffic periods.',
    hints: ['Consider what happens to motor current when speed and load are lowered.'],
    whyThisQuestion: 'Modern commercial escalators utilize smart VFD standby modes for green building compliance.',
    next: 'voltage-unit',
    branch: 'Escalator Control'
  }
];

export function publicQuestion(question) {
  const { answer, correctAnswer, keyConcepts, tolerance, ...safe } = question;
  return safe;
}

export const concepts = [
  { id: 'Voltage', parent: 'Electricity', branch: 'Fundamentals', department: 'Electrical Engineering' },
  { id: 'Current', parent: 'Electricity', branch: 'Fundamentals', department: 'Electrical Engineering' },
  { id: 'Resistance', parent: 'Electricity', branch: 'Fundamentals', department: 'Electrical Engineering' },
  { id: 'Ohm’s law', parent: 'Electricity', branch: 'Relationships', department: 'Electrical Engineering' },
  { id: 'Circuit Breakers & Fuses', parent: 'Electricity', branch: 'Safety', department: 'Electrical Engineering' },
  { id: 'Lockout / Tagout (LOTO)', parent: 'Electricity', branch: 'Safety', department: 'Electrical Engineering' },
  { id: 'Three-Phase Induction Motor', parent: 'Electricity', branch: 'Machines', department: 'Electrical Engineering' },
  { id: 'Escalator Safety Switch Series', parent: 'Escalator Electrical Systems', branch: 'Escalator Safety', department: 'Escalator & Elevator Engineering' },
  { id: 'Comb Plate & Skirt Safety', parent: 'Escalator Electrical Systems', branch: 'Escalator Maintenance', department: 'Escalator & Elevator Engineering' },
  { id: 'Ladder Logic & Relay Logic', parent: 'Automation', branch: 'Automation', department: 'Industrial Automation & Control Systems' },
  { id: 'Power Factor Correction', parent: 'Electricity', branch: 'Applications', department: 'Electrical Engineering' },
  { id: 'VFD Speed Control & Energy Saving', parent: 'Escalator Electrical Systems', branch: 'Escalator Control', department: 'Escalator & Elevator Engineering' }
];
