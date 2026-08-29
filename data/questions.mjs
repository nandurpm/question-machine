/*
 * ============================================================
 * FILE: questions.mjs
 * PURPOSE: Defines the curated question records and evaluation metadata served by Question Machine.
 * ============================================================
 */

export const questions = [
  { id: 'voltage-unit', concept: 'Voltage', branch: 'Fundamentals', type: 'multiple_choice', difficulty: 1, prompt: 'What is the SI unit of voltage?', options: ['Ohm', 'Ampere', 'Volt', 'Watt'], answer: 'Volt', explanation: 'Voltage is electrical potential difference and is measured in volts (V).', hints: ['It is named after Alessandro Volta.', 'Its symbol is V.'], next: 'current-meaning' },
  { id: 'current-meaning', concept: 'Current', branch: 'Fundamentals', type: 'true_false', difficulty: 1, prompt: 'Electric current is measured in amperes.', answer: 'True', explanation: 'Current is the rate of flow of electric charge; its SI unit is the ampere (A).', hints: ['Think about the unit marked A on a multimeter.'], next: 'ohms-law' },
  { id: 'ohms-law', concept: 'Ohm’s law', branch: 'Relationships', type: 'numerical', difficulty: 2, prompt: 'A circuit has 12 V across a 4 Ω resistor. Find the current.', answer: 3, unit: 'A', tolerance: 0.02, explanation: 'Use I = V / R. Therefore I = 12 / 4 = 3 A.', hints: ['Use the relationship between voltage, current, and resistance.', 'Divide voltage by resistance.'], next: 'resistance-unit' },
  { id: 'resistance-unit', concept: 'Resistance', branch: 'Fundamentals', type: 'fill_blank', difficulty: 2, prompt: 'The SI unit of resistance is ______.', answer: ['ohm', 'ohms', 'Ω'], explanation: 'Resistance is measured in ohms, written with the symbol Ω.', hints: ['It is named after Georg Ohm.'], next: 'diode-explain' },
  { id: 'diode-explain', concept: 'Diode', branch: 'Components', type: 'short_answer', difficulty: 3, prompt: 'What is a diode, and what is its main electrical function?', answer: 'A diode is a semiconductor component that allows current to flow mainly in one direction.', keyConcepts: ['semiconductor', 'one direction', 'current'], explanation: 'A diode is a semiconductor device designed to conduct primarily in one direction and block reverse current in normal use.', hints: ['Name the material family first.', 'Then describe the direction of current flow.'], next: 'measurement-order' },
  { id: 'measurement-order', concept: 'Measurement process', branch: 'Practice', type: 'ordering', difficulty: 3, prompt: 'Arrange a safe basic resistance-measurement process.', items: ['Connect the meter probes to the component', 'Turn off and isolate the circuit', 'Set the meter to resistance mode'], answer: ['Turn off and isolate the circuit', 'Set the meter to resistance mode', 'Connect the meter probes to the component'], explanation: 'Isolate power first, select the correct resistance range or mode, and then make the measurement.', hints: ['Never measure resistance on an energized circuit.'], next: 'matching-units' },
  { id: 'matching-units', concept: 'Electrical quantities', branch: 'Practice', type: 'matching', difficulty: 3, prompt: 'Match each electrical quantity to its SI unit.', pairs: { Voltage: 'Volt', Current: 'Ampere', Power: 'Watt' }, answer: { Voltage: 'Volt', Current: 'Ampere', Power: 'Watt' }, explanation: 'Voltage is measured in volts, current in amperes, and power in watts.', hints: ['Use the first letters V, A, and W as a memory aid.'], next: 'power-scenario' },
  { id: 'power-scenario', concept: 'Power', branch: 'Applications', type: 'scenario', difficulty: 4, prompt: 'A fixed-voltage circuit has its resistance doubled. What happens to current, and why?', answer: 'Current halves because by Ohm’s law current is inversely proportional to resistance when voltage is constant.', keyConcepts: ['current halves', 'inversely', 'resistance', 'voltage constant'], explanation: 'With constant voltage, I = V/R. Doubling R makes I half of its original value.', hints: ['Write I = V/R.', 'What changes when the denominator doubles?'], next: 'voltage-unit' }
];

export function publicQuestion(question) {
  const { answer, keyConcepts, tolerance, ...safe } = question;
  return safe;
}

export const concepts = [
  { id: 'Voltage', parent: 'Electricity', branch: 'Fundamentals' },
  { id: 'Current', parent: 'Electricity', branch: 'Fundamentals' },
  { id: 'Resistance', parent: 'Electricity', branch: 'Fundamentals' },
  { id: 'Ohm’s law', parent: 'Electricity', branch: 'Relationships' },
  { id: 'Diode', parent: 'Electricity', branch: 'Components' },
  { id: 'Measurement process', parent: 'Electricity', branch: 'Practice' },
  { id: 'Power', parent: 'Electricity', branch: 'Applications' }
];
