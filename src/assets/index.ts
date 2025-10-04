// Asset imports organized by category

// Backgrounds
import roomBg from './backgrounds/room.png';
import neonBg from './backgrounds/neon.png';
import beachBg from './backgrounds/beach.png';
import officeBg from './backgrounds/office.png';
import fireBg from './backgrounds/fire.png';
import schoolBg from './backgrounds/school.png';

// Bodies (general use/props)
import lasersBody from './bodies/lasers.png';
import gamerBody from './bodies/gamer.png';
import otakuBody from './bodies/otaku.png';
import threeDBody from './bodies/3d.png';
import classicBody from './bodies/classic.png';
import cartoonBody from './bodies/cartoon.png';

// Props
import pixelShades from './props/pixel-shades.png';
import greenSweater from './props/green-sweater.png';
import whiteHoodie from './props/white-hoodie.png';
import leatherJacket from './props/leather-jacket.png';
import lafdUniform from './props/lafd-uniform.png';
import greenCandles from './props/green-candles.png';
import rocketCandles from './props/rocket-candles.png';
import pixelPopcat from './props/pixel-popcat.png';
import popcatCoin from './props/popcat-coin.png';
import billionsCap from './props/billions-cap.png';

// Heads (general use/props)
import popcatFace from './heads/popcat-face.png';
import megaPopcatFace from './heads/megapopcat-face.png';
import laserFace from './heads/laser-face.png';

// Template-specific assets
// Click Wars
import clickWarsBoom from './templates/click_wars/boom.png';
import clickWarsClicks from './templates/click_wars/clicks.png';

// Evolution
import evolutionTeacher from './templates/evolution/teacher.png';
import evolutionVomit from './templates/evolution/vomit.png';

// POP vs Closed
import popVsClosedCuteClosed from './templates/pop_vs_closed/cute-closed.png';
import popVsClosedCuteOpen from './templates/pop_vs_closed/cute-open.png';
import popVsClosedDrawnClosed from './templates/pop_vs_closed/drawn-closed.png';
import popVsClosedDrawnOpen from './templates/pop_vs_closed/drawn-open.png';

// Karaoke
import karaokeSinging from './templates/karaoke/singing.png';

// Domination
import dominationWave from './templates/domination/wave.png';
import dominationSqueeze from './templates/domination/squeeze.png';
import dominationClock from './templates/domination/clock.png';

// Yes POP
import yesPopTribune from './templates/yes_pop/tribune.png';

export const assets = {
  backgrounds: {
    room: roomBg,
    neon: neonBg,
    beach: beachBg,
    office: officeBg,
    fire: fireBg,
    school: schoolBg,
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
    pixelShades: pixelShades,
    greenSweater: greenSweater,
    whiteHoodie: whiteHoodie,
    leatherJacket: leatherJacket,
    lafdUniform: lafdUniform,
    greenCandles: greenCandles,
    rocketCandles: rocketCandles,
    pixelPopcat: pixelPopcat,
    popcatCoin: popcatCoin,
    billionsCap: billionsCap,
  },
  heads: {
    popcat: popcatFace,
    megapopcat: megaPopcatFace,
    laser: laserFace,
  },
  templates: {
    click_wars: {
      boom: clickWarsBoom,
      clicks: clickWarsClicks,
    },
    evolution: {
      teacher: evolutionTeacher,
      vomit: evolutionVomit,
    },
    pop_vs_closed: {
      cuteClosed: popVsClosedCuteClosed,
      cuteOpen: popVsClosedCuteOpen,
      drawnClosed: popVsClosedDrawnClosed,
      drawnOpen: popVsClosedDrawnOpen,
    },
    karaoke: {
      singing: karaokeSinging,
    },
    domination: {
      wave: dominationWave,
      squeeze: dominationSqueeze,
      clock: dominationClock,
    },
    yes_pop: {
      tribune: yesPopTribune,
    },
  },
};

export default assets;