/**
 * Seed script: creates author accounts with profiles and 20 articles.
 * Run with: npx tsx --env-file=.env.local scripts/seed-authors.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Authors ─────────────────────────────────────────────────────────────────

const authors = [
  {
    email: 'amara.diallo@untold.ink',
    password: 'TestPass123',
    display_name: 'Amara Diallo',
    slug: 'amara-diallo',
    bio: 'Researcher at the intersection of decolonial theory and emerging technologies. Based in Dakar, exploring how African communities can shape — rather than be shaped by — digital futures. Author of "Code & Colony" (2023).',
    location: 'Dakar, Senegal',
    website: 'https://amaradiallo.com',
    avatar_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&h=300&fit=crop&q=80',
    followers_count: 1240,
  },
  {
    email: 'valentina.morales@untold.ink',
    password: 'TestPass123',
    display_name: 'Valentina Morales',
    slug: 'valentina-morales',
    bio: 'Environmental lawyer and sustainability strategist working with indigenous communities across Latin America to defend territorial rights and build regenerative economies. Founding partner at Tierra Viva Legal.',
    location: 'Bogotá, Colombia',
    website: 'https://valentinamorales.co',
    avatar_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=300&fit=crop&q=80',
    followers_count: 890,
  },
  {
    email: 'siddharth.rao@untold.ink',
    password: 'TestPass123',
    display_name: 'Siddharth Rao',
    slug: 'siddharth-rao',
    bio: 'AI ethics scholar and policy advisor. Former researcher at MIT Media Lab. Writes about algorithmic power, data sovereignty, and what responsible AI looks like from the Global South. Currently at the Centre for Internet & Society, Bangalore.',
    location: 'Bangalore, India',
    website: 'https://siddharthrao.in',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&q=80',
    followers_count: 2150,
  },
  {
    email: 'nkechi.osei@untold.ink',
    password: 'TestPass123',
    display_name: 'Nkechi Osei',
    slug: 'nkechi-osei',
    bio: 'Education activist and curriculum designer reimagining what schooling looks like for African youth. Co-founder of the Pan-African Futures Learning Network. Her work challenges colonial education frameworks and centres Black epistemologies.',
    location: 'Accra, Ghana',
    website: 'https://nkechiosei.org',
    avatar_url: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=300&h=300&fit=crop&q=80',
    followers_count: 1670,
  },
  {
    email: 'leila.hassan@untold.ink',
    password: 'TestPass123',
    display_name: 'Leila Hassan',
    slug: 'leila-hassan',
    bio: 'Investigative journalist and media critic covering surveillance capitalism, press freedom, and the politics of information in the Arab world. Based between Cairo and London. Contributor to Al-Fanar Media and Wired.',
    location: 'Cairo, Egypt',
    website: 'https://leilahassan.press',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&q=80',
    followers_count: 3210,
  },
  {
    email: 'rafael.quispe@untold.ink',
    password: 'TestPass123',
    display_name: 'Rafael Quispe',
    slug: 'rafael-quispe',
    bio: 'Indigenous rights activist and political scientist from the Bolivian Altiplano. Expert in plurinational governance, Buen Vivir philosophy, and the political economy of extractivism. Advisor to the UN Permanent Forum on Indigenous Issues.',
    location: 'La Paz, Bolivia',
    website: 'https://rafaelquispe.com',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&q=80',
    followers_count: 780,
  },
]

// ─── Tags ─────────────────────────────────────────────────────────────────────

const tags = [
  { slug: 'ai-governance',    names: { en: 'AI Governance' } },
  { slug: 'decoloniality',    names: { en: 'Decoloniality' } },
  { slug: 'climate-justice',  names: { en: 'Climate Justice' } },
  { slug: 'education',        names: { en: 'Education' } },
  { slug: 'surveillance',     names: { en: 'Surveillance' } },
  { slug: 'indigenous-rights',names: { en: 'Indigenous Rights' } },
  { slug: 'urban-planning',   names: { en: 'Urban Planning' } },
  { slug: 'data-sovereignty', names: { en: 'Data Sovereignty' } },
  { slug: 'media-freedom',    names: { en: 'Media Freedom' } },
  { slug: 'feminism',         names: { en: 'Feminism' } },
]

// ─── Articles ─────────────────────────────────────────────────────────────────

function body(...paragraphs: string[]) {
  return {
    type: 'doc',
    content: paragraphs.map((text) => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  }
}

const articles = [
  // Amara Diallo
  {
    authorSlug: 'amara-diallo',
    slug: 'who-owns-the-algorithm',
    published_at: '2026-01-14T10:00:00Z',
    likes_count: 347,
    cover_image_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=900&h=500&fit=crop&q=80',
    tags: ['ai-governance', 'decoloniality'],
    title: 'Who Owns the Algorithm?',
    excerpt: 'When Silicon Valley exports its AI systems to Africa, it also exports its assumptions, blind spots, and power structures.',
    bodyText: body(
      'Every AI system encodes the values, assumptions, and blind spots of those who built it. When a hiring algorithm trained on decades of Silicon Valley employment data is deployed to filter job applications in Lagos or Nairobi, it doesn\'t just assess candidates — it replicates a specific vision of who is "employable."',
      'This is the quiet colonialism of the algorithmic age. Unlike the explicit coercion of historical colonialism, algorithmic power operates through the appearance of neutrality and efficiency. The system is just math, we are told. The model simply reflects patterns in the data.',
      'But data is never neutral. It is a historical record, and history is written by those with power. When African governments and companies adopt AI systems built elsewhere — often under favourable commercial terms or donor-funded development programmes — they are also adopting the epistemological frameworks embedded in those systems.',
      'What would African-built AI look like? Not just AI trained on African languages or local datasets, but AI systems that reflect African philosophical frameworks, communal values, and ways of knowing. The Ubuntu principle — "I am because we are" — offers a fundamentally different basis for thinking about individual assessment, community impact, and systemic risk than the liberal individualism that underpins most current AI ethics frameworks.',
      'This is not an argument against AI. It is an argument for AI sovereignty: the right of communities to shape, interrogate, and where necessary reject the algorithmic systems that govern their lives. Without that sovereignty, digital transformation becomes just another vector for dependency.'
    ),
  },
  {
    authorSlug: 'amara-diallo',
    slug: 'decolonizing-the-digital-library',
    published_at: '2025-11-03T09:00:00Z',
    likes_count: 218,
    cover_image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&h=500&fit=crop&q=80',
    tags: ['decoloniality', 'education'],
    title: 'Decolonizing the Digital Library',
    excerpt: 'Wikipedia has more articles about fictional places in Tolkien\'s Middle-earth than about entire African countries. That is not an accident.',
    bodyText: body(
      'The digital knowledge commons was supposed to democratise access to information. In theory, anyone with an internet connection could now access the sum of human knowledge. In practice, the internet has faithfully reproduced — and in some ways amplified — the epistemic hierarchies of the analogue world.',
      'Wikipedia, the world\'s largest encyclopedia, has more articles about fictional places in Tolkien\'s Middle-earth than it does about many entire African nations. The English-language Wikipedia is over fifty times larger than the Swahili Wikipedia, despite Swahili being spoken by over 200 million people.',
      'This is not merely a gap in coverage. It is a statement about whose knowledge matters, whose perspectives are worth documenting, whose languages are considered adequate vessels for truth. The digital library has been built by those with the time, the access, and — crucially — the assumption that their knowledge is universal.',
      'Decolonizing the digital library requires more than translation. It requires a fundamental rethinking of what counts as a reliable source, what constitutes verifiable knowledge, and whose oral traditions, community histories, and embodied expertise deserve to be treated as legitimate epistemic contributions.',
      'Several projects are attempting this work: the African Storybook Project, the Endangered Archives Programme at the British Library, community-led wikis in dozens of African languages. But they operate against the tide of a digital economy that rewards scale, velocity, and English-language content above all else.'
    ),
  },
  {
    authorSlug: 'amara-diallo',
    slug: 'the-myth-of-the-leapfrog',
    published_at: '2025-08-19T08:00:00Z',
    likes_count: 432,
    cover_image_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&h=500&fit=crop&q=80',
    tags: ['decoloniality', 'data-sovereignty'],
    title: 'The Myth of the Leapfrog',
    excerpt: 'Africa will skip landlines and go straight to smartphones, we were told. But leapfrogging infrastructure doesn\'t mean leapfrogging power.',
    bodyText: body(
      'The leapfrog narrative has been one of the most seductive stories in development discourse. Africa, we are told, will bypass the industrial age, skipping dirty factories and copper phone lines to land directly in the clean, digital future. The mobile money revolution in Kenya was exhibit A.',
      'But the leapfrog story has a sleight of hand at its centre. What Africa is leapfrogging is infrastructure — physical infrastructure that, despite its costs, also creates economic complexity, technical knowledge, and local industrial capacity. What Africa is not leapfrogging is dependency.',
      'M-Pesa is celebrated as an African innovation. But Safaricom, the company behind it, is majority-owned by Vodafone and the Kenyan government. The transaction data flows through servers in Europe. The revenue model was designed by consultants trained in Western business schools. The "African innovation" is real — but the ownership structure tells a different story.',
      'True digital sovereignty requires more than local apps on foreign platforms. It requires fibre optic cables owned by African institutions, data centres on African soil, open-source software stacks developed with African needs in mind, and tech education systems that produce not just users and coders, but architects of digital infrastructure.',
      'The leapfrog metaphor suggests movement — a clean jump from one lily pad to the next. But if the next lily pad is owned by someone else, you are still in their pond.'
    ),
  },
  // Valentina Morales
  {
    authorSlug: 'valentina-morales',
    slug: 'the-amazon-is-not-empty',
    published_at: '2026-02-07T11:00:00Z',
    likes_count: 512,
    cover_image_url: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=900&h=500&fit=crop&q=80',
    tags: ['climate-justice', 'indigenous-rights'],
    title: 'The Amazon Is Not Empty',
    excerpt: 'The fiction of terra nullius — empty land ripe for development — is alive and well in contemporary environmental policy. Indigenous communities pay the price.',
    bodyText: body(
      'When Brazilian agribusiness looks at the Amazon, it sees empty space waiting to be made productive. When conservation NGOs based in Washington and Geneva look at the Amazon, they sometimes see the same thing: a wilderness to be preserved, human-free, as a carbon sink for the world\'s emissions.',
      'Both visions erase the same people: the more than 400 indigenous nations who have lived in, managed, and maintained the Amazon for millennia. Terra nullius — the colonial legal fiction of empty land — has never died. It has just changed its vocabulary.',
      'The science is unequivocal: indigenous-managed territories have lower deforestation rates, higher biodiversity, and better ecological outcomes than both unprotected forests and many state-managed conservation areas. Indigenous peoples are the most effective forest guardians on Earth — not despite their presence, but because of it.',
      'Yet indigenous land rights in Brazil remain deeply contested. The "marco temporal" ruling, which sought to limit indigenous territorial claims to lands occupied before 1988, would have invalidated generations of occupation disrupted by violence and forced displacement. The legal battle continues.',
      'Climate finance must follow the evidence. Funding that flows to governments and international NGOs while bypassing indigenous land defenders is not just inefficient — it is a continuation of the colonial patterns that created the climate crisis in the first place.'
    ),
  },
  {
    authorSlug: 'valentina-morales',
    slug: 'water-is-not-a-commodity',
    published_at: '2025-10-22T14:00:00Z',
    likes_count: 389,
    cover_image_url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=900&h=500&fit=crop&q=80',
    tags: ['climate-justice', 'indigenous-rights'],
    title: 'Water Is Not a Commodity',
    excerpt: 'From the Andes to the Nile, communities are asserting water as a right, not a resource to be traded on international markets.',
    bodyText: body(
      'In the high Andes of Bolivia and Peru, water is not just a resource. It is a living entity — Mama Cocha in the Quechua cosmology — with its own rights, its own rhythms, and its own claims on human behaviour. This is not metaphor. It is a legal and philosophical framework that governs how Andean communities relate to watersheds, glaciers, and rain cycles.',
      'In 2010, the United Nations declared access to clean water and sanitation a human right. In the same decade, global water futures began trading on the Chicago Mercantile Exchange. These two facts are not unrelated.',
      'The commodification of water follows a familiar pattern: extract a resource from the commons, enclose it, assign it a price, and let the market determine who gets access. The communities who have managed these water systems sustainably for generations — and who depend on them for survival — are priced out.',
      'Water defenders are among the most persecuted environmental activists in the world. In Honduras, Berta Cáceres was murdered for opposing a dam on the sacred Gualcarque River. In Chile, the Mapuche people continue to fight against the water privatisation model enshrined in Pinochet\'s 1981 Water Code.',
      'What the water rights movement is demanding is not opposition to development. It is recognition that some things are too fundamental to human life and ecological health to be governed by profit motives. Water. Air. Seed. These are not commodities. They are commons, and commons require governance frameworks that centre communities, not markets.'
    ),
  },
  {
    authorSlug: 'valentina-morales',
    slug: 'buen-vivir-beyond-the-slogan',
    published_at: '2025-07-14T09:30:00Z',
    likes_count: 267,
    cover_image_url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&h=500&fit=crop&q=80',
    tags: ['indigenous-rights', 'climate-justice'],
    title: 'Buen Vivir Beyond the Slogan',
    excerpt: 'Ecuador and Bolivia constitutionalised the rights of nature. A decade later, the extractivist machine rolls on. What went wrong?',
    bodyText: body(
      'When Ecuador became the first country in the world to enshrine the rights of nature in its constitution in 2008, it felt like a rupture in the dominant order. Pacha Mama — Mother Earth — was no longer an object to be exploited but a subject with legal standing. The Andean philosophy of Sumak Kawsay, or Buen Vivir (Good Living), had entered constitutional law.',
      'Bolivia followed in 2010 with the Law of Mother Earth. International attention was intense. A new paradigm seemed possible.',
      'Yet by 2025, Ecuador has opened new oil concessions in the Amazon, including within protected areas. Bolivia\'s lithium extraction — driven partly by global demand for electric vehicle batteries — is proceeding with minimal free, prior, and informed consent from affected Aymara and Quechua communities. The constitutional rights of nature have been repeatedly overridden by executive decrees and economic necessity arguments.',
      'What happened? The honest answer is that constitutional language, however radical, cannot by itself overcome the structural dependencies of an economy built on commodity exports. Buen Vivir as a lived practice requires not just legal recognition but alternative economic models, debt relief, technology transfer, and a global economic order that doesn\'t price developing nations into extractivism.',
      'This is not an argument for abandoning the project. It is an argument for understanding it more clearly: Buen Vivir is not a national policy option. It is a civilisational challenge that requires transformation at every scale, from household consumption in the Global North to the architecture of international trade.'
    ),
  },
  // Siddharth Rao
  {
    authorSlug: 'siddharth-rao',
    slug: 'ai-governance-without-the-south',
    published_at: '2026-02-28T13:00:00Z',
    likes_count: 621,
    cover_image_url: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&h=500&fit=crop&q=80',
    tags: ['ai-governance', 'data-sovereignty'],
    title: 'AI Governance Without the South',
    excerpt: 'The EU AI Act, the US Executive Order, the G7 AI Code of Conduct. Major AI governance frameworks are being written without the voices of those most affected.',
    bodyText: body(
      'The global governance of artificial intelligence is being shaped by a remarkably narrow set of actors. The EU AI Act, the United States Executive Order on AI, the G7 Hiroshima AI Process, the OECD AI Principles — all of these have been driven by rich, technologically advanced nations with large domestic AI industries.',
      'The Global South is largely absent from these conversations, except as an afterthought: a market to be entered, a population to be served, or a source of cheap data labelling labour. The assumption is that governance frameworks developed in Washington, Brussels, and Tokyo will be universal — or that developing nations will simply adopt them wholesale, as they adopted WTO rules and Basel banking accords.',
      'This assumption deserves scrutiny. AI systems deployed in India, Nigeria, or Indonesia face different contexts, different failure modes, and different stakes than the same systems deployed in Germany or California. A content moderation algorithm calibrated for English-language text will behave unpredictably in Tamil, Yoruba, or Bahasa. A facial recognition system trained predominantly on European faces will have higher error rates for darker-skinned individuals — with consequences that range from inconvenient to deadly when deployed by police forces.',
      'Southern nations are not passive recipients of AI technology. India is building its own large language models. Nigeria has a growing AI startup ecosystem. Indonesia is investing in national AI infrastructure. These efforts deserve governance frameworks that reflect their contexts and values, not just compliance templates designed for Silicon Valley.',
      'The urgency is real. AI governance architecture is being built now, and path dependency is strong. The frameworks being written today will shape the technology — and its power distribution — for decades. If the Global South is not at the table, it will be on the menu.'
    ),
  },
  {
    authorSlug: 'siddharth-rao',
    slug: 'the-myth-of-neutral-data',
    published_at: '2025-12-10T10:00:00Z',
    likes_count: 445,
    cover_image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=500&fit=crop&q=80',
    tags: ['data-sovereignty', 'ai-governance'],
    title: 'The Myth of Neutral Data',
    excerpt: 'There is no such thing as raw data. Every dataset is a set of choices — about what to measure, how to measure it, and whose lives are considered worth counting.',
    bodyText: body(
      '"The data speaks for itself." This is perhaps the most dangerous sentence in contemporary public discourse. It appears in board rooms, government briefings, and academic papers, and every time it does, it performs a kind of conjuring trick: it makes the social process of data collection and analysis disappear, leaving only the apparent objectivity of numbers.',
      'But data does not speak for itself. Data is made. It is made by people who decide what to count, how to count it, and what categories to use. These decisions are not neutral — they reflect the priorities, assumptions, and blind spots of those doing the counting.',
      'Take criminal justice data. Police arrest statistics appear to be objective measurements of criminal behaviour. But they measure something different: police behaviour. Police patrol more heavily in poor, racially marginalised neighbourhoods, so those neighbourhoods produce more arrest data, which in turn justifies more policing — a feedback loop that looks, from the outside, like an evidence-based policy.',
      'Or take medical data. For most of the twentieth century, clinical trials routinely excluded women, on the grounds that hormonal variation introduced too many variables. The drugs that resulted from this research were approved based on how they worked in male bodies. Women, the majority of pharmaceutical consumers, were an afterthought.',
      'Data sovereignty — the right of communities to control how data about them is collected, stored, and used — is not just a privacy issue. It is a political question about who gets to define reality. As AI systems consume ever-larger datasets to make ever-more-consequential decisions, the politics of data become the politics of power.'
    ),
  },
  {
    authorSlug: 'siddharth-rao',
    slug: 'when-your-government-buys-spyware',
    published_at: '2025-09-05T08:00:00Z',
    likes_count: 589,
    cover_image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&h=500&fit=crop&q=80',
    tags: ['surveillance', 'data-sovereignty'],
    title: 'When Your Government Buys Spyware',
    excerpt: 'Pegasus, Predator, FinFisher. The surveillance technology industry sells to democracies and autocracies alike. The targets are journalists, activists, and lawyers.',
    bodyText: body(
      'In July 2021, a consortium of investigative journalists published the Pegasus Project: an investigation into the use of NSO Group\'s Pegasus spyware against journalists, human rights activists, lawyers, and political figures across the world. The target list included heads of state, opposition politicians, and journalists investigating government corruption.',
      'The targets were not criminals. They were people doing the work that a free society requires: holding power to account, defending the vulnerable, asking inconvenient questions.',
      'The surveillance technology industry operates in a legal grey zone. Companies like NSO Group, Hacking Team, and Intellexa are registered in democratic countries — Israel, Italy, Greece — and export their products subject to licensing regimes that are, in practice, largely unenforced. The buyers are governments. The targets are their own citizens.',
      'India, one of the world\'s largest democracies, appeared repeatedly in the Pegasus Project data. The government denied using the spyware. An independent technical committee appointed by the Supreme Court found "inconclusive" evidence. Several of the identified targets were journalists who had covered stories embarrassing to the ruling party.',
      'This is not a story about authoritarian regimes and their surveillance apparatus. It is a story about the slow erosion of democratic norms through the commercially available tools of repression. When surveillance becomes a commodity, the question is not whether your government can spy on you — it is whether it chooses to. And that choice depends on whether journalists, lawyers, and activists continue to create costs for those who do.'
    ),
  },
  // Nkechi Osei
  {
    authorSlug: 'nkechi-osei',
    slug: 'learning-while-black-in-british-schools',
    published_at: '2026-01-28T11:00:00Z',
    likes_count: 734,
    cover_image_url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=900&h=500&fit=crop&q=80',
    tags: ['education', 'decoloniality'],
    title: 'Learning While Black in British Schools',
    excerpt: 'Black British students are more likely to be excluded, less likely to be identified as gifted, and more likely to be steered away from academic pathways. The data is damning.',
    bodyText: body(
      'In British schools, Black Caribbean pupils are more than twice as likely to receive a fixed-period exclusion as white British pupils. Black pupils are significantly underrepresented in programmes for gifted and talented students and overrepresented in alternative provision. These are not new statistics — they have persisted, with minor variation, for decades.',
      'They are also not accidental. They reflect a school system that was built to produce certain kinds of citizens — broadly, obedient workers and loyal subjects of the British Empire — and that was never fundamentally restructured when the empire ended and the demographics changed.',
      'The curriculum remains part of the problem. History lessons in most British schools still centre the British perspective on empire: the trade routes, the administrative achievements, the "civilising mission." The enslaved people, the colonised populations, and the long-term consequences of extraction rarely feature except as backdrop.',
      'But the problem runs deeper than curriculum. It is in the unexamined assumptions of teachers who see Black boys as threats before they see them as learners. It is in the disciplinary systems that criminalise behaviours in Black children that are overlooked in white children. It is in the absence of Black teachers and school leaders who might provide different mirrors.',
      'Decolonising education is not about making Black children feel good. It is about making the educational system accurate — about teaching the actual history of the world, and about building school cultures capable of seeing and nurturing all of their students. That project has barely begun.'
    ),
  },
  {
    authorSlug: 'nkechi-osei',
    slug: 'pan-african-futures-reimagining-education',
    published_at: '2025-11-18T12:00:00Z',
    likes_count: 298,
    cover_image_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=900&h=500&fit=crop&q=80',
    tags: ['education', 'decoloniality'],
    title: 'Pan-African Futures: Reimagining Education',
    excerpt: 'What if African children learned history from African perspectives? What if the starting point wasn\'t Greece and Rome but Kemet and Mali?',
    bodyText: body(
      'Before colonisation disrupted African educational systems, the continent had its own rich traditions of learning: the universities of Timbuktu, the apprenticeship systems of West African craft guilds, the oral knowledge traditions of the griots, the astronomical knowledge of the Dogon. These were not primitive precursors to European education. They were sophisticated, contextually adapted systems of knowledge transmission.',
      'Contemporary African education largely ignores this inheritance. The curriculum frameworks adopted by most African nations after independence were modelled on the systems of their former colonisers, with surface-level adjustments. The result is an education system that produces Africans who know more about the French Revolution than about the Manden Charter, more about Shakespeare than about Chinua Achebe.',
      'The consequences extend beyond cultural alienation. Education systems that treat Western knowledge as universal and African knowledge as particular produce graduates who are oriented toward Europe and North America — geographically, economically, and intellectually. The brain drain that plagues African institutions is partly a consequence of an education system that trains people for departure.',
      'The Pan-African Futures Learning Network is attempting something different: a curriculum framework grounded in African epistemologies, African histories, and African futures. Not a rejection of global knowledge — science, mathematics, and technology are genuinely universal — but an insistence that African children see themselves as the inheritors of a rich intellectual tradition, not as latecomers to a party someone else started.',
      'This is long-term work. It requires not just curriculum redesign but teacher training, assessment reform, and — fundamentally — a political will to invest in education as a nation-building project rather than as a pathway to individual emigration.'
    ),
  },
  {
    authorSlug: 'nkechi-osei',
    slug: 'who-teaches-the-teachers',
    published_at: '2025-06-09T10:00:00Z',
    likes_count: 183,
    cover_image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&h=500&fit=crop&q=80',
    tags: ['education'],
    title: 'Who Teaches the Teachers?',
    excerpt: 'Teacher training in Africa remains heavily influenced by British, French, and American pedagogical models. It\'s time to ask whose assumptions are baked into the classroom.',
    bodyText: body(
      'Teacher training colleges across sub-Saharan Africa follow remarkably similar patterns. The pedagogical models they teach — lesson planning formats, assessment frameworks, classroom management techniques — trace their lineage back to British, French, or American educational traditions, depending on the colonial history of the country in question.',
      'This is not a conspiracy. It is the accumulated consequence of decades of development aid, international exchange programmes, and the absence of strong African educational research institutions capable of generating alternative models.',
      'But the consequences are real. Teachers trained in Western pedagogical traditions bring those traditions\' assumptions into classrooms where they may not fit. The idea of the individual learner competing against peers for grades, for example, is a culturally specific model that sits uneasily in societies with strong communal learning traditions.',
      'Several African universities are doing the hard work of developing context-specific pedagogical research: the University of Nairobi\'s Centre for Educational Research, the University of Cape Town\'s School of Education, the University of Ghana\'s Institute for Educational Research. But they remain under-resourced and under-cited compared to their counterparts in the North.',
      'Decolonising teacher training means investing in African educational research, taking seriously what teachers and students report about what works in their classrooms, and resisting the pressure to adopt internationally fashionable pedagogical models simply because they are internationally fashionable.'
    ),
  },
  // Leila Hassan
  {
    authorSlug: 'leila-hassan',
    slug: 'the-surveillance-state-comes-for-the-press',
    published_at: '2026-03-05T09:00:00Z',
    likes_count: 892,
    cover_image_url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&h=500&fit=crop&q=80',
    tags: ['media-freedom', 'surveillance'],
    title: 'The Surveillance State Comes for the Press',
    excerpt: 'In country after country, anti-terrorism laws and cybercrime legislation are being used not against terrorists or criminals — but against journalists.',
    bodyText: body(
      'The Egyptian journalist Khaled Dawoud spent years as a spokesman for a secular political party, as a broadcaster, and as a journalist covering regional affairs. In 2019, he was arrested. The charge: spreading false information and membership of a terrorist organisation. He spent years in pre-trial detention before his release in 2022.',
      'His case is not exceptional. Across the Arab world, "anti-terrorism" and "cybercrime" laws passed in the wake of the 2011 uprisings have been systematically deployed against journalists, bloggers, and social media users who criticise governments. The laws are broad enough to criminalise almost any critical reporting and carry sentences ranging from years to decades.',
      'The pattern extends beyond the Arab world. In India, the Unlawful Activities Prevention Act has been used against journalists covering Kashmir, the Dalit rights movement, and agricultural protests. In Ethiopia, the Anti-Terrorism Proclamation was used against the journalists and bloggers of the Zone 9 collective. In Nigeria, social media bills propose criminalising "false information" in terms so vague that any critical reporting could qualify.',
      'International press freedom organisations document these cases — Reporters Without Borders, the Committee to Protect Journalists, Freedom of the Press Foundation. But documentation is not protection. Journalists in authoritarian and semi-authoritarian contexts operate with little more than their own courage and the solidarity of international networks.',
      'The long-term consequence of the war on the press is not just the silencing of individual voices. It is the distortion of public information environments: the replacement of reported fact with official narrative, the chilling effect that keeps other journalists from pursuing certain stories, and the collapse of the institutional knowledge that good journalism accumulates over time.'
    ),
  },
  {
    authorSlug: 'leila-hassan',
    slug: 'arabic-internet-the-missing-billion',
    published_at: '2025-12-28T11:00:00Z',
    likes_count: 314,
    cover_image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&h=500&fit=crop&q=80',
    tags: ['media-freedom', 'decoloniality'],
    title: 'The Arabic Internet: The Missing Billion',
    excerpt: 'Arabic is the fifth most spoken language in the world. Yet Arabic-language content accounts for less than 1% of the internet. This is not a technical problem.',
    bodyText: body(
      'Four hundred million native speakers. The official language of 22 countries. The liturgical language of 1.8 billion Muslims worldwide. By any measure, Arabic is one of the world\'s most significant languages. And yet Arabic-language content accounts for less than 1% of the total volume of the internet.',
      'This is sometimes described as a technology problem — the difficulty of right-to-left script rendering, the complexity of Arabic morphology for natural language processing, the historical absence of Arabic keyboard standards. These are real challenges. But they are not the primary explanation.',
      'The primary explanation is economic. Content is created where there is advertising money, and advertising money flows where platforms have the most users with the most purchasing power. Arabic-speaking markets, despite their size, have lower average purchasing power than North American and European markets. The platforms have optimised accordingly.',
      'The consequences are serious. Arabic speakers navigating the internet find that their language is underrepresented in search results, in knowledge resources, in educational content, and in AI language models that have been trained predominantly on English text. The internet, which was supposed to level the informational playing field, has reproduced and amplified existing inequalities.',
      'Some Arab governments have responded by funding state-controlled Arabic content — which tends to be propaganda rather than information. Independent Arabic digital media — Al-Monitor, Mada Masr, Inkyfada — do extraordinary work under difficult conditions. But they operate without the scale of funding or audience that their English-language counterparts enjoy. Building a genuinely plural Arabic internet requires investment, from Arab foundations, diaspora communities, and international donors, in independent Arabic-language journalism and knowledge production.'
    ),
  },
  {
    authorSlug: 'leila-hassan',
    slug: 'the-algorithm-decides-what-arabs-read',
    published_at: '2025-09-30T13:00:00Z',
    likes_count: 451,
    cover_image_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&h=500&fit=crop&q=80',
    tags: ['ai-governance', 'media-freedom'],
    title: 'The Algorithm Decides What Arabs Read',
    excerpt: 'Facebook\'s content moderation systems have systematically suppressed Palestinian voices, Arabic-language journalism, and MENA political commentary. The company calls it a bug. Critics call it a feature.',
    bodyText: body(
      'In May 2021, during the Israeli military operation in Gaza, a wave of reports emerged from Palestinian users, journalists, and activists: their posts were being removed, their accounts suspended, their stories demoted in feeds. Hashtags in support of Palestinians were being incorrectly flagged as terrorist content.',
      'Meta acknowledged some errors and blamed automated systems. But the pattern was not new. Human Rights Watch, the Centre for Democracy & Technology, and numerous Arabic-language media organisations have documented systematic problems with Meta\'s Arabic-language content moderation for years.',
      'The issue is structural. Meta\'s AI moderation systems are trained predominantly on English-language data. Arabic, a morphologically complex language with significant dialectal variation, is harder to process accurately. The result is higher false-positive rates for Arabic content — meaning more legitimate content is incorrectly removed.',
      'But there is a second problem: the political context in which these systems operate. Content moderation systems are not politically neutral. They must make judgments about what constitutes terrorism, incitement, and hate speech — judgments that are deeply contested, especially in conflict zones where the same actors are simultaneously described as terrorists by one government and as resistance fighters by another.',
      'Arabic-language users are not a small market segment. They are 400 million people whose access to information, whose ability to organise, and whose participation in global public discourse is mediated by systems that were not built with them in mind, are not accountable to them, and have not, so far, been made to explain their decisions.'
    ),
  },
  // Rafael Quispe
  {
    authorSlug: 'rafael-quispe',
    slug: 'lithium-the-new-silver',
    published_at: '2026-02-14T10:00:00Z',
    likes_count: 672,
    cover_image_url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=900&h=500&fit=crop&q=80',
    tags: ['indigenous-rights', 'climate-justice'],
    title: 'Lithium: The New Silver',
    excerpt: 'Bolivia\'s Salar de Uyuni holds the world\'s largest lithium reserves. The green energy transition needs it. The question is who will pay the price.',
    bodyText: body(
      'Potosí\'s Cerro Rico — the "Rich Mountain" — gave the Spanish Empire much of the silver that financed its global ambitions. Millions of indigenous and enslaved African workers died in its mines. The mountain gave its name to a word: "potosí," which in sixteenth-century Spanish meant "enormous wealth." Bolivia never became wealthy.',
      'Now the world\'s eyes are on the Salar de Uyuni, a vast salt flat in the Bolivian Altiplano that holds an estimated 21 million tonnes of lithium — the critical mineral for the batteries that will power the electric vehicle revolution. History, it seems, is preparing to repeat itself.',
      'The parallels are not lost on the Aymara and Quechua communities who live around the Salar. They have seen this before: an external power identifies a resource on their land, negotiates with a central government that does not represent them, and extracts wealth that flows outward while the community is left with environmental damage and broken promises.',
      'Bolivia\'s government, under the banner of nationalisation, insists this time will be different. The state lithium company YLB will oversee extraction. Revenues will fund social programmes. But "free, prior, and informed consent" — the international standard for engaging with indigenous communities on extractive projects — has been inconsistently applied. Community consultations have in some cases been procedural formalities rather than genuine negotiations.',
      'The green energy transition cannot be built on the same extractivist logic that caused the ecological crisis it is trying to solve. If the electric vehicles of the Global North are powered by lithium extracted from indigenous lands without consent, then the transition is not a moral breakthrough — it is a continuation of colonial resource flows dressed in ecological language.'
    ),
  },
  {
    authorSlug: 'rafael-quispe',
    slug: 'plurinational-state-an-experiment-in-progress',
    published_at: '2025-10-08T09:30:00Z',
    likes_count: 234,
    cover_image_url: 'https://images.unsplash.com/photo-1558618047-f4e90b68a8ab?w=900&h=500&fit=crop&q=80',
    tags: ['indigenous-rights', 'decoloniality'],
    title: 'The Plurinational State: An Experiment in Progress',
    excerpt: 'Bolivia\'s 2009 constitution recognised 36 indigenous nations and created a plurinational state. Fifteen years on, what has changed — and what hasn\'t?',
    bodyText: body(
      'When Evo Morales was elected President of Bolivia in 2005 — the first indigenous president in the country\'s history — the expectation was transformation. The 2009 constitution delivered, on paper at least, one of the most radical frameworks for indigenous rights anywhere in the world: recognition of 36 indigenous nations, rights of territorial autonomy, the principle of Buen Vivir (Sumak Qamaña in Aymara) as a constitutional goal, and the establishment of a plurinational state.',
      'The constitutional change was real and significant. Indigenous languages gained official status. Indigenous legal systems received formal recognition. The symbolic power of seeing an Aymara president performing ceremonies at Tiwanaku resonated across Latin America.',
      'But the structural transformation has been more limited. Indigenous territorial autonomies — the self-governing entities envisioned in the constitution — have moved slowly through complex bureaucratic processes. Fewer than a dozen have been formally recognised. Extractive industry activity continues on indigenous territories, often without adequate consultation.',
      'The tension is not unique to Bolivia. Every state that has tried to incorporate indigenous rights into a liberal constitutional framework has confronted the same contradiction: the liberal state\'s commitment to formal equality sits uncomfortably with the collective rights of peoples who precede and exceed the state.',
      'The plurinational experiment is neither a failure nor a success. It is an ongoing negotiation — between indigenous movements and a state that is simultaneously their champion and their adversary, between the vision of Buen Vivir and the economic logic of commodity export, between constitutional promise and administrative reality. That negotiation is some of the most important political work happening in the Americas.'
    ),
  },
  {
    authorSlug: 'rafael-quispe',
    slug: 'coca-is-not-cocaine',
    published_at: '2025-08-01T08:00:00Z',
    likes_count: 198,
    cover_image_url: 'https://images.unsplash.com/photo-1502136969935-8d8eef54d77b?w=900&h=500&fit=crop&q=80',
    tags: ['indigenous-rights', 'decoloniality'],
    title: 'Coca Is Not Cocaine',
    excerpt: 'The coca leaf has been sacred in the Andes for 8,000 years. The US "war on drugs" made it a political battleground. The consequences for indigenous communities have been devastating.',
    bodyText: body(
      'Coca has been cultivated in the Andes for at least 8,000 years. In Andean cosmology, it is a sacred plant: offered to Pacha Mama, used in ritual and ceremony, chewed daily by millions of people for its mild stimulant properties and altitude sickness relief. It is a cultural and agricultural practice as deeply woven into Andean life as wine is into European culture.',
      'Cocaine is a chemical extract of the coca leaf, produced through an industrial process that was invented in Europe in the nineteenth century. The two things are not the same. Chewing coca leaves produces no psychoactive effect equivalent to cocaine. But under the 1961 UN Single Convention on Narcotic Drugs, both are Schedule I controlled substances.',
      'The consequences of coca prohibition for indigenous communities in Bolivia, Peru, and Colombia have been severe. Forced eradication programmes — often carried out with US funding and training — have destroyed livelihoods, militarised rural areas, and displaced families from ancestral territories. They have also largely failed to reduce cocaine supply in North American and European markets.',
      'Evo Morales, a former coca grower, led Bolivia to legalise the consumption and production of coca for traditional uses, withdrawing from and then rejoining the UN drug convention with a specific reservation on coca. Peru retains a legal framework recognising traditional coca use. These are partial victories in a long struggle to assert the difference between a sacred plant and an industrial drug.',
      'The coca issue is a microcosm of a broader dynamic: the imposition of global governance frameworks designed by and for rich, powerful nations on communities with entirely different relationships to the things being governed. Until those communities have a genuine voice in shaping international rules, the rules will continue to cause harm.'
    ),
  },
  // Leila Hassan – one more
  {
    authorSlug: 'leila-hassan',
    slug: 'feminist-movements-across-mena',
    published_at: '2025-07-28T11:00:00Z',
    likes_count: 543,
    cover_image_url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=900&h=500&fit=crop&q=80',
    tags: ['feminism', 'media-freedom'],
    title: 'The Feminist Movements Rewriting MENA Politics',
    excerpt: 'From Iran\'s Woman Life Freedom uprising to Egypt\'s MeToo movement — women are reshaping political possibilities across the Middle East and North Africa.',
    bodyText: body(
      'In September 2022, Mahsa Amini died in the custody of Iran\'s morality police, detained for allegedly wearing her hijab incorrectly. Within days, protests had erupted across Iran under the slogan "Zan, Zendegi, Azadi" — Woman, Life, Freedom. Within weeks, the movement had become the most significant challenge to the Islamic Republic\'s authority since the 2009 Green Movement.',
      'The Woman Life Freedom uprising was, among other things, a feminist movement. Its demands centred on bodily autonomy: the right of women to determine how they dress, how they live, who they are. But it quickly articulated a broader vision of freedom — from religious coercion, from economic deprivation, from the particular form of authoritarianism that the Islamic Republic represents.',
      'Across the MENA region, feminist movements are charting new political territories. In Lebanon, feminist organisations have been among the most active in the post-2019 uprising, connecting economic demands to questions of gender-based violence and personal status law reform. In Morocco and Tunisia, campaigns against sexual harassment in public spaces have shifted public conversations about women\'s safety and dignity. In Egypt, the MeToo movement — despite intense government hostility — has created space for women to speak about harassment by powerful men.',
      'These movements operate in difficult conditions. Feminist activists face harassment, arrest, and social condemnation. The charge of serving foreign agendas is deployed against them as it is against any civil society that challenges the prevailing order.',
      'But feminist movements in MENA are not new. They have a long history of organising, writing, and building alternative institutions, often in dialogue with international feminist movements but always on their own terms. The Woman Life Freedom uprising did not come from nowhere — it emerged from decades of feminist organising that the international media had largely ignored until it became impossible to ignore.'
    ),
  },
  // Nkechi Osei – one more
  {
    authorSlug: 'nkechi-osei',
    slug: 'mother-tongue-matters',
    published_at: '2026-03-12T10:00:00Z',
    likes_count: 267,
    cover_image_url: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=900&h=500&fit=crop&q=80',
    tags: ['education', 'decoloniality'],
    title: 'Mother Tongue Matters',
    excerpt: 'Research consistently shows that children learn better in their first language. Yet most African education systems still use European languages as primary media of instruction.',
    bodyText: body(
      'The evidence is not ambiguous. Decades of educational research across contexts and cultures consistently finds that children learn foundational concepts faster, retain information better, and develop stronger critical thinking skills when taught in their mother tongue, at least in the early years of schooling.',
      'Yet across most of sub-Saharan Africa, children are taught in English, French, or Portuguese from their first day of school — languages that many of them do not speak at home and that their parents may not speak at all. The medium of instruction is a foreign language in the most literal sense: alien to the home, the community, and the culture in which learning is supposed to take root.',
      'The arguments against mother tongue instruction are primarily political and economic, not educational. "Africa has too many languages" — true, but several African countries have successfully developed multilingual education systems that use local languages in early years before transitioning to official languages. "English is necessary for economic mobility" — also true, but children can and do learn English more effectively once they have built strong foundational literacy in a language they understand.',
      'The real barrier is prestige. Decades of colonial education have created hierarchies in which European languages are associated with education, intelligence, and opportunity, while African languages are associated with tradition, rurality, and limited prospects. These are colonial constructions, but they are deeply internalised — by parents, teachers, and policymakers who want their children to have opportunities, and who have been taught that those opportunities require leaving African languages behind.',
      'Reversing this will require sustained investment in producing educational materials in African languages, training teachers to deliver high-quality instruction in those languages, and — most difficult of all — changing the social prestige calculus that makes African-language instruction feel like a second-best option. The research is clear. The will to act on it is what is lacking.'
    ),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Upsert tags
  console.log('▶ Upserting tags…')
  const { data: upsertedTags, error: tagError } = await (supabase as any)
    .from('tags')
    .upsert(tags, { onConflict: 'slug' })
    .select('id, slug')
  if (tagError) { console.error('  ✗ Tags error:', tagError.message); process.exit(1) }
  const tagMap: Record<string, string> = {}
  for (const t of upsertedTags) tagMap[t.slug] = t.id
  console.log(`  ✓ ${upsertedTags.length} tags ready`)

  // 2. Create / update authors
  console.log('\n▶ Seeding authors…')
  const authorIdMap: Record<string, string> = {}

  for (const author of authors) {
    // Try to create user (ignore error if already exists)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: author.email,
      password: author.password,
      email_confirm: true,
      user_metadata: { display_name: author.display_name },
    })

    let userId: string
    if (createErr) {
      if (createErr.message.includes('already been registered') || createErr.message.includes('already exists')) {
        const { data: list } = await supabase.auth.admin.listUsers()
        const existing = list?.users?.find((u: any) => u.email === author.email)
        if (!existing) { console.error(`  ✗ Cannot find user: ${author.email}`); continue }
        userId = existing.id
        console.log(`  ↩ Existing user: ${author.email} (${userId})`)
      } else {
        console.error(`  ✗ Create error (${author.email}):`, createErr.message); continue
      }
    } else {
      userId = created!.user!.id
      console.log(`  ✓ Created user: ${author.email} (${userId})`)
    }

    authorIdMap[author.slug] = userId

    const { error: profileErr } = await (supabase as any).from('profiles').upsert({
      id: userId,
      slug: author.slug,
      display_name: author.display_name,
      role: 'author',
      bio: author.bio,
      location: author.location,
      website: author.website,
      avatar_url: author.avatar_url,
      followers_count: author.followers_count,
    }, { onConflict: 'id' })

    if (profileErr) console.error(`  ✗ Profile error (${author.slug}):`, profileErr.message)
    else console.log(`  ✓ Profile updated: ${author.display_name}`)
  }

  // 3. Create articles
  console.log('\n▶ Seeding articles…')

  for (const article of articles) {
    const authorId = authorIdMap[article.authorSlug]
    if (!authorId) { console.error(`  ✗ Unknown author slug: ${article.authorSlug}`); continue }

    // Upsert content row
    const { data: content, error: contentErr } = await (supabase as any)
      .from('content')
      .upsert({
        author_id: authorId,
        type: 'article',
        slug: article.slug,
        source_locale: 'en',
        status: 'published',
        cover_image_url: article.cover_image_url,
        likes_count: article.likes_count,
        published_at: article.published_at,
      }, { onConflict: 'slug' })
      .select('id')
      .single()

    if (contentErr) { console.error(`  ✗ Content error (${article.slug}):`, contentErr.message); continue }
    const contentId = content.id

    // Upsert translation
    const { error: transErr } = await (supabase as any)
      .from('content_translations')
      .upsert({
        content_id: contentId,
        locale: 'en',
        title: article.title,
        excerpt: article.excerpt,
        body: article.bodyText,
      }, { onConflict: 'content_id,locale' })

    if (transErr) { console.error(`  ✗ Translation error (${article.slug}):`, transErr.message); continue }

    // Link tags
    if (article.tags?.length) {
      const tagRows = article.tags.map((s: string) => ({ content_id: contentId, tag_id: tagMap[s] })).filter((r: any) => r.tag_id)
      const { error: tagLinkErr } = await (supabase as any)
        .from('content_tags')
        .upsert(tagRows, { onConflict: 'content_id,tag_id' })
      if (tagLinkErr) console.error(`  ✗ Tag link error (${article.slug}):`, tagLinkErr.message)
    }

    console.log(`  ✓ Article: "${article.title}"`)
  }

  console.log('\n✅ Seed complete.')
}

main().catch((err) => { console.error(err); process.exit(1) })
