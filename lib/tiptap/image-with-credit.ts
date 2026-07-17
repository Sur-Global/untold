import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

export const ImageWithCredit = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      credit: {
        default: null,
      },
      // HTML-formatted credit (e.g. with links). Serialised via data-credit-html
      // and post-processed in ArticleBody to inject real HTML.
      creditHtml: {
        default: null,
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const { credit, creditHtml, ...imgAttrs } = HTMLAttributes
    const hasCaption = credit || creditHtml
    if (!hasCaption) {
      return ['img', mergeAttributes(this.options.HTMLAttributes, imgAttrs)]
    }
    // creditHtml: stash the HTML in a data attribute; ArticleBody post-processes it.
    const figcaptionAttrs: Record<string, string> = { class: 'image-credit' }
    if (creditHtml) figcaptionAttrs['data-credit-html'] = creditHtml
    return [
      'figure',
      { class: 'article-image' },
      ['img', mergeAttributes(this.options.HTMLAttributes, imgAttrs)],
      ['figcaption', figcaptionAttrs, creditHtml ? '' : credit],
    ]
  },

  parseHTML() {
    return [
      { tag: 'img[src]' },
      {
        tag: 'figure',
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector('img')
          const caption = (el as HTMLElement).querySelector('figcaption')
          return {
            src: img?.getAttribute('src') ?? null,
            alt: img?.getAttribute('alt') ?? null,
            credit: caption?.textContent ?? null,
          }
        },
      },
    ]
  },
})
