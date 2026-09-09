import * as MarkdownItModule from 'markdown-it';

// Angular/Webpack envuelve módulos CommonJS; TypeScript 4.7 los tipa con
// `export =`. Resolver ambas formas evita depender de esModuleInterop.
const MarkdownItConstructor = (MarkdownItModule as any).default || MarkdownItModule;

// No HTML from the model, embedded images or automatic remote resource loads.
// Angular additionally sanitizes the resulting string at the innerHTML binding.
const parser = new MarkdownItConstructor({ html: false, breaks: true, linkify: false });
parser.disable('image');

export function renderOpttiaMarkdown(content: string): string {
  return parser.render(content || '');
}
