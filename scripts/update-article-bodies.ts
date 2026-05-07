/**
 * Enrich all articles with headings, blockquotes, bullet lists, and inline images.
 * Run with: npx tsx --env-file=.env.local scripts/update-article-bodies.ts
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Node builders ────────────────────────────────────────────────────────────

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const h2 = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] })
const h3 = (text: string) => ({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text }] })
const bq = (text: string) => ({ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const img = (src: string, alt: string) => ({ type: 'image', attrs: { src, alt, title: alt } })
const ul = (...items: string[]) => ({
  type: 'bulletList',
  content: items.map(item => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
  })),
})
const doc = (...nodes: object[]) => ({ type: 'doc', content: nodes })

// ─── Article bodies ───────────────────────────────────────────────────────────

const updates: Array<{ slug: string; body: object }> = [

  // ── Amara Diallo ─────────────────────────────────────────────────────────────

  {
    slug: 'who-owns-the-algorithm',
    body: doc(
      p('Every AI system encodes the values, assumptions, and blind spots of those who built it. When a hiring algorithm trained on decades of Silicon Valley employment data is deployed to filter job applications in Lagos or Nairobi, it doesn\'t just assess candidates — it replicates a specific vision of who is "employable."'),
      h2('The Quiet Colonialism of Code'),
      p('Unlike the explicit coercion of historical colonialism, algorithmic power operates through the appearance of neutrality and efficiency. "The system is just math," we are told. "The model simply reflects patterns in the data."'),
      bq('"Data is never neutral. It is a historical record, and history is written by those with power." — Amara Diallo'),
      p('When African governments and companies adopt AI systems built elsewhere — often under favourable commercial terms or donor-funded development programmes — they are also adopting the epistemological frameworks embedded in those systems.'),
      img('https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=900&h=500&fit=crop&q=80', 'Server infrastructure in a data centre'),
      h2('What Would African-Built AI Look Like?'),
      p('Not just AI trained on African languages or local datasets — but AI systems that reflect African philosophical frameworks, communal values, and ways of knowing. The Ubuntu principle — "I am because we are" — offers a fundamentally different basis for thinking about individual assessment than the liberal individualism underpinning most current AI ethics frameworks.'),
      h3('The Case for AI Sovereignty'),
      p('AI sovereignty is the right of communities to shape, interrogate, and where necessary reject the algorithmic systems that govern their lives. Without that sovereignty, digital transformation becomes just another vector for dependency.'),
      ul(
        'Data governance frameworks co-designed with communities',
        'Open-source models trained on African-language corpora',
        'Regulatory capacity built in African institutions, not outsourced to foreign consultants',
        'Public AI infrastructure owned by African states and civil society',
      ),
    ),
  },

  {
    slug: 'decolonizing-the-digital-library',
    body: doc(
      p('The digital knowledge commons was supposed to democratise access to information. In theory, anyone with an internet connection could now access the sum of human knowledge. In practice, the internet has faithfully reproduced — and in some ways amplified — the epistemic hierarchies of the analogue world.'),
      h2('The Wikipedia Problem'),
      p('Wikipedia, the world\'s largest encyclopedia, has more articles about fictional places in Tolkien\'s Middle-earth than it does about many entire African nations. The English-language Wikipedia is over fifty times larger than the Swahili Wikipedia, despite Swahili being spoken by over 200 million people.'),
      bq('"This is not merely a gap in coverage. It is a statement about whose knowledge matters, whose perspectives are worth documenting, whose languages are considered adequate vessels for truth."'),
      img('https://images.unsplash.com/photo-1532012197267-da84d127e765?w=900&h=500&fit=crop&q=80', 'Open books and knowledge'),
      h2('What Decolonising the Digital Library Requires'),
      p('Decolonizing the digital library requires more than translation. It requires a fundamental rethinking of what counts as a reliable source, what constitutes verifiable knowledge, and whose oral traditions, community histories, and embodied expertise deserve to be treated as legitimate epistemic contributions.'),
      h3('Projects Leading the Way'),
      ul(
        'The African Storybook Project — multilingual children\'s literature in 190+ African languages',
        'The Endangered Archives Programme at the British Library',
        'Community-led wikis in dozens of African languages',
        'The Internet Archive\'s digitisation partnerships with African libraries',
      ),
      p('They operate against the tide of a digital economy that rewards scale, velocity, and English-language content above all else. The work is urgent.'),
    ),
  },

  {
    slug: 'the-myth-of-the-leapfrog',
    body: doc(
      p('The leapfrog narrative has been one of the most seductive stories in development discourse. Africa, we are told, will bypass the industrial age, skipping dirty factories and copper phone lines to land directly in the clean, digital future. The mobile money revolution in Kenya was exhibit A.'),
      img('https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&h=500&fit=crop&q=80', 'Mobile phones and digital connectivity in Africa'),
      h2('The Sleight of Hand'),
      p('What Africa is leapfrogging is infrastructure — physical infrastructure that, despite its costs, also creates economic complexity, technical knowledge, and local industrial capacity. What Africa is not leapfrogging is dependency.'),
      bq('"The leapfrog metaphor suggests movement — a clean jump from one lily pad to the next. But if the next lily pad is owned by someone else, you are still in their pond."'),
      h2('Who Owns the Innovation?'),
      p('M-Pesa is celebrated as an African innovation. But Safaricom, the company behind it, is majority-owned by Vodafone and the Kenyan government. The transaction data flows through servers in Europe. The revenue model was designed by consultants trained in Western business schools.'),
      h3('What True Digital Sovereignty Requires'),
      ul(
        'Fibre optic cables owned by African institutions',
        'Data centres on African soil governed by African law',
        'Open-source software stacks developed with African needs in mind',
        'Tech education that produces architects of digital infrastructure, not just users',
      ),
    ),
  },

  // ── Valentina Morales ─────────────────────────────────────────────────────────

  {
    slug: 'the-amazon-is-not-empty',
    body: doc(
      p('When Brazilian agribusiness looks at the Amazon, it sees empty space waiting to be made productive. When conservation NGOs based in Washington and Geneva look at the Amazon, they sometimes see the same thing: a wilderness to be preserved, human-free, as a carbon sink for the world\'s emissions.'),
      img('https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=900&h=500&fit=crop&q=80', 'Amazon rainforest canopy'),
      h2('The Persistent Fiction of Terra Nullius'),
      p('Both visions erase the same people: the more than 400 indigenous nations who have lived in, managed, and maintained the Amazon for millennia. Terra nullius — the colonial legal fiction of empty land — has never died. It has just changed its vocabulary.'),
      bq('"Indigenous-managed territories have lower deforestation rates, higher biodiversity, and better ecological outcomes than both unprotected forests and many state-managed conservation areas. Indigenous peoples are the most effective forest guardians on Earth."'),
      h2('The Science Is Unequivocal'),
      p('Yet indigenous land rights in Brazil remain deeply contested. The "marco temporal" ruling, which sought to limit indigenous territorial claims to lands occupied before 1988, would have invalidated generations of occupation disrupted by violence and forced displacement.'),
      h3('Climate Finance Must Follow the Evidence'),
      ul(
        'Direct funding to indigenous-led conservation initiatives',
        'Free, prior, and informed consent as a binding requirement for climate projects',
        'Legal recognition of customary land tenure in international climate agreements',
        'Zero deforestation supply chain standards with indigenous oversight mechanisms',
      ),
      p('Funding that flows to governments and international NGOs while bypassing indigenous land defenders is not just inefficient — it is a continuation of the colonial patterns that created the climate crisis in the first place.'),
    ),
  },

  {
    slug: 'water-is-not-a-commodity',
    body: doc(
      p('In the high Andes of Bolivia and Peru, water is not just a resource. It is a living entity — Mama Cocha in the Quechua cosmology — with its own rights, its own rhythms, and its own claims on human behaviour.'),
      img('https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&h=500&fit=crop&q=80', 'Andean glacier and watershed'),
      h2('Commodification vs. the Commons'),
      p('In 2010, the United Nations declared access to clean water and sanitation a human right. In the same decade, global water futures began trading on the Chicago Mercantile Exchange. These two facts are not unrelated.'),
      bq('"Water. Air. Seed. These are not commodities. They are commons, and commons require governance frameworks that centre communities, not markets."'),
      h2('Water Defenders Under Threat'),
      p('Water defenders are among the most persecuted environmental activists in the world. In Honduras, Berta Cáceres was murdered for opposing a dam on the sacred Gualcarque River. In Chile, the Mapuche people continue to fight against the water privatisation model enshrined in Pinochet\'s 1981 Water Code.'),
      h3('From the Andes to the Nile'),
      ul(
        'Ethiopia\'s Grand Renaissance Dam and downstream tensions with Egypt and Sudan',
        'Bolivia\'s Cochabamba Water War — the template for water rights movements worldwide',
        'India\'s Inter-State River Water Disputes Tribunal and its backlog of unresolved cases',
        'The Ogallala Aquifer depletion and what it means for global food supply',
      ),
    ),
  },

  {
    slug: 'buen-vivir-beyond-the-slogan',
    body: doc(
      p('When Ecuador became the first country in the world to enshrine the rights of nature in its constitution in 2008, it felt like a rupture in the dominant order. Pacha Mama — Mother Earth — was no longer an object to be exploited but a subject with legal standing.'),
      img('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&h=500&fit=crop&q=80', 'Andean mountains and traditional community'),
      h2('What Happened After the Headlines?'),
      p('By 2025, Ecuador has opened new oil concessions in the Amazon, including within protected areas. Bolivia\'s lithium extraction is proceeding with minimal free, prior, and informed consent from affected Aymara and Quechua communities.'),
      bq('"Buen Vivir as a lived practice requires not just legal recognition but alternative economic models, debt relief, technology transfer, and a global economic order that doesn\'t price developing nations into extractivism."'),
      h2('The Structural Limits of Constitutional Language'),
      p('Constitutional language, however radical, cannot by itself overcome the structural dependencies of an economy built on commodity exports.'),
      h3('The Path Forward'),
      ul(
        'Debt cancellation conditioned on genuine ecological transitions',
        'Technology transfer provisions for renewable energy development',
        'International trade rules that stop penalising countries for leaving fossil fuels in the ground',
        'Community-controlled benefit sharing from any extractive activity',
      ),
    ),
  },

  // ── Siddharth Rao ─────────────────────────────────────────────────────────────

  {
    slug: 'ai-governance-without-the-south',
    body: doc(
      p('The global governance of artificial intelligence is being shaped by a remarkably narrow set of actors. The EU AI Act, the G7 Hiroshima AI Process, the OECD AI Principles — all driven by rich, technologically advanced nations with large domestic AI industries.'),
      h2('Who Is Missing from the Table?'),
      p('The Global South is largely absent from these conversations, except as an afterthought: a market to be entered, a population to be served, or a source of cheap data labelling labour. The assumption is that governance frameworks developed in Washington, Brussels, and Tokyo will be universal.'),
      img('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&h=500&fit=crop&q=80', 'Global technology governance and networks'),
      bq('"If the Global South is not at the table, it will be on the menu. AI governance architecture is being built now, and path dependency is strong. The frameworks written today will shape the technology for decades."'),
      h2('The Stakes of Getting It Wrong'),
      p('A content moderation algorithm calibrated for English-language text will behave unpredictably in Tamil, Yoruba, or Bahasa. A facial recognition system trained predominantly on European faces will have higher error rates for darker-skinned individuals — with consequences ranging from inconvenient to deadly when deployed by police forces.'),
      h3('Southern Nations Are Not Passive Recipients'),
      ul(
        'India is building its own large language models under the BharatGen initiative',
        'Nigeria\'s NITDA is developing an AI policy framework centred on local development',
        'Indonesia is investing in national AI infrastructure under its 2020–2045 national strategy',
        'Rwanda is positioning itself as a hub for AI research and regulation in East Africa',
      ),
      h2('What Needs to Change'),
      p('The urgency is real. Permanent representation of Global South nations in AI standard-setting bodies is not a concession — it is a precondition for governance frameworks that actually work.'),
    ),
  },

  {
    slug: 'the-myth-of-neutral-data',
    body: doc(
      p('"The data speaks for itself." This is perhaps the most dangerous sentence in contemporary public discourse — a conjuring trick that makes the social process of data collection and analysis disappear, leaving only the apparent objectivity of numbers.'),
      h2('Data Is Made, Not Found'),
      p('But data does not speak for itself. Data is made. It is made by people who decide what to count, how to count it, and what categories to use. These decisions are not neutral — they reflect the priorities, assumptions, and blind spots of those doing the counting.'),
      img('https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&h=500&fit=crop&q=80', 'Data visualisation and statistics'),
      h2('The Feedback Loop of Criminal Justice Data'),
      bq('"Police arrest statistics appear to be objective measurements of criminal behaviour. But they measure something different: police behaviour. Police patrol more heavily in poor, racially marginalised neighbourhoods, so those neighbourhoods produce more arrest data, which in turn justifies more policing."'),
      h3('The Medical Data Blind Spot'),
      p('For most of the twentieth century, clinical trials routinely excluded women, on the grounds that hormonal variation introduced too many variables. The drugs that resulted were approved based on how they worked in male bodies. Women, the majority of pharmaceutical consumers, were an afterthought.'),
      h2('Data Sovereignty as Political Power'),
      ul(
        'Community data trusts — local governance over how data about a community is used',
        'Algorithmic impact assessments before public sector AI deployment',
        'Right to explanation for automated decisions affecting individuals',
        'Mandatory diversity audits for training datasets used in high-stakes AI',
      ),
    ),
  },

  {
    slug: 'when-your-government-buys-spyware',
    body: doc(
      p('In July 2021, a consortium of investigative journalists published the Pegasus Project: an investigation into the use of NSO Group\'s Pegasus spyware against journalists, human rights activists, lawyers, and political figures across the world.'),
      img('https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=900&h=500&fit=crop&q=80', 'Digital surveillance and cybersecurity'),
      h2('The Targets Were Not Criminals'),
      p('They were people doing the work that a free society requires: holding power to account, defending the vulnerable, asking inconvenient questions. The target list included heads of state, opposition politicians, and journalists investigating government corruption.'),
      bq('"This is not a story about authoritarian regimes and their surveillance apparatus. It is a story about the slow erosion of democratic norms through the commercially available tools of repression."'),
      h2('The Legal Grey Zone'),
      p('The surveillance technology industry operates in a legal grey zone. Companies like NSO Group, Hacking Team, and Intellexa are registered in democratic countries — Israel, Italy, Greece — and export their products subject to licensing regimes that are, in practice, largely unenforced.'),
      h3('India and the Pegasus Trail'),
      p('India appeared repeatedly in the Pegasus Project data. The government denied using the spyware. Several of the identified targets were journalists who had covered stories embarrassing to the ruling party.'),
      h2('Creating Costs for Surveillance'),
      ul(
        'Mandatory judicial authorisation for all government use of commercial spyware',
        'Export controls with genuine enforcement mechanisms',
        'Criminal liability for executives of companies that knowingly sell to abusive regimes',
        'International treaty prohibiting use of surveillance tools against journalists and civil society',
      ),
    ),
  },

  // ── Nkechi Osei ──────────────────────────────────────────────────────────────

  {
    slug: 'learning-while-black-in-british-schools',
    body: doc(
      p('In British schools, Black Caribbean pupils are more than twice as likely to receive a fixed-period exclusion as white British pupils. They are significantly underrepresented in gifted programmes and overrepresented in alternative provision. These statistics have persisted, with minor variation, for decades.'),
      h2('Not Accidental: A System Built for Others'),
      p('They reflect a school system that was built to produce certain kinds of citizens — broadly, obedient workers and loyal subjects of the British Empire — and that was never fundamentally restructured when the empire ended and the demographics changed.'),
      img('https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=900&h=500&fit=crop&q=80', 'Children in a classroom'),
      h2('The Curriculum Problem'),
      bq('"History lessons in most British schools still centre the British perspective on empire: the trade routes, the administrative achievements, the \'civilising mission.\' The enslaved people, the colonised populations, and the long-term consequences of extraction rarely feature except as backdrop."'),
      h3('Beyond Curriculum: Structural Racism in Schools'),
      p('The problem runs deeper than curriculum. It is in the unexamined assumptions of teachers who see Black boys as threats before they see them as learners. It is in the disciplinary systems that criminalise behaviours in Black children that are overlooked in white children.'),
      h2('What Decolonising Education Requires'),
      ul(
        'Mandatory anti-racism training for all teachers and school leaders',
        'Curriculum reform that accurately represents global histories and contributions',
        'Diversification of school leadership pipelines with targets and accountability',
        'Independent review of exclusion and referral processes for racial disparity',
        'Investment in schools serving predominantly Black communities',
      ),
    ),
  },

  {
    slug: 'pan-african-futures-reimagining-education',
    body: doc(
      p('Before colonisation disrupted African educational systems, the continent had its own rich traditions of learning: the universities of Timbuktu, the apprenticeship systems of West African craft guilds, the oral knowledge traditions of the griots, the astronomical knowledge of the Dogon.'),
      img('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&h=500&fit=crop&q=80', 'Students learning together in Africa'),
      h2('The Colonial Inheritance'),
      p('Contemporary African education largely ignores this inheritance. The curriculum frameworks adopted by most African nations after independence were modelled on the systems of their former colonisers. The result: African children who know more about the French Revolution than about the Manden Charter, more about Shakespeare than about Chinua Achebe.'),
      bq('"Education systems that treat Western knowledge as universal and African knowledge as particular produce graduates who are oriented toward Europe and North America — geographically, economically, and intellectually."'),
      h2('The Pan-African Futures Learning Network'),
      p('The Network is attempting something different: a curriculum framework grounded in African epistemologies, African histories, and African futures. Not a rejection of global knowledge — but an insistence that African children see themselves as the inheritors of a rich intellectual tradition.'),
      h3('What This Looks Like in Practice'),
      ul(
        'Primary history education starting with African civilisations and their global influence',
        'Literature curricula centring African and diaspora writers alongside global canon',
        'Mathematics and science contextualised within African agricultural, architectural, and astronomical traditions',
        'Civic education grounded in African political philosophy, including Ubuntu and Ujamaa',
      ),
    ),
  },

  {
    slug: 'who-teaches-the-teachers',
    body: doc(
      p('Teacher training colleges across sub-Saharan Africa follow remarkably similar patterns. The pedagogical models they teach — lesson planning formats, assessment frameworks, classroom management techniques — trace their lineage back to British, French, or American educational traditions.'),
      h2('The Development Aid Pipeline'),
      p('This is not a conspiracy. It is the accumulated consequence of decades of development aid, international exchange programmes, and the absence of strong African educational research institutions capable of generating alternative models.'),
      img('https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&h=500&fit=crop&q=80', 'Teacher training and professional development'),
      bq('"Teachers trained in Western pedagogical traditions bring those traditions\' assumptions into classrooms where they may not fit. The idea of the individual learner competing against peers for grades sits uneasily in societies with strong communal learning traditions."'),
      h2('African Universities Leading the Change'),
      ul(
        'University of Nairobi\'s Centre for Educational Research',
        'University of Cape Town\'s School of Education and the African Minds publishing initiative',
        'University of Ghana\'s Institute for Educational Research',
        'Kenyatta University\'s Faculty of Education community partnerships programme',
      ),
      h3('The Political Will Problem'),
      p('Decolonising teacher training means investing in African educational research, taking seriously what teachers and students report about what works in their classrooms, and resisting the pressure to adopt internationally fashionable pedagogical models simply because they are internationally fashionable.'),
    ),
  },

  // ── Leila Hassan ─────────────────────────────────────────────────────────────

  {
    slug: 'the-surveillance-state-comes-for-the-press',
    body: doc(
      p('The Egyptian journalist Khaled Dawoud spent years as a spokesman for a secular political party, as a broadcaster, and as a journalist covering regional affairs. In 2019, he was arrested. The charge: spreading false information and membership of a terrorist organisation.'),
      img('https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&h=500&fit=crop&q=80', 'Press freedom and journalism'),
      h2('The Pattern Across the Arab World'),
      p('Across the Arab world, "anti-terrorism" and "cybercrime" laws passed in the wake of the 2011 uprisings have been systematically deployed against journalists, bloggers, and social media users who criticise governments. The laws are broad enough to criminalise almost any critical reporting.'),
      bq('"The long-term consequence of the war on the press is not just the silencing of individual voices. It is the distortion of public information environments — the replacement of reported fact with official narrative."'),
      h2('A Global Pattern'),
      ul(
        'India: the Unlawful Activities Prevention Act used against journalists covering Kashmir and agricultural protests',
        'Ethiopia: the Anti-Terrorism Proclamation used against the Zone 9 blogger collective',
        'Nigeria: social media bills proposing to criminalise "false information" in dangerously vague terms',
        'Egypt: cybercrime law used against women who shared videos documenting harassment',
      ),
      h3('What Protection Looks Like'),
      p('International press freedom organisations — Reporters Without Borders, the Committee to Protect Journalists, Freedom of the Press Foundation — document these cases. But documentation is not protection. Structural change requires that democracies stop selling surveillance tools to autocracies and stop looking the other way when allies jail journalists.'),
    ),
  },

  {
    slug: 'arabic-internet-the-missing-billion',
    body: doc(
      p('Four hundred million native speakers. The official language of 22 countries. The liturgical language of 1.8 billion Muslims worldwide. By any measure, Arabic is one of the world\'s most significant languages. And yet Arabic-language content accounts for less than 1% of the total volume of the internet.'),
      img('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&h=500&fit=crop&q=80', 'Digital connectivity and the Arabic web'),
      h2('Not a Technical Problem'),
      p('This is sometimes described as a technology problem — the difficulty of right-to-left script rendering, the complexity of Arabic morphology for natural language processing. These are real challenges. But they are not the primary explanation.'),
      bq('"The primary explanation is economic. Content is created where there is advertising money, and advertising money flows where platforms have the most users with the most purchasing power. Arabic-speaking markets have been optimised accordingly."'),
      h2('The Consequences'),
      ul(
        'Arabic speakers find their language underrepresented in search results and knowledge resources',
        'AI language models trained predominantly on English perform poorly in Arabic',
        'Independent Arabic digital journalism is chronically underfunded',
        'State-controlled Arabic content fills the vacuum with propaganda rather than information',
      ),
      h3('Building a Plural Arabic Internet'),
      p('Some of the most important journalism in the Arab world today is produced by small, independent outlets — Mada Masr in Egypt, Inkyfada in Tunisia, Daraj Media in Lebanon. They operate without the scale of funding their English-language counterparts enjoy. That must change.'),
    ),
  },

  {
    slug: 'the-algorithm-decides-what-arabs-read',
    body: doc(
      p('In May 2021, during the Israeli military operation in Gaza, a wave of reports emerged from Palestinian users, journalists, and activists: their posts were being removed, their accounts suspended, their stories demoted in feeds. Hashtags in support of Palestinians were being incorrectly flagged as terrorist content.'),
      img('https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&h=500&fit=crop&q=80', 'Social media and content moderation'),
      h2('A Structural Problem'),
      p('Meta acknowledged some errors and blamed automated systems. But the pattern was not new. Human Rights Watch, the Centre for Democracy & Technology, and numerous Arabic-language media organisations have documented systematic problems with Meta\'s Arabic-language content moderation for years.'),
      bq('"Content moderation systems are not politically neutral. They must make judgments about what constitutes terrorism, incitement, and hate speech — judgments that are deeply contested, especially in conflict zones."'),
      h2('The Language Gap'),
      p('Meta\'s AI moderation systems are trained predominantly on English-language data. Arabic, a morphologically complex language with significant dialectal variation, is harder to process accurately. The result is higher false-positive rates for Arabic content — meaning more legitimate content is incorrectly removed.'),
      h3('What Accountability Requires'),
      ul(
        'Mandatory Arabic-language content moderation teams with regional expertise',
        'Public transparency reports broken down by language and region',
        'Independent appeals mechanism accessible in Arabic',
        'Algorithmic impact assessments for content moderation in conflict-affected regions',
      ),
    ),
  },

  {
    slug: 'feminist-movements-across-mena',
    body: doc(
      p('In September 2022, Mahsa Amini died in the custody of Iran\'s morality police, detained for allegedly wearing her hijab incorrectly. Within days, protests had erupted across Iran under the slogan "Zan, Zendegi, Azadi" — Woman, Life, Freedom.'),
      img('https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=900&h=500&fit=crop&q=80', 'Women\'s rights and feminist movements'),
      h2('Woman Life Freedom: A Feminist Uprising'),
      p('The Woman Life Freedom uprising was, among other things, a feminist movement. Its demands centred on bodily autonomy: the right of women to determine how they dress, how they live, who they are. But it quickly articulated a broader vision of freedom — from religious coercion, from economic deprivation, from the particular form of authoritarianism that the Islamic Republic represents.'),
      bq('"Feminist movements in MENA are not new. They have a long history of organising, writing, and building alternative institutions, often in dialogue with international feminist movements but always on their own terms."'),
      h2('Movements Across the Region'),
      ul(
        'Lebanon: feminist organisations connecting economic demands to gender-based violence and personal status law reform',
        'Morocco and Tunisia: campaigns against sexual harassment shifting public conversations about women\'s safety',
        'Egypt: the MeToo movement creating space despite intense government hostility',
        'Sudan: women playing leading roles in the 2019 uprising against Omar al-Bashir',
      ),
      h3('The Charge of Foreign Agendas'),
      p('The charge of serving foreign agendas is deployed against feminist activists as it is against any civil society that challenges the prevailing order. But feminist movements in MENA have emerged from decades of organising that the international media had largely ignored — until it became impossible to ignore.'),
    ),
  },

  // ── Rafael Quispe ─────────────────────────────────────────────────────────────

  {
    slug: 'lithium-the-new-silver',
    body: doc(
      p('Potosí\'s Cerro Rico — the "Rich Mountain" — gave the Spanish Empire much of the silver that financed its global ambitions. Millions of indigenous and enslaved African workers died in its mines. Bolivia never became wealthy.'),
      img('https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=900&h=500&fit=crop&q=80', 'Salar de Uyuni salt flats, Bolivia'),
      h2('The Salar de Uyuni: History Repeating'),
      p('Now the world\'s eyes are on the Salar de Uyuni, a vast salt flat in the Bolivian Altiplano that holds an estimated 21 million tonnes of lithium — the critical mineral for the batteries that will power the electric vehicle revolution.'),
      bq('"The parallels are not lost on the Aymara and Quechua communities who live around the Salar. They have seen this before: an external power identifies a resource on their land, negotiates with a central government that does not represent them, and extracts wealth that flows outward."'),
      h2('The Green Transition\'s Dirty Secret'),
      p('Bolivia\'s government insists this time will be different under state ownership. But "free, prior, and informed consent" — the international standard for engaging with indigenous communities on extractive projects — has been inconsistently applied. Community consultations have in some cases been procedural formalities rather than genuine negotiations.'),
      h3('The Critical Minerals Map'),
      ul(
        'Lithium: Bolivia, Chile, Argentina (the "Lithium Triangle") and increasingly the DRC',
        'Cobalt: 70% of global supply comes from the DRC, where child labour remains endemic',
        'Nickel: Indonesia is rapidly expanding extraction with significant deforestation',
        'Rare earths: China dominates processing, creating new geopolitical dependencies',
      ),
      p('The green energy transition cannot be built on the same extractivist logic that caused the ecological crisis it is trying to solve.'),
    ),
  },

  {
    slug: 'plurinational-state-an-experiment-in-progress',
    body: doc(
      p('When Evo Morales was elected President of Bolivia in 2005 — the first indigenous president in the country\'s history — the expectation was transformation. The 2009 constitution delivered, on paper, one of the most radical frameworks for indigenous rights anywhere in the world.'),
      img('https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=900&h=500&fit=crop&q=80', 'Bolivian Altiplano and indigenous communities'),
      h2('What the Constitution Promised'),
      ul(
        'Recognition of 36 indigenous nations with rights to territorial autonomy',
        'Buen Vivir (Sumak Qamaña) as a constitutional goal',
        'Indigenous legal systems receiving formal recognition alongside state law',
        'Official status for 36 indigenous languages alongside Spanish',
      ),
      bq('"The constitutional change was real and significant. But the structural transformation has been more limited. Indigenous territorial autonomies have moved slowly through complex bureaucratic processes. Fewer than a dozen have been formally recognised."'),
      h2('The Fundamental Contradiction'),
      p('Every state that has tried to incorporate indigenous rights into a liberal constitutional framework has confronted the same contradiction: the liberal state\'s commitment to formal equality sits uncomfortably with the collective rights of peoples who precede and exceed the state.'),
      h3('Neither Failure nor Success'),
      p('The plurinational experiment is an ongoing negotiation — between indigenous movements and a state that is simultaneously their champion and their adversary, between the vision of Buen Vivir and the economic logic of commodity export. That negotiation is some of the most important political work happening in the Americas.'),
    ),
  },

  {
    slug: 'coca-is-not-cocaine',
    body: doc(
      p('Coca has been cultivated in the Andes for at least 8,000 years. In Andean cosmology, it is a sacred plant: offered to Pacha Mama, used in ritual and ceremony, chewed daily by millions of people for its mild stimulant properties and altitude sickness relief.'),
      img('https://images.unsplash.com/photo-1502136969935-8d8eef54d77b?w=900&h=500&fit=crop&q=80', 'Andean agricultural landscape'),
      h2('Two Things That Are Not the Same'),
      p('Cocaine is a chemical extract of the coca leaf, produced through an industrial process invented in Europe in the nineteenth century. The two things are not the same. Chewing coca leaves produces no psychoactive effect equivalent to cocaine. But under the 1961 UN Single Convention on Narcotic Drugs, both are Schedule I controlled substances.'),
      bq('"Forced eradication programmes — often carried out with US funding and training — have destroyed livelihoods, militarised rural areas, and displaced families from ancestral territories. They have also largely failed to reduce cocaine supply in North American and European markets."'),
      h2('A Partial Victory'),
      p('Evo Morales, a former coca grower, led Bolivia to legalise the consumption and production of coca for traditional uses, withdrawing from and then rejoining the UN drug convention with a specific reservation on coca. Peru retains a legal framework recognising traditional coca use.'),
      h3('The Broader Principle'),
      ul(
        'Global drug policy has consistently ignored or punished communities closest to the plants being regulated',
        'The "war on drugs" has been disproportionately waged against producing countries, not consuming ones',
        'Decriminalisation of traditional plant-based practices must be separated from industrial drug production',
        'Indigenous communities must have standing in international drug policy negotiations',
      ),
    ),
  },

  // ── Nkechi Osei (last) ────────────────────────────────────────────────────────

  {
    slug: 'mother-tongue-matters',
    body: doc(
      p('The evidence is not ambiguous. Decades of educational research consistently finds that children learn foundational concepts faster, retain information better, and develop stronger critical thinking skills when taught in their mother tongue, at least in the early years of schooling.'),
      img('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=900&h=500&fit=crop&q=80', 'Children learning to read in their first language'),
      h2('Yet Most African Children Are Taught in Foreign Languages'),
      p('Across most of sub-Saharan Africa, children are taught in English, French, or Portuguese from their first day of school — languages that many of them do not speak at home and that their parents may not speak at all.'),
      bq('"The real barrier is prestige. Decades of colonial education have created hierarchies in which European languages are associated with education and opportunity, while African languages are associated with tradition and limited prospects. These are colonial constructions — but they are deeply internalised."'),
      h2('The Evidence for Mother Tongue Instruction'),
      ul(
        'UNICEF: children taught in mother tongue for first 6 years show significantly higher secondary school completion rates',
        'South Africa\'s Language in Education Policy: schools using home languages as medium of instruction show improved maths scores',
        'Ethiopia\'s regional language education policy: strongly correlated with reduced dropout rates in primary school',
        'Papua New Guinea\'s Tok Ples Pre-school programme: children enter formal schooling better prepared across all subjects',
      ),
      h3('What Needs to Happen'),
      p('Reversing this requires sustained investment in producing educational materials in African languages, training teachers to deliver high-quality instruction, and — most difficult of all — changing the social prestige calculus that makes African-language instruction feel like a second-best option. The research is clear. The will to act on it is what is lacking.'),
    ),
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`▶ Updating ${updates.length} article bodies…\n`)
  let success = 0
  for (const update of updates) {
    const { data: content, error: findErr } = await (sb as any)
      .from('content')
      .select('id')
      .eq('slug', update.slug)
      .single()

    if (findErr || !content) { console.error(`  ✗ Not found: ${update.slug}`); continue }

    const { error } = await (sb as any)
      .from('content_translations')
      .update({ body: update.body })
      .eq('content_id', content.id)
      .eq('locale', 'en')

    if (error) { console.error(`  ✗ ${update.slug}:`, error.message) }
    else { console.log(`  ✓ ${update.slug}`); success++ }
  }
  console.log(`\n✅ Updated ${success}/${updates.length} articles.`)
}

main().catch(err => { console.error(err); process.exit(1) })
