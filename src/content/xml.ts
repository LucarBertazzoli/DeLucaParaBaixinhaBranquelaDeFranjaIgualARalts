/**
 * Leitor de XML bem simples (sem dependências), suficiente para MusicXML:
 * elementos, atributos, texto, CDATA e entidades. Ignora comentários,
 * declarações e DOCTYPE, e tira o prefixo de namespace das tags.
 */

export interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

function localName(tag: string): string {
  const i = tag.indexOf(':');
  return i >= 0 ? tag.slice(i + 1) : tag;
}

function parseAttrs(src: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) attrs[localName(m[1])] = decode(m[3] ?? m[4] ?? '');
  return attrs;
}

export function parseXml(src: string): XmlNode {
  const root: XmlNode = { tag: '#document', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([^\s>/]+)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) {
      top.text += m[1];
    } else if (m[6] !== undefined) {
      top.text += decode(m[6]);
    } else if (m[3] !== undefined) {
      const tag = localName(m[3]);
      if (m[2] === '/') {
        // Fecha até a tag correspondente (tolera XML mal fechado).
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tag === tag) {
            stack.length = i;
            break;
          }
        }
      } else {
        const node: XmlNode = { tag, attrs: parseAttrs(m[4]), children: [], text: '' };
        top.children.push(node);
        if (m[5] !== '/') stack.push(node);
      }
    }
  }
  return root.children.find((c) => c.tag) ?? root;
}

/** Primeiro descendente pelo caminho `a/b/c` (filhos diretos). */
export function child(node: XmlNode | undefined, path: string): XmlNode | undefined {
  let cur = node;
  for (const part of path.split('/')) {
    cur = cur?.children.find((c) => c.tag === part);
    if (!cur) return undefined;
  }
  return cur;
}

/** Texto (sem espaços nas pontas) do caminho, ou `undefined`. */
export function textOf(node: XmlNode | undefined, path: string): string | undefined {
  const n = child(node, path);
  const t = n?.text.trim();
  return t ? t : undefined;
}

/** Primeiro descendente com a tag, em qualquer profundidade. */
export function findDeep(node: XmlNode, tag: string): XmlNode | undefined {
  for (const c of node.children) {
    if (c.tag === tag) return c;
    const f = findDeep(c, tag);
    if (f) return f;
  }
  return undefined;
}
