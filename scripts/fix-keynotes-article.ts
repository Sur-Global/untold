import { createClient } from '@supabase/supabase-js'

const ANA_ID = 'ea6162a7-c43c-4370-b309-2d5851f19a2f'

const ANA_BIO_ES =
  'Anamaria es consultora en aprendizaje y comunidades, diseñadora de experiencias y facilitadora. ' +
  'A través de <a href="https://handlewithbrain.com/?ref=untold.ink" target="_blank" rel="noopener noreferrer">Handle with Brain</a>, ' +
  'ayuda a organizaciones a diseñar y facilitar espacios de aprendizaje colectivo e innovación, ' +
  'así como experiencias y talleres inmersivos y estimulantes. También se dedica a: ' +
  'escribir <a href="https://anamariadorgo.substack.com/?ref=untold.ink" target="_blank" rel="noopener noreferrer">IRrEGULAR LEtTER</a>, ' +
  'su boletín personal y creativo; ' +
  'co-presentar <a href="https://handlewithbrain.com/mapping-ties?ref=untold.ink" target="_blank" rel="noopener noreferrer">Mapping Ties</a>, ' +
  'un podcast donde quienes construyen comunidades comparten sus historias y aprendizajes; ' +
  'y liderar <a href="https://www.linkedin.com/groups/13770370?ref=untold.ink" target="_blank" rel="noopener noreferrer">L&D Shakers</a>, ' +
  'una comunidad de práctica global, gratuita y galardonada, con más de 7,500 profesionales del L&D.'

const ANA_BIO_EN =
  'Anamaria is a learning and communities consultant, experience designer, and facilitator. ' +
  'Through <a href="https://handlewithbrain.com/?ref=untold.ink" target="_blank" rel="noopener noreferrer">Handle with Brain</a>, ' +
  'she helps organizations design and facilitate collective learning and innovation spaces, ' +
  'as well as immersive and stimulating experiences and workshops. She also: ' +
  'writes <a href="https://anamariadorgo.substack.com/?ref=untold.ink" target="_blank" rel="noopener noreferrer">IRrEGULAR LEtTER</a>, ' +
  'her personal creative newsletter; ' +
  'co-hosts <a href="https://handlewithbrain.com/mapping-ties?ref=untold.ink" target="_blank" rel="noopener noreferrer">Mapping Ties</a>, ' +
  'a podcast where community builders share their stories and learnings; ' +
  'and leads <a href="https://www.linkedin.com/groups/13770370?ref=untold.ink" target="_blank" rel="noopener noreferrer">L&D Shakers</a>, ' +
  'an award-winning, free global community of practice with over 7,500 L&D professionals.'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await (sb as any)
    .from('profiles')
    .update({
      profile_translations: {
        es: { bio: ANA_BIO_ES },
        en: { bio: ANA_BIO_EN },
        _source_bio_cta_url: 'https://www.linkedin.com/in/anamariadorgo/?ref=untold.ink',
        _source_bio_cta_label: 'Conecta con Anamaria',
      },
    })
    .eq('id', ANA_ID)

  if (error) console.error('Error:', error.message)
  else console.log('✓ profile_translations updated with LinkedIn CTA')
}

main().catch(console.error)
