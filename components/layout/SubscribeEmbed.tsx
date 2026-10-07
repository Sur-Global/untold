import { SUBSCRIBE_FORM_URL } from '@/lib/subscribe'

/** The Sender newsletter form, embedded. `title` is for screen readers. */
export function SubscribeEmbed({ title, className = '' }: { title: string; className?: string }) {
  return (
    <iframe
      src={SUBSCRIBE_FORM_URL}
      title={title}
      loading="lazy"
      className={`mx-auto block h-[660px] w-full max-w-[460px] border-0 bg-white sm:h-[600px] ${className}`}
    />
  )
}
