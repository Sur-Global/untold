/**
 * How a link looks inside running text, everywhere on the platform (articles, pills, courses, static pages, video and course
 * descriptions, author bios, photo credits, the editor): brand lilac, bold, underlined. Put these classes on the element that wraps
 * the text. The editor has the same look in app/globals.css (`.bn-editor a`) — change both together.
 *
 * Footnote numbers and the "back to text" arrow keep their own look (see ArticleBody): they are markers, not links in the text.
 */
export const TEXT_LINK_CLASSES = '[&_a]:text-primary [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4'
