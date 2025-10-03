// Asset imports organized by category

// Backgrounds
import gymBg from './backgrounds/gym.jpg';
import neonBg from './backgrounds/neon.jpg';
import beachBg from './backgrounds/beach.jpg';
import officeBg from './backgrounds/office.jpg';
import arenaBg from './backgrounds/arena.jpg';
import neutralBg from './backgrounds/neutral.jpg';

// Bodies (general use/props)
import flexBody from './bodies/flex.png';
import pcBody from './bodies/pc.png';
import seatedBody from './bodies/seated.png';
import reflectiveBody from './bodies/reflective.png';
import classicBody from './bodies/classic.png';
import warriorBody from './bodies/warrior.png';

// Props
import glasses from './props/glasses.png';
import whey from './props/whey.png';
import chain from './props/chain.png';
import flag from './props/flag.png';
import confetti from './props/confetti.png';
import trophy from './props/trophy.png';

// Heads (general use/props)
import popcatFace from './heads/chad-face.png';
import megaPopcatFace from './heads/gigachad-face.png';
import thinkingFace from './heads/thinking-face.png';

// Template-specific assets
// POPCAT vs Normie
import popcatVsNormieNormieBody from './templates/virgin_vs_chad/virgin-body.png';
import popcatVsNormiePopcatBody from './templates/virgin_vs_chad/chad-body.png';
import popcatVsNormieNormieHead from './templates/virgin_vs_chad/virgin-head.png';
import popcatVsNormiePopcatHead from './templates/virgin_vs_chad/chad-head.png';

// Yes POPCAT
import yesPopcatBody from './templates/yes_chad/chad-body.png';
import yesPopcatHead from './templates/yes_chad/chad-head.png';

// POPCAT Classic
import popcatClassicBody from './templates/chad_classic/chad-body.png';
import popcatClassicHead from './templates/chad_classic/chad-head.png';

// POPCAT Gamer
import popcatGamerBody from './templates/chad_pc/chad-body.png';
import popcatGamerHead from './templates/chad_pc/chad-head.png';

// Before After
import beforeAfterBeforeBody from './templates/before_after/before-body.png';
import beforeAfterAfterBody from './templates/before_after/after-body.png';
import beforeAfterAfterHead from './templates/before_after/after-head.png';

// Warrior Mode
import warriorModeBody from './templates/warrior_mode/warrior-body.png';
import warriorModeHead from './templates/warrior_mode/warrior-head.png';
import warriorModeTrophy from './templates/warrior_mode/trophy.png';

export const assets = {
  backgrounds: {
    gym: gymBg,
    neon: neonBg,
    beach: beachBg,
    office: officeBg,
    arena: arenaBg,
    neutral: neutralBg,
  },
  bodies: {
    flex: flexBody,
    pc: pcBody,
    seated: seatedBody,
    reflective: reflectiveBody,
    classic: classicBody,
    warrior: warriorBody,
  },
  props: {
    glasses: glasses,
    whey: whey,
    chain: chain,
    flag: flag,
    confetti: confetti,
    trophy: trophy,
  },
  heads: {
    popcat: popcatFace,
    megapopcat: megaPopcatFace,
    thinking: thinkingFace,
  },
  templates: {
    popcat_vs_normie: {
      normieBody: popcatVsNormieNormieBody,
      popcatBody: popcatVsNormiePopcatBody,
      normieHead: popcatVsNormieNormieHead,
      popcatHead: popcatVsNormiePopcatHead,
    },
    yes_popcat: {
      popcatBody: yesPopcatBody,
      popcatHead: yesPopcatHead,
    },
    popcat_classic: {
      popcatBody: popcatClassicBody,
      popcatHead: popcatClassicHead,
    },
    popcat_gamer: {
      popcatBody: popcatGamerBody,
      popcatHead: popcatGamerHead,
    },
    before_after: {
      beforeBody: beforeAfterBeforeBody,
      afterBody: beforeAfterAfterBody,
      afterHead: beforeAfterAfterHead,
    },
    warrior_mode: {
      warriorBody: warriorModeBody,
      warriorHead: warriorModeHead,
      trophy: warriorModeTrophy,
    },
  },
};

export default assets;