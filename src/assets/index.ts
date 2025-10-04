// Asset imports organized by category

// Backgrounds
import roomBg from './backgrounds/room.jpg';
import neonBg from './backgrounds/neon.jpg';
import beachBg from './backgrounds/beach.jpg';
import officeBg from './backgrounds/office.jpg';
import fireBg from './backgrounds/fire.jpg';
import memeBg from './backgrounds/meme.jpg';

// Bodies (general use/props)
import lasersBody from './bodies/lasers.png';
import gamerBody from './bodies/gamer.png';
import otakuBody from './bodies/otaku.png';
import reflectiveBody from './bodies/reflective.png';
import classicBody from './bodies/classic.png';
import cartoonBody from './bodies/cartoon.png';

// Props
import glasses from './props/glasses.png';
import whey from './props/whey.png';
import chain from './props/chain.png';
import flag from './props/flag.png';
import confetti from './props/confetti.png';
import trophy from './props/trophy.png';

// Heads (general use/props)
import popcatFace from './heads/popcat-face.png';
import megaPopcatFace from './heads/megapopcat-face.png';
import laserFace from './heads/laser-face.png';

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
    room: roomBg,
    neon: neonBg,
    beach: beachBg,
    office: officeBg,
    fire: fireBg,
    meme: memeBg,
  },
  bodies: {
    lasers: lasersBody,
    gamer: gamerBody,
    otaku: otakuBody,
    reflective: reflectiveBody,
    classic: classicBody,
    cartoon: cartoonBody,
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
    laser: laserFace,
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