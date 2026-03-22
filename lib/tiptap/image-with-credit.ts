import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

export const ImageWithCredit = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      credit: {
        default: null,
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const { credit, ...imgAttrs } = HTMLAttributes
    if (!credit) {
      return ['img', mergeAttributes(this.options.HTMLAttributes, imgAttrs)]
    }
    return [
      'figure',
      { class: 'article-image' },
      ['img', mergeAttributes(this.options.HTMLAttributes, imgAttrs)],
      ['figcaption', { class: 'image-credit' }, credit],
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
