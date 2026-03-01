export interface AICharacter {
  shortName: string
  fullName: string
  phraseDescription: string
  longDescription: string
  completeBioParagraphs?: string[]
  slug: string
  thumbnailSrc: string
  bioImageSrc: string
}

export const OPPONENT_THUMBNAIL_FALLBACK_SRC = '/assets/opponents/placeholder-thumb.svg'
export const OPPONENT_BIO_FALLBACK_SRC = '/assets/opponents/placeholder-bio.svg'

export const AI_CHARACTERS: AICharacter[] = [
  {
    shortName: 'Odys',
    fullName: 'Odysseus',
    phraseDescription: 'Heroic leader',
    longDescription:
      'Odysseus is the cunning king of Ithaca who endures a 20-year journey home after the Trojan War, facing gods and monsters. His cleverness shines in tricks like the Trojan Horse and escaping Cyclops. Despite temptations, his loyalty to family drives him forward.',
    completeBioParagraphs: [
      'In the shadowed halls of ancient legend, Odysseus emerges as the king of Ithaca, a man whose wit sharpened by war would carve his path through tempests and terrors. Fresh from the fall of Troy, where his ingenious Trojan Horse breached the unbreakable walls after a grueling decade of siege, he set sail for home—only to be thrust into a 20-year odyssey of divine wrath and mortal peril. Battered by Poseidon\'s storms for blinding the cyclops Polyphemus, Odysseus washed ashore on distant isles, each a trial of his unyielding spirit.',
      'He outsmarted the one-eyed giant Polyphemus in a cavern of horrors, declaring himself "Nobody" so the beast\'s cries for aid fell on deaf ears, escaping with his men but earning the sea god\'s eternal curse. On the enchanted shores of Aeaea, he resisted Circe\'s spells with Hermes\' magical herb, turning her from foe to fleeting ally who revealed prophecies of his fate. Venturing even into the gloomy underworld, he sought counsel from the blind seer Tiresias, learning how to appease the gods and reclaim his throne from usurpers.',
      'Through it all, Odysseus rejected the allure of immortality—from Calypso\'s loving imprisonment on Ogygia to the Lotus-Eaters\' blissful forgetfulness—driven by fierce loyalty to his wife Penelope and son Telemachus. Upon his triumphant return, disguised by Athena\'s grace, he slaughtered the 108 suitors ravaging his palace in a blood-soaked reckoning. Odysseus stands as the archetype of resilient intellect, where cleverness conquers brute force and the call of home overcomes every temptation.',
      'In Dice Odyssey, Odys embodies this epic tenacity as your formidable rival captain, weaving through the galaxy with masterful blue dice maneuvers for swift advances, all while unleashing calculated red sabotage to thwart your quest—dare to challenge him, or watch him seize the MacGuffins in a narrative twist of cosmic proportions!',
    ],
    slug: 'odys',
    thumbnailSrc: '/assets/opponents/odys-thumb.png',
    bioImageSrc: '/assets/opponents/odys-bio.png',
  },
  {
    shortName: 'Athena',
    fullName: 'Athena',
    phraseDescription: 'Wise patron',
    longDescription:
      'Athena, goddess of wisdom and strategy, aids Odysseus as his divine protector throughout his trials. She intervenes with clever disguises and guidance, like helping him reclaim his throne. Her favor contrasts with Poseidon\'s wrath, symbolizing intellect over brute force.',
    completeBioParagraphs: [
      'Amid the eternal councils of Olympus, Athena springs forth as the embodiment of strategic brilliance and unyielding wisdom, her birth a thunderous miracle from Zeus\'s brow, armored and ready to champion the clever over the cruel. As goddess of intellect and warfare, she weaves her influence through the mortal realm like a subtle thread in fate\'s tapestry, favoring heroes who wield minds as sharp as spears. In Odysseus\' storm-tossed saga, Athena stands as his luminous guide, illuminating paths through darkness with divine cunning, from the ruins of Troy to the shadowed shores of Ithaca.',
      'She whispers inspirations that birth the Trojan Horse, turning a decade of stalemate into triumphant conquest, her favor a shield against the gods\' caprice. When Poseidon\'s tempests rage and monsters loom, Athena cloaks Odysseus in beggar\'s rags or warrior\'s resolve, ensuring his wits prevail over brute force. Her interventions—persuading Zeus to command Calypso\'s release or aiding the slaughter of suitors—underscore a patronage born of admiration for mortal resilience.',
      'Athena\'s essence is the quiet power of foresight, where strategy blooms into victory and divine grace rewards the resourceful. In Dice Odyssey, Athen manifests this ethereal guidance as your shrewd rival captain, allocating greens with oracle-like precision to unearth MacGuffins while deflecting sabotage through masterful foresight—challenge her intellect, or find your galactic path obscured by her strategic veil!',
    ],
    slug: 'athena',
    thumbnailSrc: '/assets/opponents/athena-thumb.png',
    bioImageSrc: '/assets/opponents/athena-bio.png',
  },
  {
    shortName: 'Posey',
    fullName: 'Poseidon',
    phraseDescription: 'Stormy antagonist',
    longDescription:
      'Poseidon, god of the sea, relentlessly punishes Odysseus for blinding his son Polyphemus, sending storms and obstacles. His rage extends the hero\'s voyage, showcasing divine vendettas. Despite this, Odysseus survives through wit and other gods\' help.',
    completeBioParagraphs: [
      'From the churning depths of the boundless sea, Poseidon rises as the indomitable god of oceans, earthquakes, and untamed horses, his trident a symbol of raw power that commands the waves and shakes the earth\'s foundations. Brother to Zeus and Hades, he rules the watery realms with a temper as volatile as a hurricane, his domain a vast expanse where mortal sailors tremble at his whims. In Odysseus\' harrowing voyage, Poseidon emerges as the relentless foe, his wrath ignited by the hero\'s daring escape from the cyclops Polyphemus, unleashing tempests that prolong the wanderer\'s exile far from Ithaca\'s shores.',
      'He hurls colossal storms to shatter Odysseus\' fleet, drowning companions and stranding the king on distant isles, a divine vendetta that echoes through the epic like thunder across the horizon. Yet even in his fury, Poseidon\'s power is checked by Zeus\'s decrees, forcing him to relent only when fate demands the hero\'s return. His encounters—from cursing the Phaeacians who aid Odysseus to stirring whirlpools like Charybdis—paint him as the embodiment of nature\'s unforgiving might.',
      'Poseidon\'s essence roils with the sea\'s dual nature: creator of horses and harbors, yet destroyer in his rage, where mortal hubris invites catastrophic reprisal. In Dice Odyssey, Posei unleashes this tempestuous fury as your vengeful rival captain, channeling reds to sabotage your progress with storm-like skips while riding blues through the galaxy\'s chaos—navigate his wrath, or watch your quest sink into the void!',
    ],
    slug: 'posey',
    thumbnailSrc: '/assets/opponents/posey-thumb.png',
    bioImageSrc: '/assets/opponents/posey-bio.png',
  },
  {
    shortName: 'Zeus',
    fullName: 'Zeus',
    phraseDescription: 'King of Gods',
    longDescription:
      'Atop the thunderous heights of Mount Olympus, Zeus reigns supreme as the almighty sovereign of the divine pantheon, his lightning bolts forging order from chaos and his decrees binding gods and mortals alike in the intricate web of fate.',
    completeBioParagraphs: [
      'Atop the thunderous heights of Mount Olympus, Zeus reigns supreme as the almighty sovereign of the divine pantheon, his lightning bolts forging order from chaos and his decrees binding gods and mortals alike in the intricate web of fate. Born from the Titan Cronus\'s tyranny—swallowed at birth and later rescued to lead a rebellion against his father—Zeus divides the cosmos with his brothers Poseidon and Hades, claiming the skies as his domain where storms brew at his command. In Odysseus\' winding saga, Zeus orchestrates the cosmic balance, tempering vengeful whims with impartial justice, his voice the ultimate arbiter that propels the hero toward home amid a sea of trials.',
      'He summons assemblies of immortals to weigh Odysseus\' plight, commanding Hermes to free him from Calypso\'s grasp and unleashing punishment upon the suitors who defile Ithaca. Yet Zeus grants leeway to Poseidon\'s fury and Helios\'s demands, allowing tempests and shipwrecks to test the wanderer\'s mettle, all while ensuring destiny\'s thread unravels as foretold. His thunderous interventions—from striking down the crew for slaying sacred cattle to guiding Athena\'s protective hand—reveal a ruler whose power is as vast as the heavens, blending mercy with inexorable law.',
      'Zeus\'s essence thunders with the authority of creation and destruction, where divine equilibrium demands both favor and retribution for mortal deeds. In Dice Odyssey, Zeus commands the galactic throne as your omnipotent rival captain, wielding whites for initiative dominance while enforcing balance through calculated sabotage—defy his decree, or witness your quest shattered by his cosmic judgment!',
    ],
    slug: 'zeus',
    thumbnailSrc: '/assets/opponents/zeus-thumb.png',
    bioImageSrc: '/assets/opponents/zeus-bio.png',
  },
  {
    shortName: 'Hermes',
    fullName: 'Hermes',
    phraseDescription: 'Messenger God',
    longDescription:
      'In the swift currents of divine intrigue, Hermes darts forth as the fleet-footed herald of Olympus, his winged sandals carrying whispers of fate across realms with the speed of thought.',
    completeBioParagraphs: [
      'In the swift currents of divine intrigue, Hermes darts forth as the fleet-footed herald of Olympus, his winged sandals carrying whispers of fate across realms with the speed of thought. Son of Zeus and the nymph Maia, born in secret within a mountain cave, he emerges as a trickster god whose guile matches his velocity, stealing Apollo\'s cattle mere hours after birth and charming his way to forgiveness. In Odysseus\' labyrinthine quest, Hermes serves as the vital link between heavenly edicts and mortal struggles, descending with golden wand in hand to deliver salvation amid enchantment and peril.',
      'He bestows the protective herb moly upon Odysseus, shielding him from Circe\'s transformative spells and turning her sorcery to the hero\'s advantage. As Zeus\'s emissary, Hermes compels the lovelorn Calypso to release her captive, equipping the wanderer with knowledge for his raft-borne escape across treacherous seas. His interventions—slippery as quicksilver—bridge the chasm between gods and men, ensuring messages of mercy pierce through storms of vengeance.',
      'Hermes\'s essence pulses with agile cunning, where mischief and mediation dance in harmony, guiding the lost through shadows with divine dexterity. In Dice Odyssey, Herme zips across the stars as your elusive rival captain, harnessing whites for lightning-fast initiatives while slipping reds through defenses like a cosmic courier—intercept his dispatches, or find your galactic path rerouted by his sly maneuvers!',
    ],
    slug: 'hermes',
    thumbnailSrc: '/assets/opponents/hermes-thumb.png',
    bioImageSrc: '/assets/opponents/hermes-bio.png',
  },
  {
    shortName: 'Circe',
    fullName: 'Circe',
    phraseDescription: 'Enchanting sorceress',
    longDescription:
      'Circe, a goddess-witch, transforms Odysseus\' men into pigs on her island Aeaea. Odysseus resists with Hermes\' herb and spends a year with her, gaining advice for his journey. She represents seductive dangers that test resolve.',
    slug: 'circe',
    thumbnailSrc: '/assets/opponents/circe-thumb.png',
    bioImageSrc: '/assets/opponents/circe-bio.png',
  },
  {
    shortName: 'Calyp',
    fullName: 'Calypso',
    phraseDescription: 'Isolating nymph',
    longDescription:
      'Calypso detains Odysseus on Ogygia for seven years, offering immortality in love. Zeus forces her release, and she aids his raft-building departure. Her story explores unrequited divine affection and mortal longing for home.',
    slug: 'calyp',
    thumbnailSrc: '/assets/opponents/calyp-thumb.png',
    bioImageSrc: '/assets/opponents/calyp-bio.png',
  },
  {
    shortName: 'Poly',
    fullName: 'Polyphemus',
    phraseDescription: 'Giant cyclops',
    longDescription:
      'Polyphemus, a one-eyed giant shepherd, traps and eats Odysseus\' crew in his cave. Odysseus blinds him to escape, invoking Poseidon\'s curse. This encounter epitomizes brute vs. brains in survival.',
    slug: 'poly',
    thumbnailSrc: '/assets/opponents/poly-thumb.png',
    bioImageSrc: '/assets/opponents/poly-bio.png',
  },
  {
    shortName: 'Aeol',
    fullName: 'Aeolus',
    phraseDescription: 'Wind keeper',
    longDescription:
      'Aeolus, master of winds, gifts Odysseus a bag containing storms to aid his voyage. Crew curiosity unleashes them near home, prolonging the journey. He embodies helpful but fickle divine aid.',
    slug: 'aeol',
    thumbnailSrc: '/assets/opponents/aeol-thumb.png',
    bioImageSrc: '/assets/opponents/aeol-bio.png',
  },
  {
    shortName: 'Helio',
    fullName: 'Helios',
    phraseDescription: 'Sun god',
    longDescription:
      'Helios, whose sacred cattle Odysseus\' starving crew slaughters, demands Zeus\'s punishment. This leads to a shipwreck, killing all but Odysseus. His wrath underscores respect for divine property.',
    slug: 'helio',
    thumbnailSrc: '/assets/opponents/helio-thumb.png',
    bioImageSrc: '/assets/opponents/helio-bio.png',
  },
  {
    shortName: 'Scyll',
    fullName: 'Scylla',
    phraseDescription: 'Multi-headed monster',
    longDescription:
      'Scylla, a six-headed sea beast, devours six of Odysseus\' men as they pass her cliff. Inevitable per Circe\'s warning, she symbolizes unavoidable losses. Her terror contrasts Charybdis\' whirlpool.',
    slug: 'scyll',
    thumbnailSrc: '/assets/opponents/scyll-thumb.png',
    bioImageSrc: '/assets/opponents/scyll-bio.png',
  },
  {
    shortName: 'Chary',
    fullName: 'Charybdis',
    phraseDescription: 'Whirlpool monster',
    longDescription:
      'Charybdis, a massive whirlpool, swallows ships whole opposite Scylla. Odysseus navigates her twice, clinging to a fig tree once. She represents chaotic natural forces in the sea.',
    slug: 'chary',
    thumbnailSrc: '/assets/opponents/chary-thumb.png',
    bioImageSrc: '/assets/opponents/chary-bio.png',
  },
  {
    shortName: 'Tires',
    fullName: 'Tiresias',
    phraseDescription: 'Blind prophet',
    longDescription:
      'Tiresias, consulted in the underworld, foretells Odysseus\' trials and homecoming. His shade advises on appeasing Poseidon and avoiding perils. He provides crucial foresight in the epic.',
    slug: 'tires',
    thumbnailSrc: '/assets/opponents/tires-thumb.png',
    bioImageSrc: '/assets/opponents/tires-bio.png',
  },
  {
    shortName: 'Eury',
    fullName: 'Eurylochus',
    phraseDescription: 'Cautious companion',
    longDescription:
      'Eurylochus, Odysseus\' second-in-command, scouts Circe\'s island and urges cattle slaughter on Thrinacia. His doubts often lead to trouble, highlighting crew rebellion. He perishes in the shipwreck.',
    slug: 'eury',
    thumbnailSrc: '/assets/opponents/eury-thumb.png',
    bioImageSrc: '/assets/opponents/eury-bio.png',
  },
]

export const findAICharacterBySlug = (slug: string): AICharacter | undefined =>
  AI_CHARACTERS.find((character) => character.slug === slug)

export const pickRandomUniqueAICharacters = (count: number): AICharacter[] => {
  const shuffled = [...AI_CHARACTERS]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = current
  }

  return shuffled.slice(0, Math.max(0, Math.min(count, shuffled.length)))
}
