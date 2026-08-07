/**
 * Export is assembled as Markdown and only then converted, so the same string is what a .md
 * export writes verbatim and what the .docx converter is fed. These pin that assembly and the
 * filename extension, which is what decides the format the save dialog offers.
 *
 * Only the pure helpers are covered - exportTranscript() itself needs `dialog` and the LLM API,
 * neither of which the electron stub provides.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('tools-export');

  const { buildExportMarkdown, generateExportFilename } = await loadMain(
    'utils/export-markdown.js'
  );

  const transcripts = [
    { timestamp: Date.now(), text: 'I led the migration.', speaker: 'self' },
    { timestamp: Date.now(), text: 'Tell me about a hard bug.', speaker: 'other' },
  ];
  const suggestions = [
    { timestamp: Date.now(), last_question: 'Why did you leave?', answer: 'Growth.' },
  ];

  const md = buildExportMarkdown({
    username: 'Ada Lovelace',
    summary: '# **Report**\nBody text.',
    transcripts,
    suggestions,
  });

  check('keeps the summary', md.includes('# **Report**'));
  check('stamps the export time under the title', md.includes('##### Date/Time:'));
  check('emits the transcripts section', md.includes('# **Transcripts**'));
  check('emits the suggestions section', md.includes('# **Suggestions**'));
  check('labels the candidate by name', md.includes('| Ada Lovelace***'));
  check('labels everyone else as the interviewer', md.includes('| Interviewer***'));
  check(
    'carries the question and the suggested answer',
    md.includes('Why did you leave?') && md.includes('Growth.')
  );

  const empty = buildExportMarkdown({
    username: 'Ada Lovelace',
    summary: '# **Report**',
    transcripts: [],
    suggestions: [],
  });
  check('omits the transcripts heading when there are none', !empty.includes('# **Transcripts**'));
  check('omits the suggestions heading when there are none', !empty.includes('# **Suggestions**'));

  const docxName = generateExportFilename('docx');
  const mdName = generateExportFilename('md');
  check('names the Word export .docx', docxName.endsWith('.docx'));
  check('names the Markdown export .md', mdName.endsWith('.md'));
  check(
    'keeps the report-<timestamp> stem',
    /^report-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.(docx|md)$/.test(mdName)
  );
  // `format` crosses IPC from the renderer, where the type annotation is erased.
  check(
    'falls back to docx for an unknown format',
    generateExportFilename('exe').endsWith('.docx')
  );

  return failures;
}
