'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FIELD_CLASS } from '@/components/ui/field-styles'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import {
  COURSE_LEVELS,
  COURSE_MODALITIES,
  LEVEL_KEYS,
  MAX_INTRO_SESSIONS,
  MAX_PEOPLE,
  MODALITY_KEYS,
  PERSON_GROUPS,
  SESSION_STATUSES,
  STATUS_KEYS,
  type CourseExtras,
  type CoursePerson,
  type PersonGroup,
} from '@/lib/course-page'

/** What the create and edit forms start with */
export type CourseFormInitial = CourseExtras & { subtitle: string; duration: string; price: number; currency: string }

export const EMPTY_COURSE_FORM: CourseFormInitial = {
  bannerUrl: '', modality: '', place: '', startsOn: '', languageLabel: '', level: '', certificate: false, audience: '', priceNote: '', providerName: '', providerUrl: '',
  registrationMode: 'button', registrationUrl: '', registrationLabel: '', registrationNote: '', introSessions: [], introTimezone: '', people: [],
  subtitle: '', duration: '', price: 0, currency: 'USD',
}

const selectClass = `${FIELD_CLASS} appearance-auto`
const sectionClass = 'space-y-6 rounded-[16px] border border-primary/15 bg-[#fdfcfa] p-6'

/** Presentation, details and "who is it for" of a course: the fields of the create and edit forms, before the full description */
export function CourseDetailsFields({ initial = EMPTY_COURSE_FORM }: { initial?: CourseFormInitial }) {
  const t = useTranslations('editor')
  const tp = useTranslations('coursePage')

  return (
    <>
      <fieldset className={sectionClass}>
        <legend className="px-2 text-sm font-semibold text-[#5d4e37]">{t('coursePresentationTitle')}</legend>
        <div className="space-y-2">
          <Label htmlFor="subtitle">{t('courseSubtitleLabel')}</Label>
          <Input id="subtitle" name="subtitle" defaultValue={initial.subtitle} maxLength={200} placeholder={t('courseSubtitlePlaceholder')} className={FIELD_CLASS} />
        </div>
        <CoverImageInput
          name="banner_url"
          uploadType="hero"
          label={t('courseBannerLabel')}
          previewAspect="5/2"
          sizeHint={t('courseBannerHint')}
          defaultValue={initial.bannerUrl}
        />
      </fieldset>

      <fieldset className={sectionClass}>
        <legend className="px-2 text-sm font-semibold text-[#5d4e37]">{t('courseDetailsTitle')}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="provider_name">{t('courseProviderLabel')}</Label>
            <Input id="provider_name" name="provider_name" defaultValue={initial.providerName} maxLength={120} placeholder={t('courseProviderPlaceholder')} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider_url">{t('courseProviderUrlLabel')}</Label>
            <Input id="provider_url" name="provider_url" type="url" defaultValue={initial.providerUrl} placeholder="https://…" className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modality">{t('courseModalityLabel')}</Label>
            <select id="modality" name="modality" defaultValue={initial.modality} className={selectClass}>
              <option value="">{t('courseNotSet')}</option>
              {COURSE_MODALITIES.map((m) => <option key={m} value={m}>{tp(MODALITY_KEYS[m])}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">{t('courseLevelLabel')}</Label>
            <select id="level" name="level" defaultValue={initial.level} className={selectClass}>
              <option value="">{t('courseNotSet')}</option>
              {COURSE_LEVELS.map((l) => <option key={l} value={l}>{tp(LEVEL_KEYS[l])}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="place">{t('coursePlaceLabel')}</Label>
            <Input id="place" name="place" defaultValue={initial.place} maxLength={120} placeholder={t('coursePlacePlaceholder')} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="starts_on">{t('courseStartsOnLabel')}</Label>
            <Input id="starts_on" name="starts_on" type="date" defaultValue={initial.startsOn} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">{t('durationLabel')}</Label>
            <Input id="duration" name="duration" defaultValue={initial.duration} placeholder={t('durationPlaceholder')} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language_label">{t('courseLanguageLabel')}</Label>
            <Input id="language_label" name="language_label" defaultValue={initial.languageLabel} maxLength={60} placeholder={t('courseLanguagePlaceholder')} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">{t('priceLabel')}</Label>
            <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={String(initial.price)} placeholder={t('pricePlaceholder')} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t('currencyLabel')}</Label>
            <Input id="currency" name="currency" defaultValue={initial.currency || 'USD'} maxLength={3} placeholder="USD" className={FIELD_CLASS} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="price_note">{t('coursePriceNoteLabel')}</Label>
            <Input id="price_note" name="price_note" defaultValue={initial.priceNote} maxLength={120} placeholder={t('coursePriceNotePlaceholder')} className={FIELD_CLASS} />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm text-foreground">
          <input type="checkbox" name="certificate" defaultChecked={initial.certificate} className="size-4 rounded border-primary/30" />
          {t('courseCertificateLabel')}
        </label>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="audience">{t('courseAudienceLabel')}</Label>
        <textarea
          id="audience"
          name="audience"
          defaultValue={initial.audience}
          maxLength={1500}
          rows={5}
          className={`${FIELD_CLASS} h-auto min-h-[130px] py-3 leading-relaxed`}
        />
        <p className="text-xs text-muted-foreground">{t('courseAudienceHint')}</p>
      </div>
    </>
  )
}

/** The registration to the introductory sessions: up to two dates, and the form (a button, or the form inside the page) */
export function CourseRegistrationFields({ initial = EMPTY_COURSE_FORM }: { initial?: CourseFormInitial }) {
  const t = useTranslations('editor')
  const tp = useTranslations('coursePage')

  return (
    <fieldset className={sectionClass}>
      <legend className="px-2 text-sm font-semibold text-[#5d4e37]">{t('courseRegistrationTitle')}</legend>
      <p className="text-sm leading-relaxed text-[#6b5744]">{t('courseRegistrationHint')}</p>

      {Array.from({ length: MAX_INTRO_SESSIONS }, (_, i) => {
        const n = i + 1
        const session = initial.introSessions[i]
        return (
          <div key={n} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`intro_date_${n}`}>{t('courseIntroSession', { number: n })} — {t('courseIntroDate')}</Label>
              <Input id={`intro_date_${n}`} name={`intro_date_${n}`} type="date" defaultValue={session?.date ?? ''} className={FIELD_CLASS} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`intro_time_${n}`}>{t('courseIntroTime')}</Label>
              <Input id={`intro_time_${n}`} name={`intro_time_${n}`} type="time" defaultValue={session?.time ?? ''} className={FIELD_CLASS} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`intro_status_${n}`}>{t('courseIntroStatus')}</Label>
              <select id={`intro_status_${n}`} name={`intro_status_${n}`} defaultValue={session?.status ?? 'open'} className={selectClass}>
                {SESSION_STATUSES.map((s) => <option key={s} value={s}>{tp(STATUS_KEYS[s])}</option>)}
              </select>
            </div>
          </div>
        )
      })}

      <div className="space-y-2">
        <Label htmlFor="intro_timezone">{t('courseIntroTimezone')}</Label>
        <Input id="intro_timezone" name="intro_timezone" defaultValue={initial.introTimezone} maxLength={80} placeholder={t('courseIntroTimezonePlaceholder')} className={FIELD_CLASS} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="registration_url">{t('courseRegistrationUrlLabel')}</Label>
        <Input id="registration_url" name="registration_url" type="url" defaultValue={initial.registrationUrl} placeholder="https://tally.so/r/…" className={FIELD_CLASS} />
        <p className="text-xs text-muted-foreground">{t('courseRegistrationUrlHint')}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium leading-none">{t('courseRegistrationMode')}</p>
        <label className="flex items-center gap-3 text-sm text-foreground">
          <input type="radio" name="registration_mode" value="button" defaultChecked={initial.registrationMode !== 'embed'} className="size-4 accent-[#b8860b]" />
          {t('courseModeButton')}
        </label>
        <label className="flex items-center gap-3 text-sm text-foreground">
          <input type="radio" name="registration_mode" value="embed" defaultChecked={initial.registrationMode === 'embed'} className="size-4 accent-[#b8860b]" />
          {t('courseModeEmbed')}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="registration_label">{t('courseRegistrationLabelLabel')}</Label>
          <Input id="registration_label" name="registration_label" defaultValue={initial.registrationLabel} maxLength={40} placeholder={t('courseRegistrationLabelPlaceholder')} className={FIELD_CLASS} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="registration_note">{t('courseRegistrationNoteLabel')}</Label>
          <Input id="registration_note" name="registration_note" defaultValue={initial.registrationNote} maxLength={300} className={FIELD_CLASS} />
        </div>
      </div>
    </fieldset>
  )
}

type PersonDraft = CoursePerson & { key: number }

const GROUP_LABELS: Record<PersonGroup, { title: string; add: string; rolePlaceholder: string }> = {
  teacher: { title: 'coursePeopleTeachers', add: 'coursePeopleAddTeacher', rolePlaceholder: 'coursePersonRolePlaceholderTeacher' },
  facilitator: { title: 'coursePeopleFacilitators', add: 'coursePeopleAddFacilitator', rolePlaceholder: 'coursePersonRolePlaceholderFacilitator' },
}

/** The teachers (up to four) and the SurGlobal facilitators (up to two) of the course, each with a photo, a line about their role, a short presentation and a link */
export function CoursePeopleFields({ initial = EMPTY_COURSE_FORM }: { initial?: CourseFormInitial }) {
  const t = useTranslations('editor')
  const nextKey = useRef(initial.people.length)
  const [people, setPeople] = useState<PersonDraft[]>(() => initial.people.map((person, i) => ({ ...person, key: i })))

  const change = (key: number, patch: Partial<CoursePerson>) => setPeople((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  const add = (group: PersonGroup) => setPeople((list) => [...list, { key: nextKey.current++, group, name: '', role: '', bio: '', photoUrl: '', linkUrl: '' }])
  const remove = (key: number) => setPeople((list) => list.filter((p) => p.key !== key))

  return (
    <fieldset className={sectionClass}>
      <legend className="px-2 text-sm font-semibold text-[#5d4e37]">{t('coursePeopleTitle')}</legend>
      <p className="text-sm leading-relaxed text-[#6b5744]">{t('coursePeopleHint')}</p>
      <input type="hidden" name="people_json" value={JSON.stringify(people.map(({ key: _key, ...person }) => person))} />

      {PERSON_GROUPS.map((group) => {
        const members = people.filter((p) => p.group === group)
        const labels = GROUP_LABELS[group]
        return (
          <div key={group} className="space-y-4">
            <p className="text-sm font-medium">{t(labels.title, { max: MAX_PEOPLE[group] })}</p>
            {members.map((person, index) => (
              <div key={person.key} className="grid gap-4 rounded-[12px] border border-primary/15 bg-white p-4 sm:grid-cols-[190px_minmax(0,1fr)]">
                <CoverImageInput
                  name={`person_photo_${person.key}`}
                  uploadType="person"
                  label={t('coursePersonPhoto')}
                  defaultValue={person.photoUrl}
                  onChange={(url) => change(person.key, { photoUrl: url })}
                />
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`person_name_${person.key}`}>{t('coursePersonName')} ({index + 1})</Label>
                    <Input id={`person_name_${person.key}`} value={person.name} onChange={(e) => change(person.key, { name: e.target.value })} maxLength={80} className={FIELD_CLASS} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`person_role_${person.key}`}>{t('coursePersonRole')}</Label>
                    <Input id={`person_role_${person.key}`} value={person.role} onChange={(e) => change(person.key, { role: e.target.value })} maxLength={120} placeholder={t(labels.rolePlaceholder)} className={FIELD_CLASS} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`person_bio_${person.key}`}>{t('coursePersonBio')}</Label>
                    <textarea
                      id={`person_bio_${person.key}`}
                      value={person.bio}
                      onChange={(e) => change(person.key, { bio: e.target.value })}
                      maxLength={500}
                      rows={3}
                      className={`${FIELD_CLASS} h-auto min-h-[90px] py-3 leading-relaxed`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`person_link_${person.key}`}>{t('coursePersonLink')}</Label>
                    <Input id={`person_link_${person.key}`} type="url" value={person.linkUrl} onChange={(e) => change(person.key, { linkUrl: e.target.value })} placeholder="https://…" className={FIELD_CLASS} />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(person.key)}>{t('coursePersonRemove')}</Button>
                </div>
              </div>
            ))}
            {members.length < MAX_PEOPLE[group] && (
              <Button type="button" variant="outline" onClick={() => add(group)}>+ {t(labels.add)}</Button>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
