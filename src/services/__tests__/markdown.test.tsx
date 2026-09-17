import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderMarkdown } from '../markdown';

/**
 * The renderer builds text into elements and never injects HTML, so a note
 * cannot reach `dangerouslySetInnerHTML` or a `<script>` tag regardless of what
 * the user types.
 */

const render = (src: string) => renderToStaticMarkup(<>{renderMarkdown(src, 't')}</>);

describe('renderMarkdown', () => {
  it('renders a heading', () => {
    expect(render('# Привет')).toContain('Привет');
  });

  it('renders bold, italic and inline code', () => {
    const out = render('**жирный** и *курсив* и `код`');
    expect(out).toContain('<strong>жирный</strong>');
    expect(out).toContain('<em>курсив</em>');
    expect(out).toContain('<code');
    expect(out).toContain('код');
  });

  it('renders an unordered list', () => {
    const out = render('- один\n- два');
    expect(out).toContain('<ul');
    expect(out).toContain('<li>один</li>');
    expect(out).toContain('<li>два</li>');
  });

  it('renders an ordered list', () => {
    const out = render('1. один\n2. два');
    expect(out).toContain('<ol');
  });

  it('renders a quote block', () => {
    expect(render('> цитата')).toContain('цитата');
  });

  it('renders a fenced code block', () => {
    const out = render('```\nlet x = 1\n```');
    expect(out).toContain('<pre');
    expect(out).toContain('let x = 1');
  });

  it('renders a link with a safe href', () => {
    const out = render('[доки](https://example.com)');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('доки');
  });

  it('refuses a javascript: link', () => {
    // A hostile scheme must not become a live link.
    const out = render('[x](javascript:alert(1))');
    expect(out).not.toContain('javascript:alert');
    expect(out).toContain('href="#"');
  });

  it('escapes text that looks like a tag', () => {
    const out = render('а <script>alert(1)</script> нормальный текст');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('renders unknown markdown as plain text, not stripped', () => {
    // Unsupported constructs are left readable rather than mangled.
    expect(render('~~зачёркнутый~~')).toContain('зачёркнутый');
  });

  it('keeps line order across mixed blocks', () => {
    const out = render('# Заголовок\n\nпараграф\n\n- пункт');
    expect(out.indexOf('Заголовок')).toBeLessThan(out.indexOf('параграф'));
    expect(out.indexOf('параграф')).toBeLessThan(out.indexOf('пункт'));
  });
});
