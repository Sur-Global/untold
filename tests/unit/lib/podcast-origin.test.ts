import { describe, it, expect } from 'vitest'
import {
  PODCAST_BADGE_KEYS,
  PODCAST_ORIGINS,
  PODCAST_ORIGIN_KEYS,
  PODCAST_ORIGIN_OPTION_KEYS,
  PODCAST_ORIGIN_REQUIRED_MESSAGE,
  isPodcastOrigin,
  originForNewPodcast,
  originForSavedPodcast,
  podcastBadgeLabel,
  readPodcastOrigin,
} from '@/lib/podcast-origin'
import { publishErrorMessage } from '@/lib/profile-complete'
import en from '@/messages/en.json'
import es from '@/messages/es.json'

const form = (fields: Record<string, string> = {}) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('the types of podcast', () => {
  it('go in the order of the sections of the podcasts page: made by SurGlobal / UNTOLD.ink, collaboration, interviews, third parties', () => {
    expect([...PODCAST_ORIGINS]).toEqual(['own', 'collab', 'guest', 'third_party'])
  })

  it('knows a valid type and nothing else', () => {
    for (const origin of PODCAST_ORIGINS) expect(isPodcastOrigin(origin)).toBe(true)
    for (const value of ['', 'other', null, undefined, 3, 'OWN']) expect(isPodcastOrigin(value)).toBe(false)
  })

  it('reads the type from a form, or null when it has none or something invalid', () => {
    expect(readPodcastOrigin(form({ origin: 'collab' }))).toBe('collab')
    expect(readPodcastOrigin(form())).toBeNull()
    expect(readPodcastOrigin(form({ origin: 'hacker' }))).toBeNull()
  })
})

describe('creating a podcast', () => {
  it('a creator’s podcast is third-party, whatever they send', () => {
    expect(originForNewPodcast({ isEditor: false, formData: form(), publishing: true })).toBe('third_party')
    expect(originForNewPodcast({ isEditor: false, formData: form({ origin: 'own' }), publishing: false })).toBe('third_party')
  })

  it('an admin or editor chooses it', () => {
    expect(originForNewPodcast({ isEditor: true, formData: form({ origin: 'own' }), publishing: true })).toBe('own')
    expect(originForNewPodcast({ isEditor: true, formData: form({ origin: 'guest' }), publishing: false })).toBe('guest')
  })

  it('an admin or editor can save a draft without choosing yet, but not publish', () => {
    expect(originForNewPodcast({ isEditor: true, formData: form(), publishing: false })).toBeNull()
    expect(() => originForNewPodcast({ isEditor: true, formData: form(), publishing: true })).toThrow(PODCAST_ORIGIN_REQUIRED_MESSAGE)
    expect(() => originForNewPodcast({ isEditor: true, formData: form({ origin: 'nope' }), publishing: true })).toThrow(PODCAST_ORIGIN_REQUIRED_MESSAGE)
  })
})

describe('saving a podcast', () => {
  it('only an admin or editor changes the type', () => {
    expect(originForSavedPodcast({ isEditor: true, formData: form({ origin: 'collab' }) })).toBe('collab')
    expect(originForSavedPodcast({ isEditor: false, formData: form({ origin: 'collab' }) })).toBeUndefined()
  })

  it('leaves the type as it is when the form does not send a valid one', () => {
    expect(originForSavedPodcast({ isEditor: true, formData: form() })).toBeUndefined()
    expect(originForSavedPodcast({ isEditor: true, formData: form({ origin: 'x' }) })).toBeUndefined()
  })
})

describe('what the readers see', () => {
  const t = (key: string) => `[${key}]`

  it('the card of the three types tied to SurGlobal / UNTOLD.ink has a label; the third-party one (the usual) has none', () => {
    expect(podcastBadgeLabel('own', t)).toBe('[podcastBadgeOwn]')
    expect(podcastBadgeLabel('collab', t)).toBe('[podcastBadgeCollab]')
    expect(podcastBadgeLabel('guest', t)).toBe('[podcastBadgeGuest]')
    expect(podcastBadgeLabel('third_party', t)).toBeNull()
    expect(podcastBadgeLabel(null, t)).toBeNull()
    expect(podcastBadgeLabel('rubbish', t)).toBeNull()
  })

  it('every type has its heading and label in the interface texts', () => {
    for (const messages of [en, es]) {
      for (const key of Object.values(PODCAST_ORIGIN_KEYS)) expect((messages.listings as Record<string, string>)[key]).toBeTruthy()
      for (const key of Object.values(PODCAST_ORIGIN_OPTION_KEYS)) expect((messages.editor as unknown as Record<string, string>)[key]).toBeTruthy()
      for (const key of Object.values(PODCAST_BADGE_KEYS)) expect((messages.listings as Record<string, string>)[key]).toBeTruthy()
    }
  })

  it('the headings of the page, in Spanish, are the ones chosen', () => {
    expect(es.listings.podcastOriginOwn).toBe('UNTOLD.ink presenta')
    expect(es.listings.podcastOriginCollab).toBe('Nuestras colaboraciones')
    expect(es.listings.podcastOriginGuest).toBe('Nos invitan a conversar')
    expect(es.listings.podcastOriginThirdParty).toBe('De nuestra comunidad')
  })

  it('admins and editors keep the descriptive names in the form, not the headings readers see', () => {
    expect(es.editor.podcastOptionOwn).toBe('Creados por SurGlobal / UNTOLD.ink')
    expect(es.editor.podcastOptionCollab).toBe('Terceros en colaboración con SurGlobal / UNTOLD.ink')
    expect(es.editor.podcastOptionGuest).toBe('Terceros que entrevistan a SurGlobal / UNTOLD.ink')
    expect(es.editor.podcastOptionThirdParty).toBe('Podcasts de terceros')
  })
})

describe('publishing without a type', () => {
  it('the database refusal reads as a clear message', () => {
    expect(publishErrorMessage({ message: 'podcast_origin_required: choose the type of podcast before publishing' })).toBe(PODCAST_ORIGIN_REQUIRED_MESSAGE)
  })
})
