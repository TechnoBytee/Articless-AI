import { parseFlexibleJSON } from '../services/gemini';

describe('Gemini parseFlexibleJSON ReDoS Security and Functionality Tests', () => {
  it('should parse standard valid JSON', () => {
    const input = '{"name": "test", "value": 123}';
    expect(parseFlexibleJSON(input)).toEqual({ name: 'test', value: 123 });
  });

  it('should parse JSON wrapped in markdown code blocks', () => {
    const input = '```json\n{"items": [1, 2, 3]}\n```';
    expect(parseFlexibleJSON(input)).toEqual({ items: [1, 2, 3] });
  });

  it('should parse JSON with trailing commas', () => {
    const input = '{"array": [1, 2, 3,], "key": "value",}';
    expect(parseFlexibleJSON(input)).toEqual({ array: [1, 2, 3], key: 'value' });
  });

  it('should extract and parse JSON array nested in random text', () => {
    const input = 'Some greeting message: \n[\n  {"id": 1, "title": "A"},\n  {"id": 2, "title": "B"}\n]\nFollowed by footers.';
    expect(parseFlexibleJSON(input)).toEqual([
      { id: 1, title: 'A' },
      { id: 2, title: 'B' },
    ]);
  });

  it('should extract and parse JSON object nested in random text', () => {
    const input = 'Raw text before {\"key\": \"value\", \"nested\": {\"inner\": true}} raw text after';
    expect(parseFlexibleJSON(input)).toEqual({
      key: 'value',
      nested: { inner: true },
    });
  });

  it('should fail on invalid JSON format without hanging (ReDoS and performance test)', () => {
    // Generate a long malicious-looking string that could trigger ReDoS in weak regex
    const maliciousInput = 'a'.repeat(5000) + ' { "key": "value" ' + 'b'.repeat(5000);
    const start = Date.now();
    expect(() => parseFlexibleJSON(maliciousInput)).toThrow();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100); // Should execute almost instantly
  });
});
