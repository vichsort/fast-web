// Link do convite e da recuperação de senha (06 do backend, R12 e R14): o backend devolve o token, e o app monta o link
// com a própria origem (o link da prévia abre a prévia). O token vai no hash: não chega a log de servidor nem ao Referer.

const TOKEN = /^[A-Za-z0-9_-]+$/;

/** O link que o owner manda ao membro. */
export function memberLink(origin: string, token: string): string {
  return `${origin}/link#${token}`;
}

/** O token do hash da página `/link`, ou `null` se o hash não é um token. */
export function linkToken(hash: string): string | null {
  const token = hash.replace(/^#/, '');
  return TOKEN.test(token) ? token : null;
}
