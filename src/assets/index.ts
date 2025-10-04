// Asset imports organized by category

// Backgrounds
import roomBg from './backgrounds/room.png';
import neonBg from './backgrounds/neon.png';
import beachBg from './backgrounds/beach.png';
import officeBg from './backgrounds/office.png';
import fireBg from './backgrounds/fire.png';
import memeBg from './backgrounds/meme.png';

// Bodies (general use/props)
import lasersBody from './bodies/lasers.png';
import gamerBody from './bodies/gamer.png';
import otakuBody from './bodies/otaku.png';
import threeDBody from './bodies/3d.png';
import classicBody from './bodies/classic.png';
import cartoonBody from './bodies/cartoon.png';

// Props
import glasses from './props/glasses.png';
import chain from './props/chain.png';
import flag from './props/flag.png';
import confetti from './props/confetti.png';
import crown from './props/crown.png';
import headphones from './props/headphones.png';
import diamondHands from './props/diamond-hands.png';
import rocket from './props/rocket.png';
import controller from './props/controller.png';
import coin from './props/coin.png';

// Heads (general use/props)
import popcatFace from './heads/popcat-face.png';
import megaPopcatFace from './heads/megapopcat-face.png';
import laserFace from './heads/laser-face.png';

// Template-specific assets
// POP vs Closed
import popVsClosedClosedBody from './templates/pop_vs_closed/closed-body.png';
import popVsClosedPopBody from './templates/pop_vs_closed/pop-body.png';
import popVsClosedClosedHead from './templates/pop_vs_closed/closed-head.png';
import popVsClosedPopHead from './templates/pop_vs_closed/pop-head.png';

// Yes POP
import yesPopBody from './templates/yes_pop/pop-body.png';
import yesPopHead from './templates/yes_pop/pop-head.png';

// Click Wars
import clickWarsBody from './templates/click_wars/pop-body.png';
import clickWarsHead from './templates/click_wars/pop-head.png';

// Pro Gamer
import proGamerBody from './templates/pro_gamer/pop-body.png';
import proGamerHead from './templates/pro_gamer/pop-head.png';

// Evolution
import evolutionNoobBody from './templates/evolution/noob-body.png';
import evolutionProBody from './templates/evolution/pro-body.png';
import evolutionProHead from './templates/evolution/pro-head.png';

// World Record
import worldRecordBody from './templates/world_record/pop-body.png';
import worldRecordHead from './templates/world_record/pop-head.png';
import worldRecordTrophy from './templates/world_record/trophy.png';

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
    threeD: threeDBody,
    classic: classicBody,
    cartoon: cartoonBody,
  },
  props: {
    glasses: glasses,
    chain: chain,
    flag: flag,
    confetti: confetti,
    crown: crown,
    headphones: headphones,
    diamondHands: diamondHands,
    rocket: rocket,
    controller: controller,
    coin: coin,
  },
  heads: {
    popcat: popcatFace,
    megapopcat: megaPopcatFace,
    laser: laserFace,
  },
  templates: {
    pop_vs_closed: {
      closedBody: popVsClosedClosedBody,
      popBody: popVsClosedPopBody,
      closedHead: popVsClosedClosedHead,
      popHead: popVsClosedPopHead,
    },
    yes_pop: {
      popBody: yesPopBody,
      popHead: yesPopHead,
    },
    click_wars: {
      popBody: clickWarsBody,
      popHead: clickWarsHead,
    },
    pro_gamer: {
      popBody: proGamerBody,
      popHead: proGamerHead,
    },
    evolution: {
      noobBody: evolutionNoobBody,
      proBody: evolutionProBody,
      proHead: evolutionProHead,
    },
    world_record: {
      popBody: worldRecordBody,
      popHead: worldRecordHead,
      trophy: worldRecordTrophy,
    },
  },
};

export default assets;