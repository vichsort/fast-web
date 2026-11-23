import { z } from 'zod';
import { emailText, requiredChoice, requiredText } from './forms';

const messages = (result: { error?: z.ZodError }) => result.error?.issues.map((i) => i.message) ?? [];

describe('form schema pieces', () => {
  it('requiredText refuses empty or blank text and keeps what was typed', () => {
    const schema = requiredText('obrigatório');

    expect(messages(schema.safeParse(''))).toEqual(['obrigatório']);
    expect(messages(schema.safeParse('   '))).toEqual(['obrigatório']);
    expect(schema.parse(' Ana ')).toBe(' Ana ');
  });

  it('emailText checks the format the screens check, spaces around do not count', () => {
    const schema = emailText('email inválido');

    expect(schema.safeParse(' ana@fast.com.br ').success).toBe(true);
    expect(messages(schema.safeParse('ana@fast'))).toEqual(['email inválido']);
    expect(messages(schema.safeParse(''))).toEqual(['email inválido']);
  });

  it('requiredChoice refuses null and outputs the chosen value', () => {
    const schema = requiredChoice(z.enum(['a', 'b']), 'escolha');

    expect(messages(schema.safeParse(null))).toEqual(['escolha']);
    expect(schema.parse('b')).toBe('b');
  });
});
